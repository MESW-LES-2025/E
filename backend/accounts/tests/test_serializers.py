"""Tests for accounts serializers"""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import Organization, Profile
from accounts.serializers import (
    OrganizationSerializer,
    PublicOrganizationSerializer,
    UserCreateSerializer,
)

User = get_user_model()


class UserCreateSerializerTest(APITestCase):
    """Tests for UserCreateSerializer"""

    def test_validate_with_role(self):
        """Test UserCreateSerializer.validate with role"""
        serializer = UserCreateSerializer()
        attrs = {
            "username": "testuser",
            "email": "test@example.com",
            "password": "ComplexPass123!@#",
            "role": Profile.Role.ORGANIZER,
        }

        validated = serializer.validate(attrs)
        self.assertEqual(serializer._role, Profile.Role.ORGANIZER)
        self.assertNotIn("role", validated)

    def test_validate_default_role(self):
        """Test UserCreateSerializer.validate with default role"""
        serializer = UserCreateSerializer()
        attrs = {
            "username": "testuser",
            "email": "test@example.com",
            "password": "ComplexPass123!@#",
        }

        validated = serializer.validate(attrs)
        self.assertEqual(serializer._role, Profile.Role.ATTENDEE)
        self.assertNotIn("role", validated)

    def test_create_with_role(self):
        """Test UserCreateSerializer.create with role"""
        data = {
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "ComplexPass123!@#",
            "first_name": "New",
            "last_name": "User",
            "role": Profile.Role.ORGANIZER,
        }

        serializer = UserCreateSerializer(data=data)
        serializer.is_valid(raise_exception=True)

        # _role should be set by validate() method
        # Verify it was set correctly
        self.assertEqual(serializer._role, Profile.Role.ORGANIZER)

        # Now create the user - create() will use _role from validate()
        user = serializer.create(serializer.validated_data)

        self.assertEqual(user.username, "newuser")
        # Refresh profile from DB to ensure role was saved
        user.profile.refresh_from_db()
        self.assertEqual(user.profile.role, Profile.Role.ORGANIZER)

    def test_create_default_role(self):
        """Test UserCreateSerializer.create with default role"""
        data = {
            "username": "newuser2",
            "email": "newuser2@example.com",
            "password": "ComplexPass123!@#",
            "first_name": "New2",
            "last_name": "User2",
        }

        serializer = UserCreateSerializer(data=data)
        serializer.is_valid(raise_exception=True)

        # Don't set _role, should use default
        user = serializer.create(serializer.validated_data)

        self.assertEqual(user.username, "newuser2")
        self.assertEqual(user.profile.role, Profile.Role.ATTENDEE)

    def test_create_full_path(self):
        """Test UserCreateSerializer.create method full path including save"""
        # Test the full path: validate sets _role, create uses it
        serializer = UserCreateSerializer()
        serializer._role = Profile.Role.ORGANIZER

        validated_data = {
            "username": "fulluser",
            "email": "fulluser@example.com",
            "password": "ComplexPass123!@#",
            "first_name": "Full",
            "last_name": "User",
        }

        user = serializer.create(validated_data)

        # Verify user was created
        self.assertEqual(user.username, "fulluser")
        # Verify profile was created/updated with the role
        user.profile.refresh_from_db()
        self.assertEqual(user.profile.role, Profile.Role.ORGANIZER)


class PublicOrganizationSerializerTest(TestCase):
    """Tests for PublicOrganizationSerializer"""

    def test_owner_name_empty(self):
        """Test PublicOrganizationSerializer with empty owner names"""
        user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="password123",
            first_name="",
            last_name="",
        )
        organization = Organization.objects.create(name="Test Org", owner=user)

        serializer = PublicOrganizationSerializer(organization)
        self.assertEqual(serializer.data["owner_name"], "")


class OrganizationSerializerTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="password123",
        )

    """Tests for OrganizationSerializer"""

    def test_get_owner_name(self):
        """Test OrganizationSerializer.get_owner_name method"""
        user = User.objects.create_user(
            username="owneruser",
            email="owner@example.com",
            password="password123",
            first_name="Owner",
            last_name="User",
        )
        organization = Organization.objects.create(name="Test Org", owner=user)

        serializer = OrganizationSerializer(organization)
        self.assertEqual(serializer.data["owner_name"], "Owner User")

    def test_get_event_count(self):
        """Test OrganizationSerializer.get_event_count method"""
        from events.models import Event

        user = User.objects.create_user(
            username="owneruser",
            email="owner@example.com",
            password="password123",
        )
        user.profile.role = Profile.Role.ORGANIZER
        user.profile.save()

        organization = Organization.objects.create(name="Test Org", owner=user)

        # Create events for this organization's owner
        Event.objects.create(
            name="Event 1",
            date=timezone.now() + timedelta(days=1),
            organizer=user,
            organization=organization,
        )
        Event.objects.create(
            name="Event 2",
            date=timezone.now() + timedelta(days=2),
            organizer=user,
            organization=organization,
        )

        serializer = OrganizationSerializer(organization)
        self.assertEqual(serializer.data["event_count"], 2)

    def test_get_is_following_authenticated_following(self):
        """Test get_is_following returns True when user is following"""
        from unittest.mock import Mock

        user = User.objects.create_user(
            username="follower",
            email="follower@example.com",
            password="password123",
        )
        organization = Organization.objects.create(name="Test Org", owner=self.user)
        organization.followers.add(user)

        request = Mock()
        mock_user = Mock()
        mock_user.pk = user.pk
        mock_user.is_authenticated = True
        request.user = mock_user

        serializer = PublicOrganizationSerializer(
            organization, context={"request": request}
        )
        self.assertTrue(serializer.data["is_following"])

    def test_get_is_following_authenticated_not_following(self):
        """Test get_is_following returns False when user is not following"""
        from unittest.mock import Mock

        user = User.objects.create_user(
            username="nonfollower",
            email="nonfollower@example.com",
            password="password123",
        )
        organization = Organization.objects.create(name="Test Org", owner=self.user)

        request = Mock()
        mock_user = Mock()
        mock_user.pk = user.pk
        mock_user.is_authenticated = True
        request.user = mock_user

        serializer = PublicOrganizationSerializer(
            organization, context={"request": request}
        )
        self.assertFalse(serializer.data["is_following"])

    def test_get_is_following_unauthenticated(self):
        """Test get_is_following returns False when user is not authenticated"""
        organization = Organization.objects.create(name="Test Org", owner=self.user)

        serializer = PublicOrganizationSerializer(organization)
        self.assertFalse(serializer.data["is_following"])

    def test_get_is_following_no_request(self):
        """Test get_is_following returns False when request is not in context"""
        organization = Organization.objects.create(name="Test Org", owner=self.user)

        serializer = PublicOrganizationSerializer(organization, context={})
        self.assertFalse(serializer.data["is_following"])

    def test_get_is_collaborator_authenticated_collaborator(self):
        """Test get_is_collaborator returns True when user is collaborator"""
        from unittest.mock import Mock

        from accounts.serializers import CollaboratorOrganizationSerializer

        collaborator = User.objects.create_user(
            username="collaborator",
            email="collab@example.com",
            password="password123",
        )
        organization = Organization.objects.create(name="Test Org", owner=self.user)
        organization.collaborators.add(collaborator)

        request = Mock()
        mock_user = Mock()
        mock_user.pk = collaborator.pk
        mock_user.is_authenticated = True
        request.user = mock_user

        serializer = CollaboratorOrganizationSerializer(
            organization, context={"request": request}
        )
        self.assertTrue(serializer.data["is_collaborator"])

    def test_get_is_collaborator_authenticated_not_collaborator(self):
        """Test get_is_collaborator returns False when user is not collaborator"""
        from unittest.mock import Mock

        from accounts.serializers import CollaboratorOrganizationSerializer

        user = User.objects.create_user(
            username="noncollab",
            email="noncollab@example.com",
            password="password123",
        )
        organization = Organization.objects.create(name="Test Org", owner=self.user)

        request = Mock()
        request.user = user
        type(user).is_authenticated = property(lambda self: True)

        serializer = CollaboratorOrganizationSerializer(
            organization, context={"request": request}
        )
        self.assertFalse(serializer.data["is_collaborator"])

    def test_get_is_collaborator_unauthenticated(self):
        """Test get_is_collaborator returns False when user is not authenticated"""
        from accounts.serializers import CollaboratorOrganizationSerializer

        organization = Organization.objects.create(name="Test Org", owner=self.user)

        serializer = CollaboratorOrganizationSerializer(organization)
        self.assertFalse(serializer.data["is_collaborator"])

    def test_get_is_collaborator_no_request(self):
        """Test get_is_collaborator returns False when request is not in context"""
        from accounts.serializers import CollaboratorOrganizationSerializer

        organization = Organization.objects.create(name="Test Org", owner=self.user)

        serializer = CollaboratorOrganizationSerializer(organization, context={})
        self.assertFalse(serializer.data["is_collaborator"])
