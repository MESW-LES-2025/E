from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import Organization, Profile

from ..models import Event
from ..serializers import EventSerializer

# Create your tests here.

User = get_user_model()


class EventModelTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.superuser = User.objects.create_superuser(
            "default_admin", "admin@example.com", "password"
        )
        cls.user = User.objects.create_user(username="testuser", password="password123")
        cls.user.profile.role = Profile.Role.ORGANIZER
        cls.user.profile.save()

        cls.organization = Organization.objects.create(
            name="Test Organization", owner=cls.user
        )

    def test_event_creation(self):
        event = Event.objects.create(
            name="Test Event",
            date="2024-01-01T10:00:00Z",
            organizer=self.user,
            organization=self.organization,
        )
        self.assertEqual(event.name, "Test Event")
        self.assertEqual(str(event), "Test Event")
        self.assertEqual(event.organizer, self.user)
        self.assertEqual(event.status, "Active")

    def test_event_default_organizer(self):
        """Test that default organizer is set to superuser"""
        org = Organization.objects.create(name="Super Org", owner=self.superuser)
        event = Event.objects.create(
            name="Event Without Organizer",
            date=timezone.now() + timedelta(days=1),
            organization=org,
        )
        self.assertEqual(event.organizer, self.superuser)

    def test_event_status_choices(self):
        """Test event status choices"""
        # Test Cancelled
        event_cancelled = Event.objects.create(
            name="Cancelled Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            organization=self.organization,
            status="Cancelled",
        )
        self.assertEqual(event_cancelled.status, "Cancelled")

        # Test active
        event_active = Event.objects.create(
            name="Active Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            organization=self.organization,
            status="Active",
        )
        self.assertEqual(event_active.status, "Active")

    def test_event_capacity_zero_converts_to_none(self):
        """Test that capacity of 0 is converted to None (Unlimited)"""
        event = Event.objects.create(
            name="Unlimited Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            organization=self.organization,
            capacity=0,
        )
        self.assertIsNone(event.capacity)

    def test_event_with_capacity(self):
        """Test event with capacity limit"""
        event = Event.objects.create(
            name="Limited Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            organization=self.organization,
            capacity=10,
        )
        self.assertEqual(event.capacity, 10)

    def test_event_participants_relationship(self):
        """Test many-to-many relationship with participants"""
        event = Event.objects.create(
            name="Participant Test",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            organization=self.organization,
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
            organization=self.organization,
        )
        self.assertIsNone(event.location)
        self.assertIsNone(event.description)
        self.assertIsNone(event.capacity)


class EventSerializerTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser", password="password123"
        )
        self.user.profile.role = Profile.Role.ORGANIZER
        self.user.profile.save()

        self.organization = Organization.objects.create(
            name="Test Organization", owner=self.user
        )

        self.event = Event.objects.create(
            name="TestEvent",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            organization=self.organization,
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
            "category",
            "organizer",
            "organizer_name",
            "organization",
            "organization_id",
            "organization_name",
            "status",
            "participant_count",
            "interest_count",
            "interested_users",
            "is_participating",
            "is_interested",
            "is_full",
            "created_by",
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
        """Test is_full returns True when event is at capacity"""
        for i in range(5):
            user = User.objects.create_user(
                username=f"participant{i}",
                email=f"participant{i}@gmail.com",
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
        self.user.profile.role = Profile.Role.ORGANIZER
        self.user.profile.save()

        self.organization = Organization.objects.create(
            name="Test Organization", owner=self.user
        )

        self.url = reverse("all-events")

    def test_list_events(self):
        """Test listing all events"""
        Event.objects.create(
            name="Event 1",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            organization=self.organization,
        )
        Event.objects.create(
            name="Event 2",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            organization=self.organization,
        )

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_list_events_empty(self):
        """Test listing events when none exist"""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)


class EventRetrieveUpdateDestroyViewTest(APITestCase):
    def setUp(self):
        Event.objects.all().delete()
        self.client = APIClient()
        self.user = User.objects.create_user(username="testuser", password="pass123")
        self.user.profile.role = Profile.Role.ORGANIZER
        self.user.profile.save()
        self.client.force_authenticate(user=self.user)

        self.organization = Organization.objects.create(
            name="Test Organization", owner=self.user
        )

        self.event = Event.objects.create(
            name="Test Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            organization=self.organization,
        )
        self.url = reverse("event-detail", kwargs={"pk": self.event.pk})

    def test_retrieve_event(self):
        """Test retrieving a specific event"""
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
        Event.objects.all().delete()
        self.client = APIClient()
        self.user = User.objects.create_user(username="testuser", password="pass123")
        self.user.profile.role = Profile.Role.ORGANIZER
        self.user.profile.save()

        self.organization = Organization.objects.create(
            name="Test Organization", owner=self.user
        )

        self.url = reverse("upcoming-events")

    def tearDown(self):
        Event.objects.all().delete()
        User.objects.filter(username="testuser").delete()

    def test_list_upcoming_events(self):
        """Test listing only upcoming events"""
        # Past event
        Event.objects.create(
            name="Past Event",
            date=timezone.now() - timedelta(days=1),
            organizer=self.user,
            organization=self.organization,
        )
        # Future events
        Event.objects.create(
            name="Future Event 1",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            organization=self.organization,
        )
        Event.objects.create(
            name="Future Event 2",
            date=timezone.now() + timedelta(days=2),
            organizer=self.user,
            organization=self.organization,
        )

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_upcoming_events_ordered_by_date(self):
        """Test upcoming events are ordered by date"""
        Event.objects.create(
            name="Event 3 Days",
            date=timezone.now() + timedelta(days=3),
            organizer=self.user,
            organization=self.organization,
        )
        Event.objects.create(
            name="Event 1 Day",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            organization=self.organization,
        )

        response = self.client.get(self.url)
        self.assertEqual(response.data[0]["name"], "Event 1 Day")
        self.assertEqual(response.data[1]["name"], "Event 3 Days")

    def test_filter_by_single_category(self):
        """Test filtering events by single category"""
        Event.objects.create(
            name="Social Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            organization=self.organization,
            category="SOCIAL",
        )
        Event.objects.create(
            name="Sports Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            organization=self.organization,
            category="SPORTS",
        )

        response = self.client.get(self.url, {"category": "SOCIAL"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["category"], "SOCIAL")

    def test_filter_by_multiple_categories(self):
        """Test filtering events by multiple categories"""
        Event.objects.create(
            name="Social Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            organization=self.organization,
            category="SOCIAL",
        )
        Event.objects.create(
            name="Sports Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            organization=self.organization,
            category="SPORTS",
        )
        Event.objects.create(
            name="Academic Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            organization=self.organization,
            category="ACADEMIC",
        )

        response = self.client.get(self.url, {"category": ["SOCIAL", "SPORTS"]})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_filter_by_today(self):
        """Test filtering events happening today"""
        now = timezone.now()
        # Ensure event is today and in the future
        # Use noon today if it's still in the future, otherwise use a time later today
        noon_today = now.replace(hour=12, minute=0, second=0, microsecond=0)
        end_of_day = now.replace(hour=23, minute=59, second=59, microsecond=999999)

        # Choose a time that's definitely today and in the future
        if noon_today > now:
            today_event_time = noon_today
        elif now.hour < 20:
            # If before 20:00, use now + 1 hour (should still be today)
            today_event_time = now + timedelta(hours=1)
            # If that pushes to tomorrow, use 20:00 today
            if today_event_time.date() > now.date():
                today_event_time = now.replace(
                    hour=20, minute=0, second=0, microsecond=0
                )
        else:
            # If 20:00 or later, use end of day minus 30 minutes
            today_event_time = end_of_day - timedelta(minutes=30)

        # Ensure it's in the future
        if today_event_time <= now:
            today_event_time = now + timedelta(minutes=5)

        Event.objects.create(
            name="Today Event",
            date=today_event_time,
            organizer=self.user,
            organization=self.organization,
            category="SOCIAL",
        )
        tomorrow_event_time = (now + timedelta(days=1)).replace(
            hour=12, minute=0, second=0, microsecond=0
        )
        Event.objects.create(
            name="Tomorrow Event",
            date=tomorrow_event_time,
            organizer=self.user,
            organization=self.organization,
            category="SOCIAL",
        )

        response = self.client.get(self.url, {"date_filter": "today"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Today Event")

    def test_filter_by_tomorrow(self):
        """Test filtering events happening tomorrow"""
        now = timezone.now()
        # Create today event that's definitely today (use noon if late in day)
        if now.hour >= 22:
            today_event_time = now.replace(hour=14, minute=0, second=0, microsecond=0)
            if today_event_time <= now:
                today_event_time = now + timedelta(hours=1)
                if today_event_time.date() > now.date():
                    today_event_time = now.replace(
                        hour=now.hour - 1, minute=0, second=0, microsecond=0
                    )
        else:
            today_event_time = now + timedelta(hours=2)
            if today_event_time.date() > now.date():
                today_event_time = now.replace(
                    hour=14, minute=0, second=0, microsecond=0
                )
        Event.objects.create(
            name="Today Event",
            date=today_event_time,
            organizer=self.user,
            organization=self.organization,
            category="SOCIAL",
        )
        tomorrow_event_time = (now + timedelta(days=1)).replace(
            hour=12, minute=0, second=0, microsecond=0
        )
        Event.objects.create(
            name="Tomorrow Event",
            date=tomorrow_event_time,
            organizer=self.user,
            organization=self.organization,
            category="SOCIAL",
        )
        day_after_event_time = (now + timedelta(days=2)).replace(
            hour=12, minute=0, second=0, microsecond=0
        )
        Event.objects.create(
            name="Day After Event",
            date=day_after_event_time,
            organizer=self.user,
            organization=self.organization,
            category="SOCIAL",
        )

        response = self.client.get(self.url, {"date_filter": "tomorrow"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Tomorrow Event")

    def test_filter_by_this_week(self):
        """Test filtering events happening this week"""
        now = timezone.now()
        this_week_event_time = (now + timedelta(days=2)).replace(
            hour=12, minute=0, second=0, microsecond=0
        )
        Event.objects.create(
            name="This Week Event",
            date=this_week_event_time,
            organizer=self.user,
            organization=self.organization,
        )
        next_week_event_time = (now + timedelta(days=8)).replace(
            hour=12, minute=0, second=0, microsecond=0
        )
        Event.objects.create(
            name="Next Week Event",
            date=next_week_event_time,
            organizer=self.user,
            organization=self.organization,
        )

        response = self.client.get(self.url, {"date_filter": "this_week"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        event_names = [event["name"] for event in response.data]
        self.assertIn("This Week Event", event_names)
        self.assertNotIn("Next Week Event", event_names)

    def test_filter_by_date_from(self):
        """Test filtering events from a specific date"""
        now = timezone.now()
        target_date = (now + timedelta(days=5)).date()

        Event.objects.create(
            name="Before Target",
            date=now + timedelta(days=2),
            organizer=self.user,
            organization=self.organization,
        )
        Event.objects.create(
            name="After Target",
            date=now + timedelta(days=7),
            organizer=self.user,
            organization=self.organization,
        )

        response = self.client.get(self.url, {"date_from": target_date.isoformat()})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "After Target")

    def test_filter_by_date_to(self):
        """Test filtering events up to a specific date"""
        now = timezone.now()
        target_date = (now + timedelta(days=5)).date()

        Event.objects.create(
            name="Before Target",
            date=now + timedelta(days=2),
            organizer=self.user,
            organization=self.organization,
        )
        Event.objects.create(
            name="After Target",
            date=now + timedelta(days=7),
            organizer=self.user,
            organization=self.organization,
        )

        response = self.client.get(self.url, {"date_to": target_date.isoformat()})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Before Target")

    def test_filter_by_date_range(self):
        """Test filtering events within a date range"""
        now = timezone.now()
        date_from = (now + timedelta(days=3)).date()
        date_to = (now + timedelta(days=7)).date()

        Event.objects.create(
            name="Before Range",
            date=now + timedelta(days=1),
            organizer=self.user,
            organization=self.organization,
        )
        Event.objects.create(
            name="In Range",
            date=now + timedelta(days=5),
            organizer=self.user,
            organization=self.organization,
        )
        Event.objects.create(
            name="After Range",
            date=now + timedelta(days=10),
            organizer=self.user,
            organization=self.organization,
        )

        response = self.client.get(
            self.url,
            {"date_from": date_from.isoformat(), "date_to": date_to.isoformat()},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "In Range")

    def test_search_by_name(self):
        """Test searching events by name"""
        Event.objects.create(
            name="Python Workshop",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            organization=self.organization,
        )
        Event.objects.create(
            name="Java Meetup",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            organization=self.organization,
        )

        response = self.client.get(self.url, {"search": "Python"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Python Workshop")

    def test_search_by_description(self):
        """Test searching events by description"""
        Event.objects.create(
            name="Event 1",
            description="Learn about machine learning",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            organization=self.organization,
        )
        Event.objects.create(
            name="Event 2",
            description="Web development basics",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            organization=self.organization,
        )

        response = self.client.get(self.url, {"search": "machine learning"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_search_by_category(self):
        """Test searching events by category"""
        Event.objects.create(
            name="Social Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            organization=self.organization,
            category="SOCIAL",
        )
        Event.objects.create(
            name="Sports Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            organization=self.organization,
            category="SPORTS",
        )

        response = self.client.get(self.url, {"search": "social"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_search_case_insensitive(self):
        """Test search is case insensitive"""
        Event.objects.create(
            name="Python Workshop",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            organization=self.organization,
        )

        response = self.client.get(self.url, {"search": "python"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

        response = self.client.get(self.url, {"search": "PYTHON"})
        self.assertEqual(len(response.data), 1)

    def test_combined_filters(self):
        """Test combining multiple filters"""
        now = timezone.now()
        Event.objects.create(
            name="Social Workshop",
            description="Learn socializing",
            date=now + timedelta(days=2),
            organizer=self.user,
            organization=self.organization,
            category="SOCIAL",
        )
        Event.objects.create(
            name="Sports Workshop",
            date=now + timedelta(days=2),
            organizer=self.user,
            organization=self.organization,
            category="SPORTS",
        )
        Event.objects.create(
            name="Social Meetup",
            date=now + timedelta(days=10),
            organizer=self.user,
            organization=self.organization,
            category="SOCIAL",
        )

        response = self.client.get(
            self.url,
            {
                "category": "SOCIAL",
                "search": "Workshop",
                "date_to": (now + timedelta(days=5)).date().isoformat(),
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Social Workshop")

    def test_no_results(self):
        """Test filters return empty list when no matches"""
        Event.objects.create(
            name="Social Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            organization=self.organization,
            category="SOCIAL",
        )

        response = self.client.get(self.url, {"search": "NonexistentKeyword"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)


class CreateEventViewTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="testuser", password="pass123")
        self.user.profile.role = Profile.Role.ORGANIZER
        self.user.profile.save()

        self.organization = Organization.objects.create(
            name="Test Organization", owner=self.user
        )

        self.url = reverse("create_event")

    def test_create_event_authenticated(self):
        """Test authenticated user can create event"""
        self.client.force_authenticate(user=self.user)
        data = {
            "name": "New Event",
            "date": (timezone.now() + timedelta(days=1)).isoformat(),
            "location": "Test Location",
            "category": "SOCIAL",
            "organization": self.organization.id,
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
        self.organizer.profile.role = Profile.Role.ORGANIZER
        self.organizer.profile.save()

        self.organization = Organization.objects.create(
            name="Test Organization", owner=self.organizer
        )

        self.event = Event.objects.create(
            name="Test Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.organizer,
            organization=self.organization,
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
