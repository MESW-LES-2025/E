from django.urls import path

from .views import (
    AllEventsListView,
    CancelEventView,
    CreateEventView,
    EventInterestedUsersView,
    EventParticipantsView,
    EventRetrieveUpdateDestroyView,
    InterestEventView,
    MyOrganizedEventsView,
    ParticipateEventView,
    PastEventsListView,
    UncancelEventView,
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
    path("events/past/", PastEventsListView.as_view(), name="past-events"),
    path("events/create/", CreateEventView.as_view(), name="create_event"),
    path("events/<int:pk>/cancel/", CancelEventView.as_view(), name="event-cancel"),
    path(
        "events/<int:pk>/uncancel/", UncancelEventView.as_view(), name="event-uncancel"
    ),
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
    path(
        "events/<int:pk>/interested/",
        InterestEventView.as_view(),
        name="event-interested",
    ),
    path(
        "events/my-organized/",
        MyOrganizedEventsView.as_view(),
        name="my-organized-events",
    ),
    path(
        "events/<int:pk>/participants/",
        EventParticipantsView.as_view(),
        name="event-participants",
    ),
    path(
        "events/<int:pk>/interested-users/",
        EventInterestedUsersView.as_view(),
        name="event-interested-users",
    ),
]
