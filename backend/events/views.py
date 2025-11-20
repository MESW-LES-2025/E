from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Event
from .serializers import EventSerializer


class EventListCreateView(generics.ListCreateAPIView):
    queryset = Event.objects.all()
    serializer_class = EventSerializer


class EventRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Event.objects.all()
    serializer_class = EventSerializer


class UpcomingEventsListView(generics.ListAPIView):
    serializer_class = EventSerializer

    def get_queryset(self):
        now = timezone.now()
        return Event.objects.filter(date__gte=now).order_by("date")


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
