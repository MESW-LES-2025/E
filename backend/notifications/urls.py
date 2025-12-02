from django.urls import path

from .views import (
    MarkAllAsReadView,
    MarkAsReadView,
    MarkAsUnreadView,
    NotificationDetailView,
    NotificationListView,
    UnreadCountView,
)

urlpatterns = [
    path("", NotificationListView.as_view(), name="notification-list"),
    path("<int:pk>/", NotificationDetailView.as_view(), name="notification-detail"),
    path(
        "<int:pk>/mark-as-read/",
        MarkAsReadView.as_view(),
        name="notification-mark-read",
    ),
    path(
        "<int:pk>/mark-as-unread/",
        MarkAsUnreadView.as_view(),
        name="notification-mark-unread",
    ),
    path(
        "mark-all-as-read/",
        MarkAllAsReadView.as_view(),
        name="notification-mark-all-read",
    ),
    path(
        "unread-count/",
        UnreadCountView.as_view(),
        name="notification-unread-count",
    ),
]
