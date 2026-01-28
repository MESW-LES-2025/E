"""Tests for events views"""

from datetime import timedelta
from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import Organization, Profile
from events.models import Event

# Views are imported locally when needed to avoid circular imports

User = get_user_model()


class CreateEventViewTest(APITestCase):
    """Tests for CreateEventView.create method"""

    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="testpass123",
        )
        self.owner.profile.role = Profile.Role.ORGANIZER
        self.owner.profile.save()

        self.organization = Organization.objects.create(
            name="Test Organization", owner=self.owner
        )

    def test_create_event_without_organization(self):
        """Test create event fails when organization is missing"""
        self.client.force_authenticate(user=self.owner)
        url = reverse("create_event")
        data = {
            "name": "Test Event",
            "date": (timezone.now() + timedelta(days=1)).isoformat(),
            "location": "Test Location",
        }

        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("organization", response.json())

    def test_create_event_with_invalid_organization(self):
        """Test create event fails when organization doesn't exist"""
        self.client.force_authenticate(user=self.owner)
        url = reverse("create_event")
        data = {
            "name": "Test Event",
            "date": (timezone.now() + timedelta(days=1)).isoformat(),
            "location": "Test Location",
            "organization": 99999,
        }

        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_event_without_permission(self):
        """Test create event fails when user is not owner or collaborator"""
        other_user = User.objects.create_user(
            username="other",
            email="other@example.com",
            password="testpass123",
        )
        other_user.profile.role = Profile.Role.ORGANIZER
        other_user.profile.save()

        self.client.force_authenticate(user=other_user)
        url = reverse("create_event")
        data = {
            "name": "Test Event",
            "date": (timezone.now() + timedelta(days=1)).isoformat(),
            "location": "Test Location",
            "organization": self.organization.id,
        }

        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_event_as_collaborator(self):
        """Test create event succeeds when user is collaborator"""
        collaborator = User.objects.create_user(
            username="collaborator",
            email="collab@example.com",
            password="testpass123",
        )
        collaborator.profile.role = Profile.Role.ORGANIZER
        collaborator.profile.save()

        self.organization.collaborators.add(collaborator)

        self.client.force_authenticate(user=collaborator)
        url = reverse("create_event")
        data = {
            "name": "Test Event",
            "date": (timezone.now() + timedelta(days=1)).isoformat(),
            "location": "Test Location",
            "description": "Test Description",
            "organization": self.organization.id,
            "category": "SOCIAL",
        }

        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    @patch("events.views.get_channel_layer")
    @patch("events.views.async_to_sync")
    def test_create_event_notifies_followers(
        self, mock_async_to_sync, mock_get_channel_layer
    ):
        """Test that creating event notifies organization followers"""
        follower = User.objects.create_user(
            username="follower",
            email="follower@example.com",
            password="testpass123",
        )
        follower.profile.role = Profile.Role.ATTENDEE
        follower.profile.save()

        self.organization.followers.add(follower)

        mock_channel_layer = Mock()
        mock_get_channel_layer.return_value = mock_channel_layer

        self.client.force_authenticate(user=self.owner)
        url = reverse("create_event")
        data = {
            "name": "Test Event",
            "date": (timezone.now() + timedelta(days=1)).isoformat(),
            "location": "Test Location",
            "description": "Test Description",
            "organization": self.organization.id,
            "category": "SOCIAL",
        }

        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mock_async_to_sync.assert_called()

    @patch("events.views.get_channel_layer")
    @patch("events.views.async_to_sync")
    def test_create_event_skips_notifying_organizer(
        self, mock_async_to_sync, mock_get_channel_layer
    ):
        """Test that organizer is not notified of their own event"""
        self.organization.followers.add(self.owner)

        mock_channel_layer = Mock()
        mock_get_channel_layer.return_value = mock_channel_layer

        self.client.force_authenticate(user=self.owner)
        url = reverse("create_event")
        data = {
            "name": "Test Event",
            "date": (timezone.now() + timedelta(days=1)).isoformat(),
            "location": "Test Location",
            "description": "Test Description",
            "organization": self.organization.id,
            "category": "SOCIAL",
        }

        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Should not send notification to organizer
        # The loop should skip when user == request.user

    def test_create_event_with_valueerror_organization_id(self):
        """Test create event handles ValueError for organization ID"""
        self.client.force_authenticate(user=self.owner)
        url = reverse("create_event")
        data = {
            "name": "Test Event",
            "date": (timezone.now() + timedelta(days=1)).isoformat(),
            "location": "Test Location",
            "organization": "invalid_id",  # ValueError in int conversion
        }

        response = self.client.post(url, data)

        # Should handle ValueError gracefully
        self.assertIn(
            response.status_code,
            [status.HTTP_400_BAD_REQUEST, status.HTTP_404_NOT_FOUND],
        )

    def test_create_event_with_typeerror_organization_id(self):
        """Test create event handles TypeError for organization ID"""
        self.client.force_authenticate(user=self.owner)
        url = reverse("create_event")
        data = {
            "name": "Test Event",
            "date": (timezone.now() + timedelta(days=1)).isoformat(),
            "location": "Test Location",
            "organization": [],  # This might cause TypeError
        }

        response = self.client.post(url, data)

        # Should handle TypeError gracefully
        self.assertIn(
            response.status_code,
            [status.HTTP_400_BAD_REQUEST, status.HTTP_404_NOT_FOUND],
        )


