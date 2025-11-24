"""Tests for accounts permissions"""

from django.contrib.auth import get_user_model
from django.test import TestCase

from accounts.models import Organization, Profile
from accounts.permissions import (
    IsAuthenticatedOrCreate,
    IsOrganizerOrReadOnly,
    IsOwnerOrReadOnly,
)

User = get_user_model()


class IsOwnerOrReadOnlyTest(TestCase):
    """Tests for IsOwnerOrReadOnly permission"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="password123",
        )
        self.organizer_user = User.objects.create_user(
            username="organizer",
            email="organizer@example.com",
            password="password123",
        )
        self.organizer_user.profile.role = Profile.Role.ORGANIZER
        self.organizer_user.profile.save()

        self.organization = Organization.objects.create(
            name="Test Org", owner=self.organizer_user
        )

        self.permission = IsOwnerOrReadOnly()

    def test_allows_safe_methods(self):
        """Test IsOwnerOrReadOnly allows safe methods"""
        from unittest.mock import Mock

        from django.http import HttpRequest

        request = Mock(spec=HttpRequest)
        request.method = "GET"

        result = self.permission.has_object_permission(request, None, self.organization)
        self.assertTrue(result)

    def test_write_permission_owner(self):
        """Test IsOwnerOrReadOnly write permission for owner"""
        from unittest.mock import Mock

        from django.http import HttpRequest

        request = Mock(spec=HttpRequest)
        request.method = "PUT"
        request.user = self.organizer_user

        result = self.permission.has_object_permission(request, None, self.organization)
        self.assertTrue(result)

    def test_write_permission_non_owner(self):
        """Test IsOwnerOrReadOnly write permission for non-owner"""
        from unittest.mock import Mock

        from django.http import HttpRequest

        request = Mock(spec=HttpRequest)
        request.method = "PUT"
        request.user = self.user

        result = self.permission.has_object_permission(request, None, self.organization)
        self.assertFalse(result)


class IsOrganizerOrReadOnlyTest(TestCase):
    """Tests for IsOrganizerOrReadOnly permission"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="password123",
        )
        self.organizer_user = User.objects.create_user(
            username="organizer",
            email="organizer@example.com",
            password="password123",
        )
        self.organizer_user.profile.role = Profile.Role.ORGANIZER
        self.organizer_user.profile.save()

        self.organization = Organization.objects.create(
            name="Test Org", owner=self.organizer_user
        )

    def test_no_profile(self):
        """Test IsOrganizerOrReadOnly when user has no profile"""
        from unittest.mock import Mock

        from django.http import HttpRequest

        request = Mock(spec=HttpRequest)
        request.method = "POST"
        request.user = self.user

        # Delete profile to trigger DoesNotExist
        self.user.profile.delete()
        self.user.refresh_from_db()

        permission = IsOrganizerOrReadOnly()
        result = permission.has_permission(request, None)
        self.assertFalse(result)

    def test_non_post_methods(self):
        """Test IsOrganizerOrReadOnly with non-POST methods"""
        from unittest.mock import Mock

        from django.http import HttpRequest

        request = Mock(spec=HttpRequest)
        request.method = "PUT"
        request.user = self.user

        permission = IsOrganizerOrReadOnly()
        result = permission.has_permission(request, None)
        self.assertTrue(result)  # Update/delete handled by has_object_permission

    def test_not_authenticated_none(self):
        """Test IsOrganizerOrReadOnly when user is None"""
        from unittest.mock import Mock

        from django.http import HttpRequest

        request = Mock(spec=HttpRequest)
        request.method = "POST"
        request.user = None

        permission = IsOrganizerOrReadOnly()
        result = permission.has_permission(request, None)
        self.assertFalse(result)

    def test_not_authenticated_false(self):
        """Test IsOrganizerOrReadOnly when user.is_authenticated is False"""
        from unittest.mock import Mock

        from django.http import HttpRequest

        request = Mock(spec=HttpRequest)
        request.method = "POST"
        request.user = Mock()
        request.user.is_authenticated = False

        permission = IsOrganizerOrReadOnly()
        result = permission.has_permission(request, None)
        self.assertFalse(result)


class IsAuthenticatedOrCreateTest(TestCase):
    """Tests for IsAuthenticatedOrCreate permission"""

    def test_post_without_auth(self):
        """Test IsAuthenticatedOrCreate allows POST without auth"""
        from unittest.mock import Mock

        from django.http import HttpRequest

        request = Mock(spec=HttpRequest)
        request.method = "POST"
        request.user = Mock()
        request.user.is_authenticated = False

        permission = IsAuthenticatedOrCreate()
        result = permission.has_permission(request, None)
        self.assertTrue(result)

    def test_authenticated(self):
        """Test IsAuthenticatedOrCreate requires auth for non-POST"""
        from unittest.mock import Mock

        from django.http import HttpRequest

        request = Mock(spec=HttpRequest)
        request.method = "GET"
        request.user = Mock()
        request.user.is_authenticated = True

        permission = IsAuthenticatedOrCreate()
        result = permission.has_permission(request, None)
        self.assertTrue(result)

    def test_unauthenticated(self):
        """Test IsAuthenticatedOrCreate blocks non-POST when unauthenticated"""
        from unittest.mock import Mock

        from django.http import HttpRequest

        request = Mock(spec=HttpRequest)
        request.method = "GET"
        request.user = Mock()
        request.user.is_authenticated = False

        permission = IsAuthenticatedOrCreate()
        result = permission.has_permission(request, None)
        self.assertFalse(result)

    def test_no_user(self):
        """Test IsAuthenticatedOrCreate when user is None"""
        from unittest.mock import Mock

        from django.http import HttpRequest

        request = Mock(spec=HttpRequest)
        request.method = "GET"
        request.user = None

        permission = IsAuthenticatedOrCreate()
        result = permission.has_permission(request, None)
        self.assertFalse(result)
