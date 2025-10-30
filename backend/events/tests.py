from django.test import TestCase

from .models import Event

# Create your tests here.


class EventModelTest(TestCase):
    def test_event_creation(self):
        event = Event.objects.create(name="Test Event", date="2024-01-01T10:00:00Z")
        self.assertEqual(event.name, "Test Event")
        self.assertEqual(str(event), "Test Event")
