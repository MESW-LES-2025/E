"""Tests for events app"""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import Organization, Profile
from events.models import Event
from events.serializers import EventSerializer

User = get_user_model()


class EventModelTest(TestCase):
    """Tests for Event model"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="password123",
        )
        self.user.profile.role = Profile.Role.ORGANIZER
        self.user.profile.save()

        self.organization = Organization.objects.create(
            name="Test Organization", owner=self.user
        )

    def test_event_str(self):
        """Test Event.__str__ method"""
        event = Event.objects.create(
            name="Test Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            organization=self.organization,
        )
        self.assertEqual(str(event), "Test Event")


class EventSerializerTest(TestCase):
    """Tests for EventSerializer"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="password123",
        )
        self.user.profile.role = Profile.Role.ORGANIZER
        self.user.profile.save()

        self.organization = Organization.objects.create(
            name="Test Organization", owner=self.user
        )

        self.event = Event.objects.create(
            name="Test Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            organization=self.organization,
            capacity=10,
        )

    def test_get_organization_name_none(self):
        """Test get_organization_name when organization is None"""
        # Create event without organization (if possible for testing)
        # Since organization is required, we'll mock it
        from unittest.mock import Mock

        event = Mock()
        event.organization = None

        serializer = EventSerializer()
        result = serializer.get_organization_name(event)
        self.assertIsNone(result)

    def test_get_organization_id_none(self):
        """Test get_organization_id when organization is None"""
        from unittest.mock import Mock

        event = Mock()
        event.organization = None

        serializer = EventSerializer()
        result = serializer.get_organization_id(event)
        self.assertIsNone(result)

    def test_validate_capacity_zero(self):
        """Test validate_capacity with 0"""
        serializer = EventSerializer()
        result = serializer.validate_capacity(0)
        self.assertIsNone(result)

    def test_validate_capacity_empty_string(self):
        """Test validate_capacity with empty string"""
        serializer = EventSerializer()
        result = serializer.validate_capacity("")
        self.assertIsNone(result)

    def test_validate_capacity_none(self):
        """Test validate_capacity with None"""
        serializer = EventSerializer()
        result = serializer.validate_capacity(None)
        self.assertIsNone(result)

    def test_validate_capacity_negative(self):
        """Test validate_capacity with negative value"""
        from rest_framework import serializers

        serializer = EventSerializer()
        with self.assertRaises(serializers.ValidationError) as context:
            serializer.validate_capacity(-5)

        self.assertIn("cannot be negative", str(context.exception))

    def test_validate_capacity_positive(self):
        """Test validate_capacity with positive value"""
        serializer = EventSerializer()
        result = serializer.validate_capacity(10)
        self.assertEqual(result, 10)

    def test_validate_organization_none(self):
        """Test validate_organization with None"""
        from rest_framework import serializers

        serializer = EventSerializer()
        with self.assertRaises(serializers.ValidationError):
            serializer.validate_organization(None)


