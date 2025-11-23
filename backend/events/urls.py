from django.urls import path

from .views import (
    CancelEventView,
    CreateEventView,
    EventListCreateView,
    EventRetrieveUpdateDestroyView,
    MyOrganizedEventsView,
    ParticipateEventView,
    PastEventsListView,
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
    path("events/past/", PastEventsListView.as_view(), name="past-events"),
    path("events/create/", CreateEventView.as_view(), name="create_event"),
    path("events/<int:pk>/cancel/", CancelEventView.as_view(), name="event-cancel"),
    path(
        "events/<int:pk>/uncancel/", UncancelEventView.as_view(), name="event-uncancel"
    ),
    path(
        "events/<int:pk>/participate/",
        ParticipateEventView.as_view(),
        name="event-participate",
    ),
    path(
        "events/my-organized/",
        MyOrganizedEventsView.as_view(),
        name="my-organized-events",
    ),
]
