from django.urls import path

from .views import (
    EventListCreateView,
    EventRetrieveUpdateDestroyView,
    UpcomingEventsListView,
    CreateEventView,
)

urlpatterns = [
    path("events/", EventListCreateView.as_view(), name="event-list"),
    path(
        "events/<int:pk>/",
        EventRetrieveUpdateDestroyView.as_view(),
        name="event-detail",
    ),
    path("events/upcoming/", UpcomingEventsListView.as_view(), name="upcoming-events"),
    path('events/create/', CreateEventView.as_view(), name='create_event'),
]
