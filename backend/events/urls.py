from django.urls import path

from .views import (
    CreateEventView,
    UpcomingEventsListView,
    UserInterestedEventsView,
    UserOrganizedEventsView,
    UserRegisteredEventsView,
)

urlpatterns = [
    path("events/upcoming/", UpcomingEventsListView.as_view(), name="upcoming-events"),
    path("events/create/", CreateEventView.as_view(), name="create_event"),
    path(
        "events/registered/",
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
]
