from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Organization, Profile
from notifications.models import Notification

from ..models import Event
from ..utils import detect_critical_changes

User = get_user_model()


class EventChangeNotificationTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.organizer = User.objects.create_user(
            username="organizer", email="org@example.com", password="password123"
        )
        cls.organizer.profile.role = Profile.Role.ORGANIZER
        cls.organizer.profile.save()

        cls.interested_user1 = User.objects.create_user(
            username="interested1",
            email="int1@example.com",
            password="password123",
        )
        cls.interested_user2 = User.objects.create_user(
            username="interested2",
            email="int2@example.com",
            password="password123",
        )
        cls.participant_user = User.objects.create_user(
            username="participant",
            email="part@example.com",
            password="password123",
        )

        cls.organization = Organization.objects.create(
            name="Test Organization", owner=cls.organizer
        )

        cls.event = Event.objects.create(
            name="Test Event",
            date=timezone.now() + timedelta(days=7),
            location="Original Location",
            description="Test Description",
            category="SOCIAL",
            organizer=cls.organizer,
            organization=cls.organization,
        )

        # Mark users as interested
        cls.event.interested_users.add(cls.interested_user1, cls.interested_user2)
        # Mark one user as participant
        cls.event.participants.add(cls.participant_user)

    def setUp(self):
        self.client.force_authenticate(user=self.organizer)

    def test_detect_critical_changes_date(self):
        """Test that date changes are detected as critical"""
        new_data = {"date": timezone.now() + timedelta(days=14)}
        result = detect_critical_changes(self.event, new_data)
        self.assertIsNotNone(result)
        self.assertEqual(len(result["changes"]), 1)
        self.assertEqual(result["changes"][0]["field"], "date")

    def test_detect_critical_changes_location(self):
        """Test that location changes are detected as critical"""
        new_data = {"location": "New Location"}
        result = detect_critical_changes(self.event, new_data)
        self.assertIsNotNone(result)
        self.assertEqual(len(result["changes"]), 1)
        self.assertEqual(result["changes"][0]["field"], "location")

    def test_detect_critical_changes_status(self):
        """Test that status changes are detected as critical"""
        new_data = {"status": "Cancelled"}
        result = detect_critical_changes(self.event, new_data)
        self.assertIsNotNone(result)
        self.assertEqual(len(result["changes"]), 1)
        self.assertEqual(result["changes"][0]["field"], "status")

    def test_detect_non_critical_changes(self):
        """Test that non-critical changes don't trigger notifications"""
        new_data = {"description": "Updated Description"}
        result = detect_critical_changes(self.event, new_data)
        self.assertIsNone(result)

        new_data = {"name": "Updated Name"}
        result = detect_critical_changes(self.event, new_data)
        self.assertIsNone(result)

        new_data = {"category": "ACADEMIC"}
        result = detect_critical_changes(self.event, new_data)
        self.assertIsNone(result)

    def test_detect_multiple_critical_changes(self):
        """Test that multiple critical changes are detected"""
        new_data = {
            "date": timezone.now() + timedelta(days=14),
            "location": "New Location",
        }
        result = detect_critical_changes(self.event, new_data)
        self.assertIsNotNone(result)
        self.assertEqual(len(result["changes"]), 2)

    @patch("events.views.async_to_sync")
    @patch("events.views.get_channel_layer")
    def test_update_event_date_notifies_interested_users(
        self, mock_channel_layer, mock_async
    ):
        """Test that updating event date notifies interested users"""
        mock_channel_layer.return_value
        new_date = timezone.now() + timedelta(days=14)

        url = f"/api/events/{self.event.id}/"
        response = self.client.patch(url, {"date": new_date.isoformat()}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check that notifications were created
        notifications = Notification.objects.filter(
            user__in=[self.interested_user1, self.interested_user2]
        )
        self.assertEqual(notifications.count(), 2)

        # Check notification content
        for notification in notifications:
            self.assertIn("Event Updated", notification.title)
            self.assertIn(self.event.name, notification.message)

        # Check WebSocket messages were sent
        self.assertEqual(mock_async.call_count, 2)

    @patch("events.views.async_to_sync")
    @patch("events.views.get_channel_layer")
    def test_update_event_location_notifies_interested_users(
        self, mock_channel_layer, mock_async
    ):
        """Test that updating event location notifies interested users"""
        mock_channel_layer.return_value

        url = f"/api/events/{self.event.id}/"
        response = self.client.patch(url, {"location": "New Location"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check that notifications were created
        notifications = Notification.objects.filter(
            user__in=[self.interested_user1, self.interested_user2]
        )
        self.assertEqual(notifications.count(), 2)

    @patch("events.views.async_to_sync")
    @patch("events.views.get_channel_layer")
    def test_update_non_critical_field_no_notification(
        self, mock_channel_layer, mock_async
    ):
        """Test that updating non-critical fields doesn't send notifications"""
        mock_channel_layer.return_value

        url = f"/api/events/{self.event.id}/"
        response = self.client.patch(
            url, {"description": "Updated Description"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check that no notifications were created
        notifications = Notification.objects.filter(
            user__in=[self.interested_user1, self.interested_user2]
        )
        self.assertEqual(notifications.count(), 0)

        # Check WebSocket messages were not sent
        mock_async.assert_not_called()

    @patch("events.views.async_to_sync")
    @patch("events.views.get_channel_layer")
    def test_cancel_event_notifies_interested_and_participants(
        self, mock_channel_layer, mock_async
    ):
        """Test that cancelling event notifies both interested users and participants"""
        mock_channel_layer.return_value

        url = f"/api/events/{self.event.id}/cancel/"
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check that notifications were created for all users
        all_users = [
            self.interested_user1,
            self.interested_user2,
            self.participant_user,
        ]
        notifications = Notification.objects.filter(user__in=all_users)
        self.assertEqual(notifications.count(), 3)

        # Check notification content
        for notification in notifications:
            self.assertIn("Event Cancelled", notification.title)
            self.assertIn(self.event.name, notification.message)

        # Check WebSocket messages were sent
        self.assertEqual(mock_async.call_count, 3)

    @patch("events.views.async_to_sync")
    @patch("events.views.get_channel_layer")
    def test_update_same_value_no_notification(self, mock_channel_layer, mock_async):
        """Test that updating with same values doesn't trigger notifications"""
        mock_channel_layer.return_value

        url = f"/api/events/{self.event.id}/"
        # Update with same location
        response = self.client.patch(
            url, {"location": self.event.location}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check that no notifications were created
        notifications = Notification.objects.filter(
            user__in=[self.interested_user1, self.interested_user2]
        )
        self.assertEqual(notifications.count(), 0)

    def test_multiple_users_receive_notifications(self):
        """Test that multiple interested users all receive notifications"""
        # Create additional interested user
        new_user = User.objects.create_user(
            username="new_interested",
            email="new@example.com",
            password="password123",
        )
        self.event.interested_users.add(new_user)

        with patch("events.views.async_to_sync") as mock_async, patch(
            "events.views.get_channel_layer"
        ) as mock_channel_layer:
            mock_channel_layer.return_value
            new_date = timezone.now() + timedelta(days=14)

            url = f"/api/events/{self.event.id}/"
            response = self.client.patch(
                url, {"date": new_date.isoformat()}, format="json"
            )

            self.assertEqual(response.status_code, status.HTTP_200_OK)

            # Check that notifications were created for all 3 interested users
            notifications = Notification.objects.filter(
                user__in=[self.interested_user1, self.interested_user2, new_user]
            )
            self.assertEqual(notifications.count(), 3)

            # Check WebSocket messages were sent to all 3 users
            self.assertEqual(mock_async.call_count, 3)

    def test_notification_persistence(self):
        """Test that notifications are persisted in database"""
        with patch("events.views.async_to_sync"), patch(
            "events.views.get_channel_layer"
        ):
            new_date = timezone.now() + timedelta(days=14)

            url = f"/api/events/{self.event.id}/"
            response = self.client.patch(
                url, {"date": new_date.isoformat()}, format="json"
            )

            self.assertEqual(response.status_code, status.HTTP_200_OK)

            # Check notifications exist in database
            notification = Notification.objects.filter(
                user=self.interested_user1
            ).first()
            self.assertIsNotNone(notification)
            self.assertFalse(notification.is_read)  # Should be unread by default
            self.assertIn("Event Updated", notification.title)
            self.assertIn(self.event.name, notification.message)
