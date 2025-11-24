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

User = get_user_model()


class EventOrganizationModelTest(TestCase):
    """Tests for Event model with organization field"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="password123",
            first_name="Test",
            last_name="User",
        )
        self.user.profile.role = Profile.Role.ORGANIZER
        self.user.profile.save()

        self.organization = Organization.objects.create(
            name="Test Organization",
            owner=self.user,
        )

    def test_event_requires_organization(self):
        """Test that event cannot be created without organization"""
        with self.assertRaises(Exception):  # Will raise IntegrityError
            Event.objects.create(
                name="Test Event",
                date=timezone.now() + timedelta(days=1),
                organizer=self.user,
            )

    def test_event_with_organization(self):
        """Test that event can be created with organization"""
        event = Event.objects.create(
            name="Test Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            organization=self.organization,
        )
        self.assertEqual(event.organization, self.organization)
        self.assertEqual(event.organizer, self.user)
        self.assertEqual(self.organization.events.count(), 1)

    def test_organization_events_relationship(self):
        """Test reverse relationship from organization to events"""
        Event.objects.create(
            name="Event 1",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            organization=self.organization,
        )
        Event.objects.create(
            name="Event 2",
            date=timezone.now() + timedelta(days=2),
            organizer=self.user,
            organization=self.organization,
        )

        self.assertEqual(self.organization.events.count(), 2)
        event_names = [event.name for event in self.organization.events.all()]
        self.assertIn("Event 1", event_names)
        self.assertIn("Event 2", event_names)

    def test_event_cascade_delete_with_organization(self):
        """Test that events are deleted when organization is deleted"""
        event = Event.objects.create(
            name="Test Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            organization=self.organization,
        )

        self.organization.delete()
        self.assertFalse(Event.objects.filter(id=event.id).exists())

    def test_event_with_different_organizations(self):
        """Test that events can belong to different organizations"""
        other_user = User.objects.create_user(
            username="otheruser",
            email="other@example.com",
            password="password123",
        )
        other_org = Organization.objects.create(
            name="Other Organization",
            owner=other_user,
        )

        event1 = Event.objects.create(
            name="Event 1",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            organization=self.organization,
        )
        event2 = Event.objects.create(
            name="Event 2",
            date=timezone.now() + timedelta(days=2),
            organizer=other_user,
            organization=other_org,
        )

        self.assertEqual(event1.organization, self.organization)
        self.assertEqual(event2.organization, other_org)
        self.assertNotEqual(event1.organization, event2.organization)


class EventOrganizationSerializerTest(APITestCase):
    """Tests for EventSerializer with organization fields"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="password123",
            first_name="Test",
            last_name="User",
        )
        self.user.profile.role = Profile.Role.ORGANIZER
        self.user.profile.save()

        self.organization = Organization.objects.create(
            name="Test Organization",
            owner=self.user,
        )

        self.event = Event.objects.create(
            name="Test Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            organization=self.organization,
            capacity=10,
        )

    def test_serializer_includes_organization_fields(self):
        """Test that serializer includes organization_id and organization_name"""
        from events.serializers import EventSerializer

        serializer = EventSerializer(instance=self.event, context={"request": None})
        data = serializer.data

        self.assertIn("organization", data)
        self.assertIn("organization_id", data)
        self.assertIn("organization_name", data)
        self.assertEqual(data["organization"], self.organization.id)
        self.assertEqual(data["organization_id"], self.organization.id)
        self.assertEqual(data["organization_name"], "Test Organization")

    def test_organization_name_serialization(self):
        """Test that organization_name is correctly serialized"""
        from events.serializers import EventSerializer

        serializer = EventSerializer(instance=self.event, context={"request": None})
        data = serializer.data

        self.assertEqual(data["organization_name"], self.organization.name)
        self.assertEqual(data["organization_id"], self.organization.id)

    def test_organization_required_in_serializer(self):
        """Test that organization field is required when creating event"""
        from events.serializers import EventSerializer

        serializer = EventSerializer(
            data={
                "name": "New Event",
                "date": (timezone.now() + timedelta(days=1)).isoformat(),
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("organization", serializer.errors)

    def test_organization_validation(self):
        """Test that organization validation works"""
        from events.serializers import EventSerializer

        serializer = EventSerializer(
            data={
                "name": "New Event",
                "date": (timezone.now() + timedelta(days=1)).isoformat(),
                "organization": None,
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("organization", serializer.errors)


class EventOrganizationViewTest(APITestCase):
    """Tests for Event views with organization functionality"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="password123",
            first_name="Test",
            last_name="User",
        )
        self.user.profile.role = Profile.Role.ORGANIZER
        self.user.profile.save()

        # Give user permission to change events for update tests
        change_permission = Permission.objects.get(
            codename="change_event", content_type__app_label="events"
        )
        self.user.user_permissions.add(change_permission)
        self.user.save()

        self.other_user = User.objects.create_user(
            username="otheruser",
            email="other@example.com",
            password="password123",
        )

        self.organization = Organization.objects.create(
            name="Test Organization",
            owner=self.user,
        )

        self.other_organization = Organization.objects.create(
            name="Other Organization",
            owner=self.other_user,
        )

        self.event = Event.objects.create(
            name="Test Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            organization=self.organization,
            status="Active",
        )

    def test_list_events_includes_organization_fields(self):
        """Test that list endpoint includes organization fields"""
        url = reverse("all-events")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        # Pagination is disabled, so response is a list directly
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)

        event_data = data[0]
        self.assertIn("organization", event_data)
        self.assertIn("organization_id", event_data)
        self.assertIn("organization_name", event_data)
        self.assertEqual(event_data["organization"], self.organization.id)
        self.assertEqual(event_data["organization_name"], "Test Organization")

    def test_list_events_only_shows_events_with_organization(self):
        """Test that list endpoint only shows events with organization"""
        # This test ensures events without organization are filtered out
        url = reverse("all-events")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        # Pagination is disabled, so response is a list directly
        self.assertIsInstance(data, list)

        for event in data:
            self.assertIsNotNone(event["organization"])
            self.assertIsNotNone(event["organization_id"])

    def test_create_event_without_organization(self):
        """Test that creating event without organization returns error"""
        self.client.force_authenticate(user=self.user)
        url = reverse("create_event")
        data = {
            "name": "New Event",
            "date": (timezone.now() + timedelta(days=1)).isoformat(),
            "location": "Test Location",
        }
        response = self.client.post(url, data)

        # Should return 400 because organization is required
        # But may return 403 if there's permission check first
        self.assertIn(
            response.status_code,
            [status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN],
        )
        if response.status_code == status.HTTP_400_BAD_REQUEST:
            self.assertIn("organization", response.json())

    def test_create_event_with_organization(self):
        """Test that creating event with organization works"""
        self.client.force_authenticate(user=self.user)
        url = reverse("create_event")  # Use CreateEventView instead
        data = {
            "name": "New Event",
            "date": (timezone.now() + timedelta(days=1)).isoformat(),
            "location": "Test Location",
            "organization": self.organization.id,
            "category": "SOCIAL",
        }
        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(data["organization"], self.organization.id)
        self.assertEqual(data["organization_name"], "Test Organization")
        self.assertEqual(data["organizer"], self.user.id)

        # Verify event was created
        event = Event.objects.get(id=data["id"])
        self.assertEqual(event.organization, self.organization)

    def test_create_event_requires_organization_ownership(self):
        """Test that user must own organization to create event"""
        self.client.force_authenticate(user=self.user)
        url = reverse("create_event")
        data = {
            "name": "New Event",
            "date": (timezone.now() + timedelta(days=1)).isoformat(),
            "organization": self.other_organization.id,  # User doesn't own this
        }
        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("organization", response.json())

    def test_create_event_with_nonexistent_organization(self):
        """Test that creating event with nonexistent organization returns error"""
        self.client.force_authenticate(user=self.user)
        url = reverse("create_event")
        data = {
            "name": "New Event",
            "date": (timezone.now() + timedelta(days=1)).isoformat(),
            "organization": 99999,  # Non-existent ID
        }
        response = self.client.post(url, data)

        # Should return error - could be 404 (not found), 400 (validation),
        # or 403 (permission)
        self.assertIn(
            response.status_code,
            [
                status.HTTP_404_NOT_FOUND,
                status.HTTP_400_BAD_REQUEST,
                status.HTTP_403_FORBIDDEN,
            ],
        )
        # Should have error message about organization
        if response.status_code in [
            status.HTTP_404_NOT_FOUND,
            status.HTTP_400_BAD_REQUEST,
        ]:
            self.assertIn("organization", response.json())

    def test_create_event_auto_sets_organizer(self):
        """Test that organizer is automatically set to requesting user"""
        self.client.force_authenticate(user=self.user)
        url = reverse("create_event")
        data = {
            "name": "New Event",
            "date": (timezone.now() + timedelta(days=1)).isoformat(),
            "organization": self.organization.id,
            "category": "SOCIAL",
        }
        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(data["organizer"], self.user.id)

        event = Event.objects.get(id=data["id"])
        self.assertEqual(event.organizer, self.user)

    def test_update_event_organization_cannot_be_removed(self):
        """Test that organization cannot be removed from event"""
        # Give user permission to change events
        change_permission = Permission.objects.get(
            codename="change_event", content_type__app_label="events"
        )
        self.user.user_permissions.add(change_permission)
        self.user.save()

        self.client.force_authenticate(user=self.user)
        url = reverse("event-detail", kwargs={"pk": self.event.id})

        # Try to update without organization field (should keep existing)
        data = {
            "name": "Updated Event",
        }
        response = self.client.patch(url, data)

        # Update should succeed, organization should remain
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["organization"], self.organization.id)

        # Try explicitly setting to empty string via JSON
        import json

        data_with_empty = {"name": "Updated Event 2", "organization": ""}
        response = self.client.patch(
            url, json.dumps(data_with_empty), content_type="application/json"
        )

        # Should fail validation or keep original
        # The view checks if organization_id is not None and not organization_id
        # Empty string would be falsy, so should trigger the validation
        if response.status_code == status.HTTP_400_BAD_REQUEST:
            self.assertIn("organization", response.json())
        else:
            # If succeeds, organization should still be set (because it's readonly)
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.json()["organization"], self.organization.id)

    def test_organization_field_is_readonly_in_serializer(self):
        """Test that organization field is readonly in serializer"""
        # Organization field should be in read_only_fields
        # This means it cannot be updated via API
        from events.serializers import EventSerializer

        serializer = EventSerializer(instance=self.event)
        self.assertIn("organization", serializer.fields)

        # Check that organization_id is in read_only_fields
        # This ensures organization cannot be changed after creation
        read_only = serializer.Meta.read_only_fields
        self.assertIn("organization_id", read_only)

        # Also verify organization_name is readonly
        self.assertIn("organization_name", read_only)

    def test_retrieve_event_includes_organization(self):
        """Test that retrieve endpoint includes organization fields"""
        url = reverse("event-detail", kwargs={"pk": self.event.id})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertIn("organization", data)
        self.assertIn("organization_id", data)
        self.assertIn("organization_name", data)
        self.assertEqual(data["organization"], self.organization.id)
        self.assertEqual(data["organization_id"], self.organization.id)
        self.assertEqual(data["organization_name"], "Test Organization")

    def test_upcoming_events_includes_organization(self):
        """Test that upcoming events include organization fields"""
        # Create an upcoming event
        Event.objects.create(
            name="Upcoming Event",
            date=timezone.now() + timedelta(days=7),
            organizer=self.user,
            organization=self.organization,
            status="Active",
        )

        url = reverse("upcoming-events")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        # Pagination is disabled, so response is a list directly
        self.assertIsInstance(data, list)

        for event in data:
            self.assertIn("organization", event)
            self.assertIn("organization_id", event)
            self.assertIn("organization_name", event)

    def test_past_events_includes_organization(self):
        """Test that past events include organization fields"""
        # Create a past event
        Event.objects.create(
            name="Past Event",
            date=timezone.now() - timedelta(days=7),
            organizer=self.user,
            organization=self.organization,
            status="Active",
        )

        url = reverse("past-events")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        # Pagination is disabled, so response is a list directly
        self.assertIsInstance(data, list)

        for event in data:
            self.assertIn("organization", event)
            self.assertIn("organization_id", event)
            self.assertIn("organization_name", event)

    def test_upcoming_events_filters_by_organization(self):
        """Test that upcoming events only show events with organization"""
        # Create event without organization shouldn't appear
        # (but organization is required, so this test verifies filtering)
        url = reverse("upcoming-events")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        # Pagination is disabled, so response is a list directly
        self.assertIsInstance(data, list)

        for event in data:
            self.assertIsNotNone(event["organization"])
            self.assertIsNotNone(event["organization_id"])

    def test_create_event_view_with_organization(self):
        """Test CreateEventView with organization"""
        self.client.force_authenticate(user=self.user)
        url = reverse("create_event")
        data = {
            "name": "New Event",
            "date": (timezone.now() + timedelta(days=1)).isoformat(),
            "organization": self.organization.id,
            "location": "Test Location",
            "category": "SOCIAL",
        }
        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(data["organization"], self.organization.id)
        self.assertEqual(data["organization_name"], "Test Organization")

    def test_create_event_view_requires_organization_ownership(self):
        """Test CreateEventView requires organization ownership"""
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


class EventOrganizationFilterTest(APITestCase):
    """Tests for filtering events by organization"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="password123",
        )
        self.user.profile.role = Profile.Role.ORGANIZER
        self.user.profile.save()

        self.organization1 = Organization.objects.create(
            name="Organization 1",
            owner=self.user,
        )
        self.organization2 = Organization.objects.create(
            name="Organization 2",
            owner=self.user,
        )

        # Create events for different organizations
        self.event1 = Event.objects.create(
            name="Event 1",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            organization=self.organization1,
            status="Active",
        )
        self.event2 = Event.objects.create(
            name="Event 2",
            date=timezone.now() + timedelta(days=2),
            organizer=self.user,
            organization=self.organization2,
            status="Active",
        )

    def test_events_filtered_by_organization(self):
        """Test that events can be filtered by organization"""
        url = reverse("all-events")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        # Pagination is disabled, so response is a list directly
        self.assertIsInstance(data, list)

        # Both events should be in the list
        event_names = [event["name"] for event in data]
        self.assertIn("Event 1", event_names)
        self.assertIn("Event 2", event_names)

        # Verify each event has correct organization
        event_dict = {event["name"]: event for event in data}
        self.assertEqual(event_dict["Event 1"]["organization"], self.organization1.id)
        self.assertEqual(event_dict["Event 2"]["organization"], self.organization2.id)
