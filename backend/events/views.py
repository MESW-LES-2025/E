from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Event
from .serializers import EventSerializer


class EventListCreateView(generics.ListCreateAPIView):
    serializer_class = EventSerializer

    def get_queryset(self):
        """Only return events that have an organization"""
        return Event.objects.filter(organization__isnull=False).select_related(
            "organization", "organizer"
        )

    def create(self, request, *args, **kwargs):
        """Ensure organization is required and user owns it"""
        from accounts.models import Organization

        organization_id = request.data.get("organization")
        if not organization_id:
            return Response(
                {"organization": ["This field is required."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify the user owns the organization
        try:
            organization = Organization.objects.get(id=organization_id)
        except (Organization.DoesNotExist, ValueError, TypeError):
            return Response(
                {"organization": ["Organization not found."]},
                status=status.HTTP_404_NOT_FOUND,
            )

        if organization.owner != request.user:
            return Response(
                {
                    "organization": [
                        (
                            "You do not have permission to create events "
                            "for this organization."
                        )
                    ]
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(organizer=request.user, organization=organization)

        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )


class EventRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = EventSerializer

    def get_queryset(self):
        """Only return events that have an organization"""
        return Event.objects.filter(organization__isnull=False).select_related(
            "organization", "organizer"
        )

    def update(self, request, *args, **kwargs):
        """Ensure organization cannot be removed or changed to None"""
        partial = kwargs.pop("partial", False)
        instance = self.get_object()

        # Ensure organization is not being removed before validation
        organization_id = request.data.get("organization")
        if organization_id is not None and not organization_id:
            return Response(
                {"organization": ["Organization cannot be removed from an event."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)


class UpcomingEventsListView(generics.ListAPIView):
    serializer_class = EventSerializer

    def get_queryset(self):
        now = timezone.now()
        return (
            Event.objects.filter(
                date__gte=now, status="Active", organization__isnull=False
            )
            .select_related("organization", "organizer")
            .order_by("date")
        )


class PastEventsListView(generics.ListAPIView):
    serializer_class = EventSerializer

    def get_queryset(self):
        now = timezone.now()
        return (
            Event.objects.filter(
                date__lt=now, status="Active", organization__isnull=False
            )
            .select_related("organization", "organizer")
            .order_by("-date")
        )


class CreateEventView(generics.CreateAPIView):
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        from accounts.models import Organization

        # Get organization from request data before validation
        organization_id = request.data.get("organization")
        if not organization_id:
            return Response(
                {"organization": ["This field is required."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify the user owns the organization
        try:
            organization = Organization.objects.get(id=organization_id)
        except (Organization.DoesNotExist, ValueError, TypeError):
            return Response(
                {"organization": ["Organization not found."]},
                status=status.HTTP_404_NOT_FOUND,
            )

        if organization.owner != request.user:
            return Response(
                {
                    "organization": [
                        "You can only create events for organizations you own."
                    ]
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Now validate the serializer
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        serializer.save(organizer=self.request.user, organization=organization)
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )


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