class EventListCreateViewTest(APITestCase):
    """Tests for EventListCreateView"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="password123",
        )
        self.user.profile.role = Profile.Role.ORGANIZER
        self.user.profile.save()

        self.other_user = User.objects.create_user(
            username="otheruser",
            email="other@example.com",
            password="password123",
        )

        self.organization = Organization.objects.create(
            name="Test Organization", owner=self.user
        )

        self.other_organization = Organization.objects.create(
            name="Other Organization", owner=self.other_user
        )

    def test_create_without_organization(self):
        """Test EventListCreateView.create without organization"""
        change_permission = Permission.objects.get(
            codename="add_event", content_type__app_label="events"
        )
        self.user.user_permissions.add(change_permission)
        self.user.save()

        self.client.force_authenticate(user=self.user)
        url = reverse("create_event")
        data = {
            "name": "New Event",
            "date": (timezone.now() + timedelta(days=1)).isoformat(),
        }
        response = self.client.post(url, data)
        self.assertIn(
            response.status_code,
            [status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN],
        )

    def test_create_with_invalid_organization_id(self):
        """Test EventListCreateView.create with invalid organization ID"""
        change_permission = Permission.objects.get(
            codename="add_event", content_type__app_label="events"
        )
        self.user.user_permissions.add(change_permission)
        self.user.save()

        self.client.force_authenticate(user=self.user)
        url = reverse("create_event")
        data = {
            "name": "New Event",
            "date": (timezone.now() + timedelta(days=1)).isoformat(),
            "organization": "invalid",
        }
        response = self.client.post(url, data)
        self.assertIn(
            response.status_code,
            [
                status.HTTP_404_NOT_FOUND,
                status.HTTP_400_BAD_REQUEST,
                status.HTTP_403_FORBIDDEN,
            ],
        )

    def test_create_with_wrong_organization_type(self):
        """Test EventListCreateView.create with wrong type for organization"""
        change_permission = Permission.objects.get(
            codename="add_event", content_type__app_label="events"
        )
        self.user.user_permissions.add(change_permission)
        self.user.save()

        self.client.force_authenticate(user=self.user)
        url = reverse("create_event")
        data = {
            "name": "New Event",
            "date": (timezone.now() + timedelta(days=1)).isoformat(),
            "organization": [],
        }
        response = self.client.post(url, data)
        self.assertIn(
            response.status_code,
            [
                status.HTTP_404_NOT_FOUND,
                status.HTTP_400_BAD_REQUEST,
                status.HTTP_403_FORBIDDEN,
            ],
        )

    def test_create_success(self):
        """Test EventListCreateView.create success path"""
        change_permission = Permission.objects.get(
            codename="add_event", content_type__app_label="events"
        )
        self.user.user_permissions.add(change_permission)
        self.user.save()

        self.client.force_authenticate(user=self.user)
        url = reverse("create_event")
        data = {
            "name": "New Event",
            "date": (timezone.now() + timedelta(days=1)).isoformat(),
            "organization": self.organization.id,  # Ensure organization ID is passed
            "location": "Test Location",
            "category": "SOCIAL",
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()["name"], "New Event")
        self.assertEqual(response.json()["organization"], self.organization.id)

    def test_create_with_organization_not_owned(self):
        """Test EventListCreateView.create with organization user doesn't own"""
        change_permission = Permission.objects.get(
            codename="add_event", content_type__app_label="events"
        )
        self.user.user_permissions.add(change_permission)
        self.user.save()

        self.client.force_authenticate(user=self.user)
        url = reverse("create_event")
        data = {
            "name": "New Event",
            "date": (timezone.now() + timedelta(days=1)).isoformat(),
            "organization": self.other_organization.id,
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("organization", response.json())


class EventRetrieveUpdateDestroyViewTest(APITestCase):
    """Tests for EventRetrieveUpdateDestroyView"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="password123",
        )
        self.user.profile.role = Profile.Role.ORGANIZER
        self.user.profile.save()

        self.organization = Organization.objects.create(
            name="Test Organization", owner=self.user
        )

        self.event = Event.objects.create(
            name="Test Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            organization=self.organization,
            status="Active",
        )

    def test_update_with_empty_organization(self):
        """Test EventRetrieveUpdateDestroyView.update with empty organization"""
        change_permission = Permission.objects.get(
            codename="change_event", content_type__app_label="events"
        )
        self.user.user_permissions.add(change_permission)
        self.user.save()

        self.client.force_authenticate(user=self.user)
        url = reverse("event-detail", kwargs={"pk": self.event.id})
        import json

        data = {"name": "Updated Event", "organization": ""}
        response = self.client.patch(
            url, json.dumps(data), content_type="application/json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("organization", response.json())


class CancelEventViewTest(APITestCase):
    """Tests for CancelEventView"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="password123",
        )
        self.user.profile.role = Profile.Role.ORGANIZER
        self.user.profile.save()

        self.other_user = User.objects.create_user(
            username="otheruser",
            email="other@example.com",
            password="password123",
        )

        self.organization = Organization.objects.create(
            name="Test Organization", owner=self.user
        )

        self.event = Event.objects.create(
            name="Test Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            organization=self.organization,
            status="Active",
        )

    def test_cancel_event_not_found(self):
        """Test CancelEventView with non-existent event"""
        self.client.force_authenticate(user=self.user)
        url = reverse("event-cancel", kwargs={"pk": 99999})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_cancel_event_permission_denied(self):
        """Test CancelEventView with non-organizer"""
        self.client.force_authenticate(user=self.other_user)
        url = reverse("event-cancel", kwargs={"pk": self.event.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class UncancelEventViewTest(APITestCase):
    """Tests for UncancelEventView"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="password123",
        )
        self.user.profile.role = Profile.Role.ORGANIZER
        self.user.profile.save()

        self.other_user = User.objects.create_user(
            username="otheruser",
            email="other@example.com",
            password="password123",
        )

        self.organization = Organization.objects.create(
            name="Test Organization", owner=self.user
        )

        self.event = Event.objects.create(
            name="Test Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            organization=self.organization,
            status="Active",
        )

    def test_uncancel_event_not_found(self):
        """Test UncancelEventView with non-existent event"""
        self.client.force_authenticate(user=self.user)
        url = reverse("event-uncancel", kwargs={"pk": 99999})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_uncancel_event_permission_denied(self):
        """Test UncancelEventView with non-organizer"""
        # First cancel the event
        self.client.force_authenticate(user=self.user)
        cancel_url = reverse("event-cancel", kwargs={"pk": self.event.id})
        self.client.post(cancel_url)

        # Then try to uncancel as other user
        self.client.force_authenticate(user=self.other_user)
        url = reverse("event-uncancel", kwargs={"pk": self.event.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_uncancel_event_not_canceled(self):
        """Test UncancelEventView with non-canceled event"""
        self.client.force_authenticate(user=self.user)
        url = reverse("event-uncancel", kwargs={"pk": self.event.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.json())


class ParticipateEventViewTest(APITestCase):
    """Tests for ParticipateEventView"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="password123",
        )
        self.user.profile.role = Profile.Role.ORGANIZER
        self.user.profile.save()

        self.organization = Organization.objects.create(
            name="Test Organization", owner=self.user
        )

        self.event = Event.objects.create(
            name="Test Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            organization=self.organization,
            status="Active",
        )

    def test_participate_when_already_registered(self):
        """Test ParticipateEventView.post when already registered"""
        self.client.force_authenticate(user=self.user)
        self.event.participants.add(self.user)

        url = reverse("event-participate", kwargs={"pk": self.event.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["detail"], "Already registered.")

    def test_participate_when_event_full(self):
        """Test ParticipateEventView.post when event is full"""
        self.event.capacity = 1
        self.event.save()

        other_user = User.objects.create_user(
            username="participant",
            email="participant@example.com",
            password="password123",
        )
        self.event.participants.add(other_user)

        self.client.force_authenticate(user=self.user)
        url = reverse("event-participate", kwargs={"pk": self.event.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()["detail"], "Event is full.")

    def test_participate_with_unlimited_capacity(self):
        """Test ParticipateEventView.post with unlimited capacity"""
        self.event.capacity = None
        self.event.save()

        self.client.force_authenticate(user=self.user)
        url = reverse("event-participate", kwargs={"pk": self.event.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_participate_with_capacity_zero(self):
        """Test ParticipateEventView.post with capacity=0 (unlimited)"""
        self.event.capacity = 0
        self.event.save()

        self.client.force_authenticate(user=self.user)
        url = reverse("event-participate", kwargs={"pk": self.event.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_remove_participation_when_not_registered(self):
        """Test ParticipateEventView.delete when not registered"""
        self.client.force_authenticate(user=self.user)
        url = reverse("event-participate", kwargs={"pk": self.event.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_remove_participation(self):
        """Test ParticipateEventView.delete to remove participation"""
        self.client.force_authenticate(user=self.user)
        self.event.participants.add(self.user)

        url = reverse("event-participate", kwargs={"pk": self.event.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["detail"], "Participation removed.")
        self.assertFalse(self.event.participants.filter(pk=self.user.pk).exists())


class CreateEventViewTest(APITestCase):
    """Tests for CreateEventView"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="password123",
        )
        self.user.profile.role = Profile.Role.ORGANIZER
        self.user.profile.save()

        self.organization = Organization.objects.create(
            name="Test Organization", owner=self.user
        )

    def test_create_without_organization(self):
        """Test CreateEventView.create without organization"""
        self.client.force_authenticate(user=self.user)
        url = reverse("create_event")
        data = {
            "name": "New Event",
            "date": (timezone.now() + timedelta(days=1)).isoformat(),
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("organization", response.json())