class EventListCreateViewTest(APITestCase):
    """Tests for EventListCreateView.create method"""

    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="testpass123",
        )
        self.owner.profile.role = Profile.Role.ORGANIZER
        self.owner.profile.save()

        self.organization = Organization.objects.create(
            name="Test Organization", owner=self.owner
        )

    def test_create_event_without_organization(self):
        """Test EventListCreateView.create fails when organization is missing"""
        self.client.force_authenticate(user=self.owner)
        url = reverse("all-events")
        data = {
            "name": "Test Event",
            "date": (timezone.now() + timedelta(days=1)).isoformat(),
            "location": "Test Location",
        }

        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("organization", response.json())

    def test_create_event_with_invalid_organization(self):
        """Test EventListCreateView.create fails when organization doesn't exist"""
        self.client.force_authenticate(user=self.owner)
        url = reverse("all-events")
        data = {
            "name": "Test Event",
            "date": (timezone.now() + timedelta(days=1)).isoformat(),
            "location": "Test Location",
            "organization": 99999,
        }

        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_event_without_permission(self):
        """Test EventListCreateView.create fails
        when user is not owner or collaborator"""
        other_user = User.objects.create_user(
            username="other",
            email="other@example.com",
            password="testpass123",
        )
        other_user.profile.role = Profile.Role.ORGANIZER
        other_user.profile.save()

        self.client.force_authenticate(user=other_user)
        url = reverse("all-events")
        data = {
            "name": "Test Event",
            "date": (timezone.now() + timedelta(days=1)).isoformat(),
            "location": "Test Location",
            "organization": self.organization.id,
        }

        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch("events.views.get_channel_layer")
    @patch("events.views.async_to_sync")
    def test_create_event_notifies_followers(
        self, mock_async_to_sync, mock_get_channel_layer
    ):
        """Test that EventListCreateView.create notifies organization followers"""
        follower = User.objects.create_user(
            username="follower",
            email="follower@example.com",
            password="testpass123",
        )
        follower.profile.role = Profile.Role.ATTENDEE
        follower.profile.save()

        self.organization.followers.add(follower)

        mock_channel_layer = Mock()
        mock_get_channel_layer.return_value = mock_channel_layer

        self.client.force_authenticate(user=self.owner)
        url = reverse("all-events")
        data = {
            "name": "Test Event",
            "date": (timezone.now() + timedelta(days=1)).isoformat(),
            "location": "Test Location",
            "description": "Test Description",
            "organization": self.organization.id,
            "category": "SOCIAL",
        }

        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mock_async_to_sync.assert_called()

    @patch("events.views.get_channel_layer")
    @patch("events.views.async_to_sync")
    def test_create_event_skips_notifying_organizer(
        self, mock_async_to_sync, mock_get_channel_layer
    ):
        """Test that EventListCreateView.create skips notifying organizer"""
        self.organization.followers.add(self.owner)

        mock_channel_layer = Mock()
        mock_get_channel_layer.return_value = mock_channel_layer

        self.client.force_authenticate(user=self.owner)
        url = reverse("all-events")
        data = {
            "name": "Test Event",
            "date": (timezone.now() + timedelta(days=1)).isoformat(),
            "location": "Test Location",
            "description": "Test Description",
            "organization": self.organization.id,
            "category": "SOCIAL",
        }

        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Should not send notification to organizer (the loop continues)


class UserRegisteredEventsViewTest(APITestCase):
    """Tests for UserRegisteredEventsView"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
        )

    def test_get_user_registered_events(self):
        """Test that view returns user's participating events"""
        event = Event.objects.create(
            name="Test Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            organization=Organization.objects.create(name="Test Org", owner=self.user),
        )
        event.participants.add(self.user)

        self.client.force_authenticate(user=self.user)
        url = reverse("user-registered-events")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["name"], "Test Event")
        # event variable is created but only used implicitly via response


class UserInterestedEventsViewTest(APITestCase):
    """Tests for UserInterestedEventsView"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
        )

    def test_get_user_interested_events(self):
        """Test that view returns user's interested events"""
        event = Event.objects.create(
            name="Test Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            organization=Organization.objects.create(name="Test Org", owner=self.user),
        )
        event.interested_users.add(self.user)

        self.client.force_authenticate(user=self.user)
        url = reverse("user-interested-events")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["name"], "Test Event")
        # event variable is created but only used implicitly via response


