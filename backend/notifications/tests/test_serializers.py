from django.contrib.auth import get_user_model
from django.test import TestCase

from ..models import Notification
from ..serializers import NotificationSerializer

User = get_user_model()


class NotificationSerializerTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser", password="testpassword"
        )
        self.notification = Notification.objects.create(
            user=self.user, title="Test Title", message="Test message."
        )
        self.serializer = NotificationSerializer(instance=self.notification)

    def test_serializer_contains_expected_fields(self):
        data = self.serializer.data
        expected_keys = ["id", "title", "message", "is_read", "created_at"]
        self.assertEqual(set(data.keys()), set(expected_keys))

    def test_serializer_data_content(self):
        data = self.serializer.data
        self.assertEqual(data["title"], self.notification.title)
        self.assertEqual(data["message"], self.notification.message)
        self.assertEqual(data["is_read"], self.notification.is_read)
