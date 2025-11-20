from django.urls import path

from .views import (
    CancelEventView,
    CreateEventView,
    EventListCreateView,
    EventRetrieveUpdateDestroyView,
    UncancelEventView,
    UpcomingEventsListView,
)

urlpatterns = [
    path("events/", EventListCreateView.as_view(), name="event-list"),
    path(
        "events/<int:pk>/",
        EventRetrieveUpdateDestroyView.as_view(),
        name="event-detail",
    ),
    path("events/upcoming/", UpcomingEventsListView.as_view(), name="upcoming-events"),
    path("events/create/", CreateEventView.as_view(), name="create_event"),
    path("events/<int:pk>/cancel/", CancelEventView.as_view(), name="event-cancel"),
    path(
        "events/<int:pk>/uncancel/", UncancelEventView.as_view(), name="event-uncancel"
    ),
]
