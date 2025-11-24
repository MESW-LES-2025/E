from datetime import timedelta

from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Event
from .serializers import EventSerializer


class AllEventsListView(generics.ListAPIView):
    serializer_class = EventSerializer

    def get_queryset(self):
        return Event.objects.all()


class EventRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Event.objects.all()
    serializer_class = EventSerializer


class UpcomingEventsListView(generics.ListAPIView):
    serializer_class = EventSerializer

    def get_queryset(self):
        now = timezone.now()
        queryset = Event.objects.filter(date__gte=now).order_by("date")

        categories = self.request.query_params.getlist("category", [])
        if categories:
            queryset = queryset.filter(category__in=categories)

        date_filter = self.request.query_params.get("date_filter", None)
        if date_filter == "today":
            start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end_of_day = now.replace(hour=23, minute=59, second=59, microsecond=999999)
            queryset = queryset.filter(date__gte=start_of_day, date__lte=end_of_day)
        elif date_filter == "tomorrow":
            tomorrow_start = (now + timedelta(days=1)).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            tomorrow_end = tomorrow_start.replace(
                hour=23, minute=59, second=59, microsecond=999999
            )
            queryset = queryset.filter(date__gte=tomorrow_start, date__lte=tomorrow_end)
        elif date_filter == "this_week":
            start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
            days_until_sunday = (6 - now.weekday()) % 7
            end_of_week = (now + timedelta(days=days_until_sunday)).replace(
                hour=23, minute=59, second=59, microsecond=999999
            )
            queryset = queryset.filter(date__gte=start_of_day, date__lte=end_of_week)

        date_from = self.request.query_params.get("date_from", None)
        date_to = self.request.query_params.get("date_to", None)
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=f"{date_to} 23:59:59")

        search = self.request.query_params.get("search", None)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(description__icontains=search)
                | Q(category__icontains=search)
            )

        return queryset


class CreateEventView(generics.CreateAPIView):
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(organizer=self.request.user)
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )


class UserRegisteredEventsView(generics.ListAPIView):
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.request.user.participating_events.all()


class UserInterestedEventsView(generics.ListAPIView):
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.request.user.interested_events.all()


class UserOrganizedEventsView(generics.ListAPIView):
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Event.objects.filter(organizer=self.request.user)


class CancelEventView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        try:
            event = Event.objects.get(pk=pk)
        except Event.DoesNotExist:
            raise NotFound("Event not found")

        if event.organizer != request.user:  # Only the organizer can cancel
            raise PermissionDenied("Only the event organizer can cancel this event.")

        event.status = "Canceled"
        event.save()

        serializer = EventSerializer(event)
        return Response(serializer.data, status=status.HTTP_200_OK)


class UncancelEventView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        try:
            event = Event.objects.get(pk=pk)
        except Event.DoesNotExist:
            raise NotFound("Event not found")

        if event.organizer != request.user:
            raise PermissionDenied("Only the organizer can uncancel this event.")

        if event.status != "Canceled":
            return Response({"error": "Event is not canceled."}, status=400)

        event.status = "Active"
        event.save()

        serializer = EventSerializer(event)
        return Response(serializer.data, status=200)


class ParticipateEventView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        event = get_object_or_404(Event, pk=pk)
        user = request.user

        if event.participants.filter(pk=user.pk).exists():
            is_full = (
                event.capacity is not None
                and event.capacity > 0
                and event.participants.count() >= event.capacity
            )
            return Response(
                {
                    "detail": "Already registered.",
                    "participant_count": event.participants.count(),
                    "is_participating": True,
                    "is_full": is_full,
                },
                status=status.HTTP_200_OK,
            )

        # Check if event is full (only if capacity is set and > 0)
        if (
            event.capacity is not None
            and event.capacity > 0
            and event.participants.count() >= event.capacity
        ):
            return Response(
                {
                    "detail": "Event is full.",
                    "participant_count": event.participants.count(),
                    "is_participating": False,
                    "is_full": True,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        event.participants.add(user)
        is_full = (
            event.capacity is not None
            and event.capacity > 0
            and event.participants.count() >= event.capacity
        )
        return Response(
            {
                "detail": "Participation registered.",
                "participant_count": event.participants.count(),
                "is_participating": True,
                "is_full": is_full,
            },
            status=status.HTTP_201_CREATED,
        )

    def delete(self, request, pk):
        event = get_object_or_404(Event, pk=pk)
        user = request.user
        if not event.participants.filter(pk=user.pk).exists():
            is_full = (
                event.capacity is not None
                and event.capacity > 0
                and event.participants.count() >= event.capacity
            )
            return Response(
                {
                    "detail": "You are not registered for this event.",
                    "participant_count": event.participants.count(),
                    "is_participating": False,
                    "is_full": is_full,
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        event.participants.remove(user)
        is_full = (
            event.capacity is not None
            and event.capacity > 0
            and event.participants.count() >= event.capacity
        )
        return Response(
            {
                "detail": "Participation removed.",
                "participant_count": event.participants.count(),
                "is_participating": False,
                "is_full": is_full,
            },
            status=status.HTTP_200_OK,
        )
