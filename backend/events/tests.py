from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from .models import Event
from .serializers import EventSerializer

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

    # Remove test after implement that only organizers can create events
    def test_event_default_organizer(self):
        """Test that default organizer is set to superuser"""
        event = Event.objects.create(
            name="Event Without Organizer", date=timezone.now() + timedelta(days=1)
        )
        self.assertEqual(event.organizer, self.superuser)

    def test_event_status_choices(self):
        """Test event status choices"""
        # Test Cancelled
        event_cancelled = Event.objects.create(
            name="Cancelled Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            status="Cancelled",
        )
        self.assertEqual(event_cancelled.status, "Cancelled")

        # Test active
        event_active = Event.objects.create(
            name="Active Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            status="Active",
        )
        self.assertEqual(event_active.status, "Active")

    def test_event_capacity_zero_converts_to_none(self):
        """Test that capacity of 0 is converted to None (Unlimited)"""
        event = Event.objects.create(
            name="Unlimited Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            capacity=0,
        )
        self.assertIsNone(event.capacity)

    def test_event_with_capacity(self):
        """Test event with capacity limit"""
        event = Event.objects.create(
            name="Limited Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            capacity=10,
        )
        self.assertEqual(event.capacity, 10)

    def test_event_participants_relationship(self):
        """Test many-to-many relationship with participants"""
        event = Event.objects.create(
            name="Participant Test",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
        )
        user1 = User.objects.create_user(
            username="participant1",
            email="participant1@example.com",
            password="password123",
        )
        user2 = User.objects.create_user(
            username="participant2",
            email="participant2@example.com",
            password="password123",
        )

        event.participants.add(user1, user2)
        self.assertEqual(event.participants.count(), 2)
        self.assertIn(user1, event.participants.all())
        self.assertIn(user2, event.participants.all())

    def test_event_optional_fields(self):
        """Test that optional fields can be blank"""
        event = Event.objects.create(
            name="Minimal Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
        )
        self.assertIsNone(event.location)
        self.assertIsNone(event.description)
        self.assertIsNone(event.capacity)


class EventSerializerTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser", password="password123"
        )
        self.event = Event.objects.create(
            name="TestEvent",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            capacity=5,
        )

    def test_serializer_contains_expected_fields(self):
        """Test serializer includes all expected fields"""
        serializer = EventSerializer(instance=self.event)
        data = serializer.data

        expected_fields = [
            "id",
            "name",
            "date",
            "location",
            "description",
            "capacity",
            "organizer",
            "organizer_name",
            "status",
            "participant_count",
            "is_participating",
            "is_full",
        ]
        self.assertEqual(set(data.keys()), set(expected_fields))

    def test_organizer_name_field(self):
        """Test organizer_name shows username"""
        serializer = EventSerializer(instance=self.event)
        self.assertEqual(serializer.data["organizer_name"], "testuser")

    def test_participant_count_zero(self):
        """Test participant count when no participants"""
        serializer = EventSerializer(instance=self.event)
        self.assertEqual(serializer.data["participant_count"], 0)

    def test_participant_count_with_participants(self):
        """Test participant count with multiple participants"""
        user1 = User.objects.create_user(
            username="participant1",
            email="participant1@example.com",
            password="password123",
        )
        user2 = User.objects.create_user(
            username="participant2",
            email="participant2@example.com",
            password="password123",
        )
        self.event.participants.add(user1, user2)

        serializer = EventSerializer(instance=self.event)
        self.assertEqual(serializer.data["participant_count"], 2)

    def test_is_full_when_not_full(self):
        """Test is_full returns False when event has space"""
        serializer = EventSerializer(instance=self.event)
        self.assertFalse(serializer.data["is_full"])

    def test_is_full_when_at_capacity(self):
        """Test is_full resturns True when event is at capacity"""
        for i in range(5):
            user = User.objects.create_user(
                username=f"participant{i}",
                email=f"prticipant{i}@gmail.com",
                password="password123",
            )
            self.event.participants.add(user)

        serializer = EventSerializer(instance=self.event)
        self.assertTrue(serializer.data["is_full"])

    def test_is_full_unlimited_capacity(self):
        """Test is_full returns False for unlimited capacity events"""
        self.event.capacity = None
        self.event.save()

        serializer = EventSerializer(instance=self.event)
        self.assertFalse(serializer.data["is_full"])

    def test_capacity_validation_negative(self):
        """Test that negative capacity raises validation error"""
        serializer = EventSerializer(
            data={
                "name": "Test",
                "date": timezone.now() + timedelta(days=1),
                "capacity": -5,
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("capacity", serializer.errors)

    def test_capacity_validation_zero_to_none(self):
        """Test that capacity 0 converts to None"""
        serializer = EventSerializer()
        result = serializer.validate_capacity(0)
        self.assertIsNone(result)


class EventListCreateViewTest(APITestCase):
    def setUp(self):
        Event.objects.all().delete()
        self.client = APIClient()
        self.user = User.objects.create_user(username="testuser", password="pass123")
        self.url = reverse("event-list")

    def test_list_events(self):
        """Test listing all events"""
        Event.objects.create(
            name="Event 1", date=timezone.now() + timedelta(days=1), organizer=self.user
        )
        Event.objects.create(
            name="Event 2", date=timezone.now() + timedelta(days=1), organizer=self.user
        )

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 2)

    def test_list_events_empty(self):
        """Test listing events when none exist"""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 0)


