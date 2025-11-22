"""Tests for accounts models"""

from django.contrib.auth import get_user_model
from django.test import TestCase

from accounts.models import Organization, Profile

User = get_user_model()


class OrganizationModelTest(TestCase):
    """Tests for Organization model"""

    def test_organization_str(self):
        """Test Organization.__str__ method"""
        user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="password123",
        )
        organization = Organization.objects.create(name="Test Org", owner=user)
        self.assertEqual(str(organization), "Test Org")


class ProfileModelTest(TestCase):
    """Tests for Profile model"""

    def test_profile_str(self):
        """Test Profile.__str__ method"""
        user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="password123",
        )
        profile = user.profile
        self.assertEqual(str(profile), f"{user.username} Profile")

    def test_profile_signal_raw_save(self):
        """Test profile signal handler with raw=True"""
        user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="password123",
        )
        # Simulate a raw save (like from fixtures or migrations)
        user.save_base(raw=True)
        # Should not create another profile
        self.assertEqual(Profile.objects.filter(user=user).count(), 1)
