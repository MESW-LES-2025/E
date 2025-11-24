from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Organization, User
from events.models import Event


class EventParticipantsViewTest(APITestCase):
    """
    Tests for the EventParticipantsView endpoint.
    """

    def setUp(self):
        """Set up the necessary objects for testing."""
        # Create users with different roles
        self.owner = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="password123",
            first_name="Owner",
            last_name="User",
        )
        self.collaborator = User.objects.create_user(
            username="collaborator",
            email="collab@example.com",
            password="password123",
            first_name="Collab",
            last_name="Orator",
        )
        self.random_user = User.objects.create_user(
            username="random",
            email="random@example.com",
            password="password123",
            first_name="Random",
            last_name="User",
        )

        # Create participants to be added to the event
        self.participant1 = User.objects.create_user(
            username="participant1",
            email="p1@example.com",
            password="password123",
            first_name="Alice",
            last_name="Smith",
        )
        self.participant2 = User.objects.create_user(
            username="participant2",
            email="p2@example.com",
            password="password123",
            first_name="Bob",
            last_name="Johnson",
        )

        # Create an organization and add a collaborator
        self.organization = Organization.objects.create(
            name="Test Org", owner=self.owner
        )
        self.organization.collaborators.add(self.collaborator)

        # Create an event associated with the organization
        self.event = Event.objects.create(
            name="Test Event",
            organization=self.organization,
            organizer=self.owner,
            date="2025-12-25T10:00:00Z",
            category="SOCIAL",
        )

        # Add participants to the event
        self.event.participants.add(self.participant1, self.participant2)

        # URL for the endpoint
        self.url = reverse("event-participants", kwargs={"pk": self.event.pk})

    def test_unauthenticated_user_cannot_view_participants(self):
        """
        Ensure unauthenticated users receive a 401 Unauthorized error.
        """
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_organization_owner_can_view_participants(self):
        """
        Ensure the organization owner can successfully view the participant list.
        """
        self.client.force_authenticate(user=self.owner)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

        # Check for correct data and ordering (by first_name, last_name)
        self.assertEqual(response.data[0]["username"], "participant1")
        self.assertEqual(response.data[1]["username"], "participant2")

        expected_keys = ["username", "first_name", "last_name"]
        self.assertTrue(all(key in response.data[0] for key in expected_keys))

    def test_organization_collaborator_can_view_participants(self):
        """
        Ensure a collaborator of the organization can view the participant list.
        """
        self.client.force_authenticate(user=self.collaborator)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_unauthorized_user_cannot_view_participants(self):
        """
        Ensure a random authenticated user (not owner or collaborator)
        gets a 403 Forbidden error.
        """
        self.client.force_authenticate(user=self.random_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to view participants for this event.",
        )

    def test_get_participants_for_nonexistent_event(self):
        """
        Ensure a 404 Not Found is returned for an event that does not exist.
        """
        non_existent_url = reverse("event-participants", kwargs={"pk": 9999})
        self.client.force_authenticate(user=self.owner)
        response = self.client.get(non_existent_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_participants_for_event_with_no_participants(self):
        """
        Ensure an empty list is returned for an event with no participants.
        """
        empty_event = Event.objects.create(
            name="Empty Event",
            organization=self.organization,
            organizer=self.owner,
            date="2026-01-01T10:00:00Z",
            category="ACADEMIC",
        )
        empty_event_url = reverse("event-participants", kwargs={"pk": empty_event.pk})

        self.client.force_authenticate(user=self.owner)
        response = self.client.get(empty_event_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)
        self.assertEqual(response.data, [])
