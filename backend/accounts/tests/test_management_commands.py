"""Tests for management commands"""

from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase
from django.contrib.auth import get_user_model

from accounts.models import Organization, Profile
from events.models import Event
from notifications.models import Notification

User = get_user_model()


class SeedDataCommandTest(TestCase):
    """Tests for seed_data management command"""

    def test_command_execution(self):
        """Test that the command executes successfully"""
        out = StringIO()
        call_command("seed_data", stdout=out)
        output = out.getvalue()

        # Command should complete without errors
        self.assertIn("Seeding", output)

    def test_command_creates_organizations(self):
        """Test that command creates organizations"""
        initial_count = Organization.objects.count()
        call_command("seed_data", verbosity=0)

        # Should create organizations
        self.assertGreater(Organization.objects.count(), initial_count)

    def test_command_creates_users(self):
        """Test that command creates users"""
        initial_count = User.objects.count()
        call_command("seed_data", verbosity=0)

        # Should create users
        self.assertGreater(User.objects.count(), initial_count)

    def test_command_creates_events(self):
        """Test that command creates events"""
        initial_count = Event.objects.count()
        call_command("seed_data", verbosity=0)

        # Should create events
        self.assertGreater(Event.objects.count(), initial_count)

    def test_command_creates_relationships(self):
        """Test that command creates relationships (followers, interests, participations)"""
        call_command("seed_data", verbosity=0)

        # Should have organizations with followers
        orgs_with_followers = Organization.objects.filter(followers__isnull=False).distinct()
        self.assertGreater(orgs_with_followers.count(), 0)

        # Should have events with interested users
        events_with_interested = Event.objects.filter(interested_users__isnull=False).distinct()
        self.assertGreater(events_with_interested.count(), 0)

        # Should have events with participants
        events_with_participants = Event.objects.filter(participants__isnull=False).distinct()
        self.assertGreater(events_with_participants.count(), 0)

    def test_command_creates_notifications(self):
        """Test that command creates notifications"""
        initial_count = Notification.objects.count()
        call_command("seed_data", verbosity=0)

        # Should create notifications
        self.assertGreater(Notification.objects.count(), initial_count)

    def test_command_handles_transaction_rollback(self):
        """Test that command handles transaction errors gracefully"""
        with patch("accounts.management.commands.seed_data.Organization.objects.create") as mock_create:
            mock_create.side_effect = Exception("Database error")

            # Command should handle the error
            with self.assertRaises(Exception):
                call_command("seed_data", verbosity=0)

    def test_command_creates_organizers(self):
        """Test that command creates users with ORGANIZER role"""
        call_command("seed_data", verbosity=0)

        organizers = Profile.objects.filter(role=Profile.Role.ORGANIZER)
        self.assertGreater(organizers.count(), 0)

    def test_command_creates_attendees(self):
        """Test that command creates users with ATTENDEE role"""
        call_command("seed_data", verbosity=0)

        attendees = Profile.objects.filter(role=Profile.Role.ATTENDEE)
        self.assertGreater(attendees.count(), 0)

    def test_command_creates_organizations_with_owners(self):
        """Test that organizations have owners"""
        call_command("seed_data", verbosity=0)

        orgs = Organization.objects.all()
        for org in orgs:
            self.assertIsNotNone(org.owner)

    def test_command_creates_events_with_organizations(self):
        """Test that events have organizations"""
        call_command("seed_data", verbosity=0)

        events = Event.objects.all()
        for event in events:
            self.assertIsNotNone(event.organization)
