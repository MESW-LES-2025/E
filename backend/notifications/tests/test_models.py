from django.contrib.auth import get_user_model
from django.test import TestCase

from ..models import Notification

User = get_user_model()


class NotificationModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser", password="testpassword"
        )

    def test_notification_creation(self):
        notification = Notification.objects.create(
            user=self.user, title="Test Title", message="Test message."
        )
        self.assertEqual(notification.user, self.user)
        self.assertEqual(notification.title, "Test Title")
        self.assertEqual(notification.message, "Test message.")
        self.assertFalse(notification.is_read)
        self.assertIsNotNone(notification.created_at)

    def test_notification_str(self):
        notification = Notification.objects.create(user=self.user, title="Another Test")
        self.assertEqual(str(notification), "testuser - Another Test")

    def test_notification_ordering(self):
        n1 = Notification.objects.create(user=self.user, title="First")
        n2 = Notification.objects.create(user=self.user, title="Second")
        self.assertEqual(list(Notification.objects.all()), [n2, n1])