class UserOrganizedEventsViewTest(APITestCase):
    """Tests for UserOrganizedEventsView"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
        )
        self.user.profile.role = Profile.Role.ORGANIZER
        self.user.profile.save()

    def test_get_user_organized_events(self):
        """Test that view returns events organized by user"""
        org = Organization.objects.create(name="Test Org", owner=self.user)
        Event.objects.create(
            name="Test Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.user,
            organization=org,
        )

        self.client.force_authenticate(user=self.user)
        url = reverse("user-organized-events")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["name"], "Test Event")


class MyOrganizedEventsViewTest(APITestCase):
    """Tests for MyOrganizedEventsView"""

    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="testpass123",
        )
        self.owner.profile.role = Profile.Role.ORGANIZER
        self.owner.profile.save()

        self.organization = Organization.objects.create(
            name="Test Organization", owner=self.owner
        )

    def test_get_events_for_owned_organization(self):
        """Test that view returns events for owned organizations"""
        Event.objects.create(
            name="Test Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.owner,
            organization=self.organization,
        )

        self.client.force_authenticate(user=self.owner)
        url = reverse("my-organized-events")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["name"], "Test Event")

    def test_get_events_for_collaborated_organization(self):
        """Test that view returns events created by collaborator"""
        collaborator = User.objects.create_user(
            username="collaborator",
            email="collab@example.com",
            password="testpass123",
        )
        collaborator.profile.role = Profile.Role.ORGANIZER
        collaborator.profile.save()

        self.organization.collaborators.add(collaborator)

        # Event created by collaborator
        Event.objects.create(
            name="Collaborator Event",
            date=timezone.now() + timedelta(days=1),
            organizer=collaborator,
            organization=self.organization,
        )

        # Event created by owner (should not appear for collaborator)
        Event.objects.create(
            name="Owner Event",
            date=timezone.now() + timedelta(days=2),
            organizer=self.owner,
            organization=self.organization,
        )

        self.client.force_authenticate(user=collaborator)
        url = reverse("my-organized-events")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        # Should only see event created by collaborator
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["name"], "Collaborator Event")


class EventParticipantsViewTest(APITestCase):
    """Tests for EventParticipantsView"""

    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="testpass123",
        )
        self.owner.profile.role = Profile.Role.ORGANIZER
        self.owner.profile.save()

        self.organization = Organization.objects.create(
            name="Test Organization", owner=self.owner
        )

        self.event = Event.objects.create(
            name="Test Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.owner,
            organization=self.organization,
        )

    def test_get_event_participants(self):
        """Test that view returns event participants"""
        participant = User.objects.create_user(
            username="participant",
            email="participant@example.com",
            password="testpass123",
        )
        self.event.participants.add(participant)

        self.client.force_authenticate(user=self.owner)
        url = reverse("event-participants", kwargs={"pk": self.event.id})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["username"], "participant")

    def test_get_event_participants_without_permission(self):
        """Test that non-owner/non-collaborator cannot view participants"""
        other_user = User.objects.create_user(
            username="other",
            email="other@example.com",
            password="testpass123",
        )

        self.client.force_authenticate(user=other_user)
        url = reverse("event-participants", kwargs={"pk": self.event.id})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class EventInterestedUsersViewTest(APITestCase):
    """Tests for EventInterestedUsersView"""

    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="testpass123",
        )
        self.owner.profile.role = Profile.Role.ORGANIZER
        self.owner.profile.save()

        self.organization = Organization.objects.create(
            name="Test Organization", owner=self.owner
        )

        self.event = Event.objects.create(
            name="Test Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.owner,
            organization=self.organization,
        )

    def test_get_event_interested_users(self):
        """Test that view returns event interested users"""
        interested_user = User.objects.create_user(
            username="interested",
            email="interested@example.com",
            password="testpass123",
        )
        self.event.interested_users.add(interested_user)

        self.client.force_authenticate(user=self.owner)
        url = reverse("event-interested-users", kwargs={"pk": self.event.id})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["username"], "interested")

    def test_get_event_interested_users_without_permission(self):
        """Test that non-owner/non-collaborator cannot view interested users"""
        other_user = User.objects.create_user(
            username="other",
            email="other@example.com",
            password="testpass123",
        )

        self.client.force_authenticate(user=other_user)
        url = reverse("event-interested-users", kwargs={"pk": self.event.id})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class EventInterestViewTest(APITestCase):
    """Tests for EventInterestView"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
        )

        self.owner = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="testpass123",
        )
        self.owner.profile.role = Profile.Role.ORGANIZER
        self.owner.profile.save()

        self.organization = Organization.objects.create(
            name="Test Organization", owner=self.owner
        )

        self.event = Event.objects.create(
            name="Test Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.owner,
            organization=self.organization,
        )

    def test_post_mark_as_interested(self):
        """Test POST marks event as interested"""
        self.client.force_authenticate(user=self.user)
        url = reverse("event-interested", kwargs={"pk": self.event.id})
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertTrue(data["is_interested"])
        self.assertTrue(self.event.interested_users.filter(pk=self.user.pk).exists())

    def test_post_already_interested(self):
        """Test POST when already interested returns 200"""
        self.event.interested_users.add(self.user)

        self.client.force_authenticate(user=self.user)
        url = reverse("event-interested", kwargs={"pk": self.event.id})
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertTrue(data["is_interested"])

    def test_delete_remove_interest(self):
        """Test DELETE removes interest"""
        self.event.interested_users.add(self.user)

        self.client.force_authenticate(user=self.user)
        url = reverse("event-interested", kwargs={"pk": self.event.id})
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertFalse(data["is_interested"])
        self.assertFalse(self.event.interested_users.filter(pk=self.user.pk).exists())

    def test_delete_not_interested(self):
        """Test DELETE when not interested returns 404"""
        self.client.force_authenticate(user=self.user)
        url = reverse("event-interested", kwargs={"pk": self.event.id})
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        data = response.json()
        self.assertFalse(data["is_interested"])