class EventRetrieveUpdateDestroyViewTest(APITestCase):
    def setUp(self):
        Event.objects.all().delete()
        self.client = APIClient()
        self.user = User.objects.create_user(username="testuser", password="pass123")
        self.event = Event.objects.create(
            name="Test Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
        )
        self.url = reverse("event-detail", kwargs={"pk": self.event.pk})

    def test_retrieve_event(self):
        """Test retriving a specific event"""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Test Event")

    def test_retrieve_nonexistent_event(self):
        """Test retrieving non-existent event returns 404"""
        url = reverse("event-detail", kwargs={"pk": 99999})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class UpcomingEventsListViewTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="testuser", password="pass123")
        self.url = reverse("upcoming-events")

    def test_list_upcoming_events(self):
        """Test listing only upcoming events"""
        # Past event
        Event.objects.create(
            name="Past Event",
            date=timezone.now() - timedelta(days=1),
            organizer=self.user,
        )
        # Future events
        Event.objects.create(
            name="Future Event 1",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
        )
        Event.objects.create(
            name="Future Event 2",
            date=timezone.now() + timedelta(days=2),
            organizer=self.user,
        )

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 2)

    def test_upcoming_events_ordered_by_date(self):
        """Test upcoming events are ordered by date"""
        Event.objects.create(
            name="Event 3 Days",
            date=timezone.now() + timedelta(days=3),
            organizer=self.user,
        )
        Event.objects.create(
            name="Event 1 Day",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
        )

        response = self.client.get(self.url)
        self.assertEqual(response.data["results"][0]["name"], "Event 1 Day")
        self.assertEqual(response.data["results"][1]["name"], "Event 3 Days")


class CreateEventViewTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="testuser", password="pass123")
        self.url = reverse("create_event")

    def test_create_event_authenticated(self):
        """Test authenticated user can create event"""
        self.client.force_authenticate(user=self.user)
        data = {
            "name": "New Event",
            "date": (timezone.now() + timedelta(days=1)).isoformat(),
            "location": "Test Location",
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Event.objects.count(), 1)
        self.assertEqual(Event.objects.first().organizer, self.user)

    def test_create_event_unauthenticated(self):
        """Test unauthenticated user cannot create event"""
        data = {
            "name": "New Event",
            "date": (timezone.now() + timedelta(days=1)).isoformat(),
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ParticipateEventViewTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="testuser", password="pass123")
        self.organizer = User.objects.create_user(
            username="organizer", email="organizer@example.com", password="pass123"
        )
        self.event = Event.objects.create(
            name="Test Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.organizer,
            capacity=2,
        )
        self.url = reverse("event-participate", kwargs={"pk": self.event.pk})

    def test_participate_authenticated(self):
        """Test authenticated user can participate"""
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["participant_count"], 1)
        self.assertTrue(response.data["is_participating"])
        self.assertFalse(response.data["is_full"])

    def test_participate_unauthenticated(self):
        """Test unauthenticated user cannot participate"""
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_participate_already_registered(self):
        """Test participating when already registered"""
        self.client.force_authenticate(user=self.user)
        self.event.participants.add(self.user)

        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["detail"], "Already registered.")

    def test_participate_event_full(self):
        """Test participating when event is full"""
        user1 = User.objects.create_user(
            username="user1", email="user1@example.com", password="pass"
        )
        user2 = User.objects.create_user(
            username="user2", email="user2@example.com", password="pass"
        )
        self.event.participants.add(user1, user2)

        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "Event is full.")
        self.assertTrue(response.data["is_full"])

    def test_participate_unlimited_capacity(self):
        """Test participating in event with unlimited capacity"""
        self.event.capacity = None
        self.event.save()

        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(response.data["is_full"])

    def test_remove_participation(self):
        """Test removing participation"""
        self.client.force_authenticate(user=self.user)
        self.event.participants.add(self.user)

        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["detail"], "Participation removed.")
        self.assertFalse(response.data["is_participating"])
        self.assertFalse(self.event.participants.filter(pk=self.user.pk).exists())

    def test_remove_participation_not_registered(self):
        """Test removing participation when not registered"""
        self.client.force_authenticate(user=self.user)

        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data["detail"], "You are not registered for this event."
        )

    def test_participate_nonexistent_event(self):
        """Test participating in non-existent event"""
        self.client.force_authenticate(user=self.user)
        url = reverse("event-participate", kwargs={"pk": 99999})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_event_becomes_full_after_participation(self):
        """Test is_full flag when event becomes full"""
        user1 = User.objects.create_user(
            username="user1", email="user1@example.com", password="pass"
        )
        self.event.participants.add(user1)

        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["is_full"])
        self.assertEqual(response.data["participant_count"], 2)

    def test_event_has_space_after_removal(self):
        """Test is_full flag after participant removes themselves"""
        user1 = User.objects.create_user(
            username="user1", email="user1@example.com", password="pass"
        )
        self.event.participants.add(self.user, user1)

        self.client.force_authenticate(user=self.user)
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["is_full"])
        self.assertEqual(response.data["participant_count"], 1)
