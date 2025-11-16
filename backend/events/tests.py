from django.contrib.auth import get_user_model
from django.test import TestCase

from .models import Event

# Create your tests here.

User = get_user_model()


class EventModelTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.superuser = User.objects.create_superuser(
            "default_admin", "admin@example.com", "password"
        )
        cls.user = User.objects.create_user(username="testuser", password="password123")

    def test_event_creation(self):
        event = Event.objects.create(
            name="Test Event", date="2024-01-01T10:00:00Z", organizer=self.user
        )
        self.assertEqual(event.name, "Test Event")
        self.assertEqual(str(event), "Test Event")
        self.assertEqual(event.organizer, self.user)
        self.assertEqual(event.status, "Active")

    def test_event_creation_without_organizer(self):
        event = Event.objects.create(
            name="Event without organizer", date="2024-01-01T10:00:00Z"
        )
        self.assertEqual(event.name, "Event without organizer")
        self.assertIsNone(event.organizer)
