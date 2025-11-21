from django.urls import path

from .views import (
    AllEventsListView,
    CreateEventView,
    EventRetrieveUpdateDestroyView,
    ParticipateEventView,
    UpcomingEventsListView,
    UserInterestedEventsView,
    UserOrganizedEventsView,
    UserRegisteredEventsView,
)

urlpatterns = [
    path("events/", AllEventsListView.as_view(), name="all-events"),
    path(
        "events/<int:pk>/",
        EventRetrieveUpdateDestroyView.as_view(),
        name="event-detail",
    ),
    path("events/upcoming/", UpcomingEventsListView.as_view(), name="upcoming-events"),
    path("events/create/", CreateEventView.as_view(), name="create_event"),
    path(
        "events/participating/",
        UserRegisteredEventsView.as_view(),
        name="user-registered-events",
    ),
    path(
        "events/interested/",
        UserInterestedEventsView.as_view(),
        name="user-interested-events",
    ),
    path(
        "events/organized/",
        UserOrganizedEventsView.as_view(),
        name="user-organized-events",
    ),
    path(
        "events/<int:pk>/participate/",
        ParticipateEventView.as_view(),
        name="event-participate",
    ),
]
