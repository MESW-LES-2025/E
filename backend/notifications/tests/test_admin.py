from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.contrib.messages.storage.fallback import FallbackStorage
from django.contrib.sessions.backends.db import SessionStore
from django.test import RequestFactory, TestCase

from ..admin import NotificationAdmin
from ..models import Notification

User = get_user_model()


class NotificationAdminTest(TestCase):
    def setUp(self):
        self.site = AdminSite()
        self.factory = RequestFactory()
        self.admin_user = User.objects.create_superuser(
            "admin", "admin@example.com", "password"
        )
        self.user1 = User.objects.create_user("user1", "user1@example.com", "password")

        # The ModelAdmin instance that we are testing
        self.notification_admin = NotificationAdmin(Notification, self.site)

        # Create notifications to test with
        self.notif_unread = Notification.objects.create(
            user=self.user1, title="Unread", is_read=False
        )
        self.notif_read = Notification.objects.create(
            user=self.user1, title="Read", is_read=True
        )

    def _get_request_with_messages(self):
        """Helper to create a request object with a message storage."""
        request = self.factory.get("/")
        # Manually attach a session, as RequestFactory doesn't run middleware.
        request.session = SessionStore()
        request.session.save()  # Ensure the session is created and has a key

        request.user = self.admin_user
        # Django admin actions use the messages framework
        setattr(request, "_messages", FallbackStorage(request))
        return request

    def test_mark_selected_as_read(self):
        """Test the 'mark_selected_as_read' admin action."""
        request = self._get_request_with_messages()
        queryset = Notification.objects.filter(pk=self.notif_unread.pk)

        self.assertFalse(self.notif_unread.is_read)

        # Execute the admin action
        self.notification_admin.mark_selected_as_read(request, queryset)

        # Check if the notification was updated in the database
        self.notif_unread.refresh_from_db()
        self.assertTrue(self.notif_unread.is_read)

    def test_mark_selected_as_unread(self):
        """Test the 'mark_selected_as_unread' admin action."""
        request = self._get_request_with_messages()
        queryset = Notification.objects.filter(pk=self.notif_read.pk)

        self.assertTrue(self.notif_read.is_read)

        # Execute the admin action
        self.notification_admin.mark_selected_as_unread(request, queryset)

        # Check if the notification was updated in the database
        self.notif_read.refresh_from_db()
        self.assertFalse(self.notif_read.is_read)
