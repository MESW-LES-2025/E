from datetime import datetime, timedelta
from datetime import timezone as dt_timezone
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from accounts.models import Organization, Profile
from events.models import Event
from notifications.models import Notification

User = get_user_model()


class EventReminderCommandTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser", email="testuser@example.com", password="password"
        )
        self.user.profile.role = Profile.Role.ORGANIZER
        self.user.profile.save()

        self.organization = Organization.objects.create(
            name="Test Organization", owner=self.user
        )

        self.participant = User.objects.create_user(
            username="participant", email="participant@example.com", password="password"
        )

    @patch("notifications.management.commands.send_event_reminders.get_channel_layer")
    def test_24h_reminder_sent_exactly_once(self, mock_get_channel_layer):
        """Test that 24h reminder is sent once and flag is updated."""
        mock_channel_layer = MagicMock()
        mock_get_channel_layer.return_value = mock_channel_layer

        now = timezone.now()
        event_time = now + timedelta(hours=24, minutes=5)

        event = Event.objects.create(
            name="24h Event",
            date=event_time,
            organizer=self.user,
            organization=self.organization,
            reminder_24h_sent=False,
        )
        event.participants.add(self.participant)

        with patch(
            "notifications.management.commands.send_event_reminders.async_to_sync"
        ) as mock_async_to_sync:

            mock_sender = MagicMock()
            mock_async_to_sync.return_value = mock_sender

            call_command("send_event_reminders")

            # Verify called once
            self.assertEqual(mock_sender.call_count, 1)

            # Verify arguments
            args, _ = mock_sender.call_args
            self.assertEqual(args[0], f"notifications_{self.participant.id}")
            self.assertEqual(args[1]["type"], "send_notification")
            self.assertEqual(args[1]["message"]["time_left"], "24 hours")

            # Verify flag updated
            event.refresh_from_db()
            self.assertTrue(event.reminder_24h_sent)

            # Verify Notification created
            self.assertEqual(Notification.objects.count(), 1)
            notification = Notification.objects.first()
            self.assertEqual(notification.user, self.participant)
            self.assertEqual(notification.title, "Event Reminder")
            self.assertIn("24 hours", notification.message)

            # Run again - should NOT send
            mock_sender.reset_mock()
            call_command("send_event_reminders")
            mock_sender.assert_not_called()

            # Verify no new notification created
            self.assertEqual(Notification.objects.count(), 1)

    @patch("notifications.management.commands.send_event_reminders.get_channel_layer")
    def test_1h_reminder_sent_exactly_once(self, mock_get_channel_layer):
        """Test that 1h reminder is sent once and flag is updated."""
        mock_channel_layer = MagicMock()
        mock_get_channel_layer.return_value = mock_channel_layer

        now = timezone.now()
        event_time = now + timedelta(hours=1, minutes=5)

        event = Event.objects.create(
            name="1h Event",
            date=event_time,
            organizer=self.user,
            organization=self.organization,
            reminder_1h_sent=False,
        )
        event.participants.add(self.participant)

        with patch(
            "notifications.management.commands.send_event_reminders.async_to_sync"
        ) as mock_async_to_sync:
            mock_sender = MagicMock()
            mock_async_to_sync.return_value = mock_sender

            call_command("send_event_reminders")

            # Verify called once
            self.assertEqual(mock_sender.call_count, 1)

            # Verify arguments
            args, _ = mock_sender.call_args
            self.assertEqual(args[0], f"notifications_{self.participant.id}")
            self.assertEqual(args[1]["message"]["time_left"], "1 hour")

            # Verify flag updated
            event.refresh_from_db()
            self.assertTrue(event.reminder_1h_sent)

            # Verify Notification created
            self.assertEqual(Notification.objects.count(), 1)
            notification = Notification.objects.first()
            self.assertEqual(notification.user, self.participant)
            self.assertEqual(notification.title, "Event Reminder")
            self.assertIn("1 hour", notification.message)

            # Run again - should NOT send
            mock_sender.reset_mock()
            call_command("send_event_reminders")
            mock_sender.assert_not_called()

            # Verify no new notification created
            self.assertEqual(Notification.objects.count(), 1)

    @patch("notifications.management.commands.send_event_reminders.get_channel_layer")
    def test_no_reminder_outside_window(self, mock_get_channel_layer):
        """Test that no reminder is sent if event is outside the window."""
        mock_channel_layer = MagicMock()
        mock_get_channel_layer.return_value = mock_channel_layer

        now = timezone.now()
        # Event is in 2 hours (not 1h, not 24h)
        event_time = now + timedelta(hours=2)

        event = Event.objects.create(
            name="Other Event",
            date=event_time,
            organizer=self.user,
            organization=self.organization,
        )
        event.participants.add(self.participant)

        with patch(
            "notifications.management.commands.send_event_reminders.async_to_sync"
        ) as mock_async_to_sync:
            mock_sender = MagicMock()
            mock_async_to_sync.return_value = mock_sender

            call_command("send_event_reminders")

            mock_sender.assert_not_called()

            event.refresh_from_db()
            self.assertFalse(event.reminder_24h_sent)
            self.assertFalse(event.reminder_1h_sent)

    @patch("notifications.management.commands.send_event_reminders.get_channel_layer")
    @patch("django.utils.timezone.now")
    def test_reminder_window_boundaries(self, mock_now, mock_get_channel_layer):
        """Test boundaries of the reminder window (15 mins)."""
        mock_channel_layer = MagicMock()
        mock_get_channel_layer.return_value = mock_channel_layer

        fixed_now = datetime(2024, 1, 1, 12, 0, 0, tzinfo=dt_timezone.utc)
        mock_now.return_value = fixed_now

        # Event exactly 24h away (start of window)
        event_start = Event.objects.create(
            name="Start Window Event",
            date=fixed_now + timedelta(hours=24),
            organizer=self.user,
            organization=self.organization,
        )
        event_start.participants.add(self.participant)

        # Event 24h + 15m away (end of window)
        event_end = Event.objects.create(
            name="End Window Event",
            date=fixed_now + timedelta(hours=24, minutes=15),
            organizer=self.user,
            organization=self.organization,
        )
        event_end.participants.add(self.participant)

        # Event 24h + 16m away (outside window)
        event_out = Event.objects.create(
            name="Outside Window Event",
            date=fixed_now + timedelta(hours=24, minutes=16),
            organizer=self.user,
            organization=self.organization,
        )
        event_out.participants.add(self.participant)

        with patch(
            "notifications.management.commands.send_event_reminders.async_to_sync"
        ) as mock_async_to_sync:
            mock_sender = MagicMock()
            mock_async_to_sync.return_value = mock_sender

            call_command("send_event_reminders")

            # We expect 2 calls
            self.assertEqual(mock_sender.call_count, 2)

            # Check names of events triggered
            triggered_events = [
                call.args[1]["message"]["event_name"]
                for call in mock_sender.call_args_list
            ]
            self.assertIn("Start Window Event", triggered_events)
            self.assertIn("End Window Event", triggered_events)
            self.assertNotIn("Outside Window Event", triggered_events)
            self.assertNotIn("Outside Window Event", triggered_events)
