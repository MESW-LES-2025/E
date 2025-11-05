from django.utils import timezone  # type: ignore
from rest_framework import generics
from rest_framework.response import Response
from rest_framework import status

import logging

from .models import Event
from .serializers import EventSerializer

logger = logging.getLogger(__name__)

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

    def create(self, request, *args, **kwargs):
        logger.info(f"CreateEventView called with data: {request.data}")
        serializer = self.get_serializer(data=request.data)
        
        if serializer.is_valid():
            self.perform_create(serializer)
            logger.info(f"Event created successfully: {serializer.data}")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        logger.error(f"Event creation failed with errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
