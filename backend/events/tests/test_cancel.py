from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from events.models import Event

User = get_user_model()


class EventCancelUncancelTests(APITestCase):

    def setUp(self):
        # Create two users: organizer and student
        self.organizer = User.objects.create_user(
            username="org", email="org@test.com", password="pass123"
        )
        self.organizer.profile.role = "ORGANIZER"
        self.organizer.profile.save()

        self.other_user = User.objects.create_user(
            username="att", email="att@test.com", password="pass123"
        )
        self.other_user.profile.role = "ATTENDEE"
        self.other_user.profile.save()

        # Create an event owned by organizer
        self.event = Event.objects.create(
            name="Test Event",
            date="2030-01-01T12:00:00Z",
            location="Somewhere",
            description="Test Description",
            organizer=self.organizer,
            status="Active",
        )

        self.client = APIClient()

    def test_organizer_can_cancel_event(self):
        self.client.force_authenticate(user=self.organizer)

        url = reverse("event-cancel", args=[self.event.id])
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.event.refresh_from_db()
        self.assertEqual(self.event.status, "Canceled")

    def test_non_organizer_cannot_cancel_event(self):
        self.client.force_authenticate(user=self.other_user)

        url = reverse("event-cancel", args=[self.event.id])
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cancel_event_not_found(self):
        self.client.force_authenticate(user=self.organizer)

        url = reverse("event-cancel", args=[9999])  # non-existing event
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_organizer_can_uncancel_event(self):
        self.client.force_authenticate(user=self.organizer)

        # Step 1: Cancel the event
        cancel_url = reverse("event-cancel", args=[self.event.id])
        self.client.post(cancel_url)

        # Step 2: Uncancel the event
        uncancel_url = reverse("event-uncancel", args=[self.event.id])
        response = self.client.post(uncancel_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.event.refresh_from_db()
        self.assertEqual(self.event.status, "Active")

    def test_non_organizer_cannot_uncancel_event(self):
        self.client.force_authenticate(user=self.organizer)

        # cancel first
        cancel_url = reverse("event-cancel", args=[self.event.id])
        self.client.post(cancel_url)

        # now try uncancel as different user
        self.client.force_authenticate(user=self.other_user)
        uncancel_url = reverse("event-uncancel", args=[self.event.id])
        response = self.client.post(uncancel_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_uncancel_event_not_found(self):
        self.client.force_authenticate(user=self.organizer)

        url = reverse("event-uncancel", args=[9999])
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