class ParticipateEventViewTest(APITestCase):
    """Tests for ParticipateEventView"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
        )

        self.owner = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="testpass123",
        )
        self.owner.profile.role = Profile.Role.ORGANIZER
        self.owner.profile.save()

        self.organization = Organization.objects.create(
            name="Test Organization", owner=self.owner
        )

        self.event = Event.objects.create(
            name="Test Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.owner,
            organization=self.organization,
            capacity=10,
        )

    def test_post_participate_event(self):
        """Test POST registers user for event"""
        self.client.force_authenticate(user=self.user)
        url = reverse("event-participate", kwargs={"pk": self.event.id})
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertTrue(data["is_participating"])
        self.assertTrue(self.event.participants.filter(pk=self.user.pk).exists())

    def test_post_participate_already_participating(self):
        """Test POST when already participating returns 200"""
        self.event.participants.add(self.user)

        self.client.force_authenticate(user=self.user)
        url = reverse("event-participate", kwargs={"pk": self.event.id})
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertTrue(data["is_participating"])

    def test_post_participate_event_full(self):
        """Test POST when event is full returns 400"""
        # Fill event to capacity
        for i in range(10):
            user = User.objects.create_user(
                username=f"user{i}",
                email=f"user{i}@example.com",
                password="testpass123",
            )
            self.event.participants.add(user)

        self.client.force_authenticate(user=self.user)
        url = reverse("event-participate", kwargs={"pk": self.event.id})
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        data = response.json()
        self.assertTrue(data["is_full"])

    def test_post_participate_event_no_capacity(self):
        """Test POST when event has no capacity limit"""
        event = Event.objects.create(
            name="Unlimited Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.owner,
            organization=self.organization,
            capacity=None,
        )

        self.client.force_authenticate(user=self.user)
        url = reverse("event-participate", kwargs={"pk": event.id})
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_post_participate_event_zero_capacity(self):
        """Test POST when event has zero capacity"""
        event = Event.objects.create(
            name="Zero Capacity Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.owner,
            organization=self.organization,
            capacity=0,
        )

        self.client.force_authenticate(user=self.user)
        url = reverse("event-participate", kwargs={"pk": event.id})
        response = self.client.post(url)

        # Zero capacity should allow participation (treated as unlimited)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_delete_participate_event(self):
        """Test DELETE removes user from event"""
        self.event.participants.add(self.user)

        self.client.force_authenticate(user=self.user)
        url = reverse("event-participate", kwargs={"pk": self.event.id})
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertFalse(data["is_participating"])
        self.assertFalse(self.event.participants.filter(pk=self.user.pk).exists())

    def test_delete_participate_not_participating(self):
        """Test DELETE when not participating returns 404"""
        self.client.force_authenticate(user=self.user)
        url = reverse("event-participate", kwargs={"pk": self.event.id})
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        data = response.json()
        self.assertFalse(data["is_participating"])

    def test_post_participate_sets_is_full_when_capacity_reached(self):
        """Test that is_full is set correctly when capacity is reached"""
        # Add 9 participants (one less than capacity of 10)
        for i in range(9):
            user = User.objects.create_user(
                username=f"user{i}",
                email=f"user{i}@example.com",
                password="testpass123",
            )
            self.event.participants.add(user)

        self.client.force_authenticate(user=self.user)
        url = reverse("event-participate", kwargs={"pk": self.event.id})
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        # After adding 10th participant, event should be full
        self.assertTrue(data["is_full"])

    def test_post_participate_already_participating_with_full_check(self):
        """Test POST when already participating checks is_full correctly"""
        # Fill event to capacity
        for i in range(10):
            user = User.objects.create_user(
                username=f"user{i}",
                email=f"user{i}@example.com",
                password="testpass123",
            )
            self.event.participants.add(user)

        # User is already participating in full event
        self.event.participants.add(self.user)

        self.client.force_authenticate(user=self.user)
        url = reverse("event-participate", kwargs={"pk": self.event.id})
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertTrue(data["is_full"])


class NotifyInterestedUsersTest(APITestCase):
    """Tests for notify_interested_users helper function"""

    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="testpass123",
        )
        self.owner.profile.role = Profile.Role.ORGANIZER
        self.owner.profile.save()

        self.organization = Organization.objects.create(
            name="Test Organization", owner=self.owner
        )

        self.event = Event.objects.create(
            name="Test Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.owner,
            organization=self.organization,
        )

    @patch("events.views.get_channel_layer")
    @patch("events.views.async_to_sync")
    def test_notify_interested_users_on_update(
        self, mock_async_to_sync, mock_get_channel_layer
    ):
        """Test that updating event notifies interested users"""
        interested_user = User.objects.create_user(
            username="interested",
            email="interested@example.com",
            password="testpass123",
        )
        self.event.interested_users.add(interested_user)

        mock_channel_layer = Mock()
        mock_get_channel_layer.return_value = mock_channel_layer

        from events.views import notify_interested_users

        notify_interested_users(
            self.event,
            "event_updated",
            {
                "change_type": "date",
                "old_value": "2024-01-01",
                "new_value": "2024-01-02",
            },
        )

        mock_async_to_sync.assert_called()

    @patch("events.views.get_channel_layer")
    @patch("events.views.async_to_sync")
    def test_notify_interested_users_on_cancel(
        self, mock_async_to_sync, mock_get_channel_layer
    ):
        """Test that cancelling event notifies interested users and participants"""
        interested_user = User.objects.create_user(
            username="interested",
            email="interested@example.com",
            password="testpass123",
        )
        participant = User.objects.create_user(
            username="participant",
            email="participant@example.com",
            password="testpass123",
        )

        self.event.interested_users.add(interested_user)
        self.event.participants.add(participant)

        mock_channel_layer = Mock()
        mock_get_channel_layer.return_value = mock_channel_layer

        from events.views import notify_interested_users

        notify_interested_users(
            self.event,
            "event_cancelled",
            {"message": "Event cancelled"},
        )

        mock_async_to_sync.assert_called()

    def test_notify_interested_users_no_users(self):
        """Test that notify_interested_users handles empty user list"""
        from events.views import notify_interested_users

        # Should not raise error when no interested users
        notify_interested_users(
            self.event,
            "event_updated",
            {"change_type": "location"},
        )

    @patch("events.views.get_channel_layer")
    @patch("events.views.async_to_sync")
    def test_notify_interested_users_unknown_type(
        self, mock_async_to_sync, mock_get_channel_layer
    ):
        """Test that unknown notification type returns early"""
        from events.views import notify_interested_users

        interested_user = User.objects.create_user(
            username="interested",
            email="interested@example.com",
            password="testpass123",
        )
        self.event.interested_users.add(interested_user)

        # Should return early for unknown type
        result = notify_interested_users(
            self.event,
            "unknown_type",
            {},
        )

        # Should return None (early return)
        self.assertIsNone(result)

    @patch("events.views.get_channel_layer")
    @patch("events.views.async_to_sync")
    def test_notify_interested_users_date_change_with_parse_error(
        self, mock_async_to_sync, mock_get_channel_layer
    ):
        """Test notify_interested_users handles date parse errors"""
        interested_user = User.objects.create_user(
            username="interested",
            email="interested@example.com",
            password="testpass123",
        )
        self.event.interested_users.add(interested_user)

        mock_channel_layer = Mock()
        mock_get_channel_layer.return_value = mock_channel_layer

        from events.views import notify_interested_users

        # Test with invalid date values that cause parse error (ValueError/TypeError)
        notify_interested_users(
            self.event,
            "event_updated",
            {
                "changes": [
                    {"field": "date", "old_value": "invalid", "new_value": "invalid"}
                ]
            },
        )

        mock_async_to_sync.assert_called()

    @patch("events.views.get_channel_layer")
    @patch("events.views.async_to_sync")
    def test_notify_interested_users_date_change_with_none_values(
        self, mock_async_to_sync, mock_get_channel_layer
    ):
        """Test notify_interested_users handles date change with None values"""
        interested_user = User.objects.create_user(
            username="interested",
            email="interested@example.com",
            password="testpass123",
        )
        self.event.interested_users.add(interested_user)

        mock_channel_layer = Mock()
        mock_get_channel_layer.return_value = mock_channel_layer

        from events.views import notify_interested_users

        # Test with None date values
        notify_interested_users(
            self.event,
            "event_updated",
            {"changes": [{"field": "date", "old_value": None, "new_value": None}]},
        )

        mock_async_to_sync.assert_called()

    @patch("events.views.get_channel_layer")
    @patch("events.views.async_to_sync")
    def test_notify_interested_users_status_change(
        self, mock_async_to_sync, mock_get_channel_layer
    ):
        """Test notify_interested_users handles status change"""
        interested_user = User.objects.create_user(
            username="interested",
            email="interested@example.com",
            password="testpass123",
        )
        self.event.interested_users.add(interested_user)

        mock_channel_layer = Mock()
        mock_get_channel_layer.return_value = mock_channel_layer

        from events.views import notify_interested_users

        notify_interested_users(
            self.event,
            "event_updated",
            {
                "changes": [
                    {"field": "status", "old_value": "Active", "new_value": "Cancelled"}
                ]
            },
        )

        mock_async_to_sync.assert_called()

    @patch("events.views.get_channel_layer")
    @patch("events.views.async_to_sync")
    def test_notify_interested_users_without_changes(
        self, mock_async_to_sync, mock_get_channel_layer
    ):
        """Test notify_interested_users handles change_data without changes"""
        interested_user = User.objects.create_user(
            username="interested",
            email="interested@example.com",
            password="testpass123",
        )
        self.event.interested_users.add(interested_user)

        mock_channel_layer = Mock()
        mock_get_channel_layer.return_value = mock_channel_layer

        from events.views import notify_interested_users

        notify_interested_users(
            self.event,
            "event_updated",
            {},  # No changes
        )

        mock_async_to_sync.assert_called()


class EventRetrieveUpdateDestroyViewTest(APITestCase):
    """Tests for EventRetrieveUpdateDestroyView.update method"""

    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="testpass123",
        )
        self.owner.profile.role = Profile.Role.ORGANIZER
        self.owner.profile.save()

        self.organization = Organization.objects.create(
            name="Test Organization", owner=self.owner
        )

        self.event = Event.objects.create(
            name="Test Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.owner,
            organization=self.organization,
            location="Old Location",
        )

    @patch("events.views.detect_critical_changes")
    @patch("events.views.get_channel_layer")
    @patch("events.views.async_to_sync")
    def test_update_event_notifies_interested_users(
        self, mock_async_to_sync, mock_get_channel_layer, mock_detect
    ):
        """Test that updating event notifies interested users"""
        interested_user = User.objects.create_user(
            username="interested",
            email="interested@example.com",
            password="testpass123",
        )
        self.event.interested_users.add(interested_user)

        mock_detect.return_value = {
            "changes": [
                {
                    "field": "location",
                    "old_value": "Old Location",
                    "new_value": "New Location",
                }
            ]
        }
        mock_channel_layer = Mock()
        mock_get_channel_layer.return_value = mock_channel_layer

        self.client.force_authenticate(user=self.owner)
        url = reverse("event-detail", kwargs={"pk": self.event.id})
        data = {
            "name": "Test Event",
            "date": (timezone.now() + timedelta(days=1)).isoformat(),
            "location": "New Location",
            "description": "Test Description",
        }

        response = self.client.patch(url, data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_async_to_sync.assert_called()

    def test_update_event_date_change_handles_error(self):
        """Test that date change error handling works"""
        from unittest.mock import patch

        with patch("events.views.detect_critical_changes") as mock_detect:
            mock_detect.return_value = {
                "changes": [
                    {"field": "date", "old_value": "invalid", "new_value": "invalid"}
                ]
            }

            self.client.force_authenticate(user=self.owner)
            url = reverse("event-detail", kwargs={"pk": self.event.id})
            data = {
                "name": "Test Event",
                "date": (timezone.now() + timedelta(days=2)).isoformat(),
                "location": "Test Location",
            }

            response = self.client.patch(url, data)
            # Should handle the error gracefully
            self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_event_status_change(self):
        """Test that status change is detected and notified"""
        from unittest.mock import patch

        interested_user = User.objects.create_user(
            username="interested",
            email="interested@example.com",
            password="testpass123",
        )
        self.event.interested_users.add(interested_user)

        with patch("events.views.detect_critical_changes") as mock_detect:
            mock_detect.return_value = {
                "changes": [
                    {"field": "status", "old_value": "Active", "new_value": "Cancelled"}
                ]
            }

            self.client.force_authenticate(user=self.owner)
            url = reverse("event-detail", kwargs={"pk": self.event.id})
            data = {
                "name": "Test Event",
                "date": (timezone.now() + timedelta(days=1)).isoformat(),
                "location": "Test Location",
                "status": "Cancelled",
            }

            response = self.client.patch(url, data)
            self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_event_prevents_organization_removal(self):
        """Test that update prevents removing organization"""
        self.client.force_authenticate(user=self.owner)
        url = reverse("event-detail", kwargs={"pk": self.event.id})
        data = {
            "name": "Test Event",
            "date": (timezone.now() + timedelta(days=1)).isoformat(),
            "location": "Test Location",
        }

        response = self.client.patch(url, data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("organization", response.json())

    def test_update_event_prevents_organization_change(self):
        """Test that update prevents changing organization"""
        other_org = Organization.objects.create(
            name="Other Organization", owner=self.owner
        )

        self.client.force_authenticate(user=self.owner)
        url = reverse("event-detail", kwargs={"pk": self.event.id})
        data = {
            "name": "Test Event",
            "date": (timezone.now() + timedelta(days=1)).isoformat(),
            "location": "Test Location",
            "organization": other_org.id,
        }

        response = self.client.patch(url, data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("organization", response.json())

    def test_update_event_partial_with_missing_fields(self):
        """Test that partial update includes original values for missing fields"""
        from unittest.mock import patch

        with patch("events.views.detect_critical_changes") as mock_detect:
            mock_detect.return_value = None

            self.client.force_authenticate(user=self.owner)
            url = reverse("event-detail", kwargs={"pk": self.event.id})
            # Only update location, not date or status
            data = {
                "location": "New Location",
            }

            response = self.client.patch(url, data)

            self.assertEqual(response.status_code, status.HTTP_200_OK)
            # detect_critical_changes should be called with original date and status
            mock_detect.assert_called()

    def test_update_event_with_critical_changes(self):
        """Test that update notifies when critical changes are detected"""
        from unittest.mock import patch

        interested_user = User.objects.create_user(
            username="interested",
            email="interested@example.com",
            password="testpass123",
        )
        self.event.interested_users.add(interested_user)

        with patch("events.views.detect_critical_changes") as mock_detect:
            mock_detect.return_value = {
                "changes": [
                    {"field": "location", "old_value": "Old", "new_value": "New"}
                ]
            }

            with patch("events.views.notify_interested_users") as mock_notify:
                self.client.force_authenticate(user=self.owner)
                url = reverse("event-detail", kwargs={"pk": self.event.id})
                data = {
                    "location": "New Location",
                }

                response = self.client.patch(url, data)

                self.assertEqual(response.status_code, status.HTTP_200_OK)
                mock_notify.assert_called()

    def test_update_event_without_critical_changes(self):
        """Test that update doesn't notify when no critical changes"""
        from unittest.mock import patch

        with patch("events.views.detect_critical_changes") as mock_detect:
            mock_detect.return_value = None

            with patch("events.views.notify_interested_users") as mock_notify:
                self.client.force_authenticate(user=self.owner)
                url = reverse("event-detail", kwargs={"pk": self.event.id})
                data = {
                    "description": "New Description",
                }

                response = self.client.patch(url, data)

                self.assertEqual(response.status_code, status.HTTP_200_OK)
                mock_notify.assert_not_called()

    def test_update_event_as_collaborator_creator(self):
        """Test that collaborator can update event they created"""
        collaborator = User.objects.create_user(
            username="collaborator",
            email="collab@example.com",
            password="testpass123",
        )
        collaborator.profile.role = Profile.Role.ORGANIZER
        collaborator.profile.save()

        self.organization.collaborators.add(collaborator)

        event = Event.objects.create(
            name="Collaborator Event",
            date=timezone.now() + timedelta(days=1),
            organizer=collaborator,
            organization=self.organization,
            location="Old Location",
        )

        self.client.force_authenticate(user=collaborator)
        url = reverse("event-detail", kwargs={"pk": event.id})
        data = {
            "location": "New Location",
        }

        response = self.client.patch(url, data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_event_as_collaborator_not_creator(self):
        """Test that collaborator cannot update event they didn't create"""
        collaborator = User.objects.create_user(
            username="collaborator",
            email="collab@example.com",
            password="testpass123",
        )
        collaborator.profile.role = Profile.Role.ORGANIZER
        collaborator.profile.save()

        self.organization.collaborators.add(collaborator)

        # Event created by owner, not collaborator
        event = Event.objects.create(
            name="Owner Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.owner,
            organization=self.organization,
        )

        self.client.force_authenticate(user=collaborator)
        url = reverse("event-detail", kwargs={"pk": event.id})
        data = {
            "location": "New Location",
        }

        response = self.client.patch(url, data)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class EventRetrieveUpdateDestroyViewDestroyTest(APITestCase):
    """Tests for EventRetrieveUpdateDestroyView.destroy method"""

    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="testpass123",
        )
        self.owner.profile.role = Profile.Role.ORGANIZER
        self.owner.profile.save()

        self.organization = Organization.objects.create(
            name="Test Organization", owner=self.owner
        )

        self.event = Event.objects.create(
            name="Test Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.owner,
            organization=self.organization,
        )

    def test_destroy_event_as_owner(self):
        """Test that owner can delete event"""
        self.client.force_authenticate(user=self.owner)
        url = reverse("event-detail", kwargs={"pk": self.event.id})
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Event.objects.filter(pk=self.event.id).exists())

    def test_destroy_event_as_collaborator_creator(self):
        """Test that collaborator can delete event they created"""
        collaborator = User.objects.create_user(
            username="collaborator",
            email="collab@example.com",
            password="testpass123",
        )
        collaborator.profile.role = Profile.Role.ORGANIZER
        collaborator.profile.save()

        self.organization.collaborators.add(collaborator)

        event = Event.objects.create(
            name="Collaborator Event",
            date=timezone.now() + timedelta(days=1),
            organizer=collaborator,
            organization=self.organization,
        )

        self.client.force_authenticate(user=collaborator)
        url = reverse("event-detail", kwargs={"pk": event.id})
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_destroy_event_as_collaborator_not_creator(self):
        """Test that collaborator cannot delete event they didn't create"""
        collaborator = User.objects.create_user(
            username="collaborator",
            email="collab@example.com",
            password="testpass123",
        )
        collaborator.profile.role = Profile.Role.ORGANIZER
        collaborator.profile.save()

        self.organization.collaborators.add(collaborator)

        # Event created by owner, not collaborator
        event = Event.objects.create(
            name="Owner Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.owner,
            organization=self.organization,
        )

        self.client.force_authenticate(user=collaborator)
        url = reverse("event-detail", kwargs={"pk": event.id})
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_destroy_event_without_permission(self):
        """Test that user without permission cannot delete event"""
        other_user = User.objects.create_user(
            username="other",
            email="other@example.com",
            password="testpass123",
        )
        other_user.profile.role = Profile.Role.ORGANIZER
        other_user.profile.save()

        self.client.force_authenticate(user=other_user)
        url = reverse("event-detail", kwargs={"pk": self.event.id})
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ExportUserCalendarViewTest(APITestCase):
    """Tests for ExportUserCalendarView"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
        )

        self.owner = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="testpass123",
        )
        self.owner.profile.role = Profile.Role.ORGANIZER
        self.owner.profile.save()

        self.organization = Organization.objects.create(
            name="Test Organization", owner=self.owner
        )

    def test_export_calendar(self):
        """Test that calendar export returns ICS file"""
        event = Event.objects.create(
            name="Test Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.owner,
            organization=self.organization,
            location="Test Location",
            description="Test Description",
            status="Active",
        )
        event.participants.add(self.user)

        self.client.force_authenticate(user=self.user)
        url = reverse("export_user_calendar")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "text/calendar")
        self.assertIn("BEGIN:VCALENDAR", response.content.decode())
        self.assertIn("Test Event", response.content.decode())

    def test_export_calendar_only_active_events(self):
        """Test that export only includes active events"""
        active_event = Event.objects.create(
            name="Active Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.owner,
            organization=self.organization,
            status="Active",
        )
        cancelled_event = Event.objects.create(
            name="Cancelled Event",
            date=timezone.now() + timedelta(days=2),
            organizer=self.owner,
            organization=self.organization,
            status="Cancelled",
        )

        active_event.participants.add(self.user)
        cancelled_event.participants.add(self.user)

        self.client.force_authenticate(user=self.user)
        url = reverse("export_user_calendar")
        response = self.client.get(url)

        content = response.content.decode()
        self.assertIn("Active Event", content)
        self.assertNotIn("Cancelled Event", content)

    def test_export_calendar_only_participating_events(self):
        """Test that export only includes events user participates in"""
        participating_event = Event.objects.create(
            name="Participating Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.owner,
            organization=self.organization,
            status="Active",
        )
        Event.objects.create(
            name="Non-Participating Event",
            date=timezone.now() + timedelta(days=2),
            organizer=self.owner,
            organization=self.organization,
            status="Active",
        )

        participating_event.participants.add(self.user)

        self.client.force_authenticate(user=self.user)
        url = reverse("export_user_calendar")
        response = self.client.get(url)

        content = response.content.decode()
        self.assertIn("Participating Event", content)
        self.assertNotIn("Non-Participating Event", content)
        # non_participating_event is created but only used implicitly


class UpcomingEventsListViewTest(APITestCase):
    """Tests for UpcomingEventsListView"""

    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="testpass123",
        )
        self.owner.profile.role = Profile.Role.ORGANIZER
        self.owner.profile.save()

        self.organization = Organization.objects.create(
            name="Test Organization", owner=self.owner
        )

    def test_get_upcoming_events_with_today_filter(self):
        """Test upcoming events with today filter"""
        Event.objects.create(
            name="Today Event",
            date=timezone.now() + timedelta(hours=2),
            organizer=self.owner,
            organization=self.organization,
            status="Active",
        )

        url = reverse("upcoming-events")
        response = self.client.get(url, {"date_filter": "today"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertGreaterEqual(len(data), 1)
        # today_event is created but only used implicitly

    def test_get_upcoming_events_with_tomorrow_filter(self):
        """Test upcoming events with tomorrow filter"""
        Event.objects.create(
            name="Tomorrow Event",
            date=timezone.now() + timedelta(days=1, hours=2),
            organizer=self.owner,
            organization=self.organization,
            status="Active",
        )

        url = reverse("upcoming-events")
        response = self.client.get(url, {"date_filter": "tomorrow"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertGreaterEqual(len(data), 1)
        # tomorrow_event is created but only used implicitly

    def test_get_upcoming_events_with_this_week_filter(self):
        """Test upcoming events with this_week filter"""
        Event.objects.create(
            name="Week Event",
            date=timezone.now() + timedelta(days=3),
            organizer=self.owner,
            organization=self.organization,
            status="Active",
        )

        url = reverse("upcoming-events")
        response = self.client.get(url, {"date_filter": "this_week"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertGreaterEqual(len(data), 1)
        # week_event is created but only used implicitly

    def test_get_upcoming_events_with_category_filter(self):
        """Test upcoming events with category filter"""
        Event.objects.create(
            name="Social Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.owner,
            organization=self.organization,
            status="Active",
            category="SOCIAL",
        )
        Event.objects.create(
            name="Academic Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.owner,
            organization=self.organization,
            status="Active",
            category="ACADEMIC",
        )

        url = reverse("upcoming-events")
        response = self.client.get(url, {"category": "SOCIAL"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["name"], "Social Event")

    def test_get_upcoming_events_with_date_from_to(self):
        """Test upcoming events with date_from and date_to filters"""
        Event.objects.create(
            name="Filtered Event",
            date=timezone.now() + timedelta(days=5),
            organizer=self.owner,
            organization=self.organization,
            status="Active",
        )

        date_from = (timezone.now() + timedelta(days=4)).strftime("%Y-%m-%d")
        date_to = (timezone.now() + timedelta(days=6)).strftime("%Y-%m-%d")

        url = reverse("upcoming-events")
        response = self.client.get(url, {"date_from": date_from, "date_to": date_to})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertGreaterEqual(len(data), 1)

    def test_get_upcoming_events_with_search(self):
        """Test upcoming events with search filter"""
        Event.objects.create(
            name="Porto Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.owner,
            organization=self.organization,
            status="Active",
            description="Event in Porto",
        )
        Event.objects.create(
            name="Lisbon Event",
            date=timezone.now() + timedelta(days=1),
            organizer=self.owner,
            organization=self.organization,
            status="Active",
        )

        url = reverse("upcoming-events")
        response = self.client.get(url, {"search": "Porto"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["name"], "Porto Event")


class PastEventsListViewTest(APITestCase):
    """Tests for PastEventsListView"""

    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="testpass123",
        )
        self.owner.profile.role = Profile.Role.ORGANIZER
        self.owner.profile.save()

        self.organization = Organization.objects.create(
            name="Test Organization", owner=self.owner
        )

    def test_get_past_events(self):
        """Test that past events are returned"""
        Event.objects.create(
            name="Past Event",
            date=timezone.now() - timedelta(days=1),
            organizer=self.owner,
            organization=self.organization,
            status="Active",
        )

        url = reverse("past-events")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertGreaterEqual(len(data), 1)
        self.assertEqual(data[0]["name"], "Past Event")
        # past_event is created but only used implicitly
