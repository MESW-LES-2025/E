from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from .models import Organization, Profile

User = get_user_model()


class ProfileViewSetTests(APITestCase):
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            first_name="Test",
            last_name="User",
        )
        self.profile = Profile.objects.get(user=self.user)
        self.profile.role = Profile.Role.ATTENDEE
        self.profile.phone_number = "+1234567890"
        self.profile.bio = "Test bio"
        self.profile.save()

    def test_get_profile_authenticated(self):
        """Test that authenticated user can view their profile"""
        self.client.force_authenticate(user=self.user)
        url = reverse("profile-me")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Check user information
        self.assertEqual(data["username"], "testuser")
        self.assertEqual(data["email"], "test@example.com")
        self.assertEqual(data["first_name"], "Test")
        self.assertEqual(data["last_name"], "User")

        # Check profile information
        self.assertEqual(data["user_id"], self.user.id)
        self.assertEqual(data["role"], Profile.Role.ATTENDEE)
        self.assertEqual(data["phone_number"], "+1234567890")
        self.assertEqual(data["bio"], "Test bio")
        self.assertIn("id", data)

    def test_get_profile_unauthenticated(self):
        """Test that unauthenticated user cannot view profile"""
        url = reverse("profile-me")
        response = self.client.get(url)

        # DRF's IsAuthenticated returns 403 Forbidden for unauthenticated users
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_profile_returns_current_user_profile(self):
        """Test that profile endpoint returns the current authenticated
        user's profile"""
        # Create another user
        other_user = User.objects.create_user(
            username="otheruser",
            email="other@example.com",
            password="testpass123",
            first_name="Other",
            last_name="User",
        )

        # Authenticate as first user
        self.client.force_authenticate(user=self.user)
        url = reverse("profile-me")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Should return first user's profile, not other user's
        self.assertEqual(data["username"], "testuser")
        self.assertNotEqual(data["username"], "otheruser")
        self.assertEqual(data["user_id"], self.user.id)
        self.assertNotEqual(data["user_id"], other_user.id)

    def test_user_story_view_profile_when_logged_in(self):
        """
        User Story Test:
        As a user, I want to see my user profile so that I can check my information.

        Given I am currently logged in the application
        When I click on my profile
        Then I should go to my profile page
        And I should see my profile information
        """
        # Given: User is logged in (authenticated)
        self.client.force_authenticate(user=self.user)

        # When: User clicks on profile (GET request to profile endpoint)
        url = reverse("profile-me")
        response = self.client.get(url)

        # Then: Should successfully access profile page
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # And: Should see profile information
        data = response.json()

        # Verify all profile information is present
        self.assertIn("id", data)
        self.assertIn("user_id", data)
        self.assertIn("username", data)
        self.assertIn("email", data)
        self.assertIn("first_name", data)
        self.assertIn("last_name", data)
        self.assertIn("role", data)
        self.assertIn("phone_number", data)
        self.assertIn("bio", data)

        # Verify the information belongs to the logged-in user
        self.assertEqual(data["user_id"], self.user.id)
        self.assertEqual(data["username"], self.user.username)
        self.assertEqual(data["email"], self.user.email)
        self.assertEqual(data["first_name"], self.user.first_name)
        self.assertEqual(data["last_name"], self.user.last_name)


class OrganizationViewSetTests(APITestCase):
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()

        # Create owner user with ORGANIZER role
        self.owner = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="testpass123",
            first_name="Owner",
            last_name="User",
        )
        self.owner.profile.role = Profile.Role.ORGANIZER
        self.owner.profile.save()

        # Create another user (non-owner)
        self.other_user = User.objects.create_user(
            username="otheruser",
            email="other@example.com",
            password="testpass123",
            first_name="Other",
            last_name="User",
        )

        # Create organization
        self.organization = Organization.objects.create(
            name="Test Organization",
            description="A test organization",
            owner=self.owner,
            email="org@example.com",
            website="https://example.com",
            phone="+1234567890",
            address="123 Test St",
            city="Test City",
            country="Test Country",
            logo_url="https://example.com/logo.png",
            organization_type=Organization.OrganizationType.COMPANY,
            established_date=date(2020, 1, 1),
        )

    def test_list_organizations_public_access(self):
        """Test that anyone can list organizations (public access)"""
        url = reverse("organizations-list")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data["results"]), 1)
        self.assertEqual(data["results"][0]["name"], "Test Organization")

    def test_retrieve_organization_public_access(self):
        """Test that anyone can view organization details (public access)"""
        url = reverse("organizations-detail", kwargs={"pk": self.organization.id})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Check public fields are present
        self.assertEqual(data["name"], "Test Organization")
        self.assertEqual(data["description"], "A test organization")
        self.assertEqual(data["email"], "org@example.com")
        self.assertEqual(data["website"], "https://example.com")
        self.assertEqual(data["phone"], "+1234567890")
        self.assertEqual(data["address"], "123 Test St")
        self.assertEqual(data["city"], "Test City")
        self.assertEqual(data["country"], "Test Country")
        self.assertEqual(data["logo_url"], "https://example.com/logo.png")
        self.assertEqual(data["organization_type"], "COMPANY")

        # Check public serializer fields
        self.assertIn("owner_name", data)
        self.assertIn("event_count", data)
        self.assertEqual(data["owner_name"], "Owner User")

        # Public serializer should NOT include owner_id
        self.assertNotIn("owner_id", data)
        self.assertNotIn("updated_at", data)

    def test_retrieve_organization_as_owner(self):
        """Test that owner sees full serializer with owner_id"""
        self.client.force_authenticate(user=self.owner)
        url = reverse("organizations-detail", kwargs={"pk": self.organization.id})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Owner should see full serializer with owner_id and updated_at
        self.assertIn("owner_id", data)
        self.assertEqual(data["owner_id"], self.owner.id)
        self.assertIn("updated_at", data)

    def test_create_organization_requires_authentication(self):
        """Test that creating organization requires authentication"""
        url = reverse("organizations-list")
        data = {
            "name": "New Organization",
            "description": "A new organization",
        }
        response = self.client.post(url, data)

        # DRF's IsAuthenticated returns 403 Forbidden for unauthenticated users
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_organization_requires_organizer_role(self):
        """Test that only users with ORGANIZER role can create organizations"""
        # Create a user with ATTENDEE role
        attendee = User.objects.create_user(
            username="attendee",
            email="attendee@example.com",
            password="testpass123",
            first_name="Attendee",
            last_name="User",
        )
        attendee.profile.role = Profile.Role.ATTENDEE
        attendee.profile.save()

        self.client.force_authenticate(user=attendee)
        url = reverse("organizations-list")
        data = {
            "name": "New Organization",
            "description": "A new organization",
        }
        response = self.client.post(url, data)

        # Should be forbidden - ATTENDEE cannot create organizations
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_organization_authenticated_as_organizer(self):
        """Test that authenticated user with ORGANIZER role can create organization"""
        # Ensure owner has ORGANIZER role
        self.owner.profile.role = Profile.Role.ORGANIZER
        self.owner.profile.save()

        self.client.force_authenticate(user=self.owner)
        url = reverse("organizations-list")
        data = {
            "name": "New Organization",
            "description": "A new organization",
            "email": "new@example.com",
            "website": "https://new.org",
        }
        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(data["name"], "New Organization")
        self.assertEqual(data["owner_id"], self.owner.id)

        # Verify organization was created
        self.assertTrue(Organization.objects.filter(name="New Organization").exists())

    def test_update_organization_only_by_owner(self):
        """Test that only owner can update organization"""
        # Non-owner tries to update
        self.client.force_authenticate(user=self.other_user)
        url = reverse("organizations-detail", kwargs={"pk": self.organization.id})
        data = {"name": "Hacked Name"}
        response = self.client.patch(url, data)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Owner can update
        self.client.force_authenticate(user=self.owner)
        data = {"name": "Updated Name"}
        response = self.client.patch(url, data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["name"], "Updated Name")
        self.organization.refresh_from_db()
        self.assertEqual(self.organization.name, "Updated Name")

    def test_delete_organization_only_by_owner(self):
        """Test that only owner can delete organization"""
        # Non-owner tries to delete
        self.client.force_authenticate(user=self.other_user)
        url = reverse("organizations-detail", kwargs={"pk": self.organization.id})
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Organization.objects.filter(id=self.organization.id).exists())

        # Owner can delete
        self.client.force_authenticate(user=self.owner)
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Organization.objects.filter(id=self.organization.id).exists())

    def test_organization_events_endpoint_public(self):
        """Test that organization events endpoint is publicly accessible"""
        # Create an event organized by the organization owner
        from events.models import Event

        Event.objects.create(
            name="Test Event",
            date=timezone.now() + timedelta(days=7),
            organizer=self.owner,
            status="Active",
        )

        url = reverse("organizations-events", kwargs={"pk": self.organization.id})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["name"], "Test Event")

    def test_organization_events_endpoint_only_active_events(self):
        """Test that only active events are returned"""
        from events.models import Event

        # Create active and cancelled events
        Event.objects.create(
            name="Active Event",
            date=timezone.now() + timedelta(days=7),
            organizer=self.owner,
            status="Active",
        )
        Event.objects.create(
            name="Cancelled Event",
            date=timezone.now() + timedelta(days=14),
            organizer=self.owner,
            status="Cancelled",
        )

        url = reverse("organizations-events", kwargs={"pk": self.organization.id})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Should only return active event
        event_names = [event["name"] for event in data]
        self.assertIn("Active Event", event_names)
        self.assertNotIn("Cancelled Event", event_names)

    def test_organization_public_serializer_fields(self):
        """Test that public serializer includes all public fields"""
        url = reverse("organizations-detail", kwargs={"pk": self.organization.id})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Check all public fields are present
        public_fields = [
            "id",
            "name",
            "description",
            "email",
            "website",
            "phone",
            "address",
            "city",
            "country",
            "logo_url",
            "cover_image_url",
            "twitter_handle",
            "facebook_url",
            "linkedin_url",
            "instagram_handle",
            "organization_type",
            "established_date",
            "owner_name",
            "event_count",
            "created_at",
        ]

        for field in public_fields:
            self.assertIn(field, data, f"Field {field} should be in public serializer")

        # Check private fields are NOT present
        private_fields = ["owner_id", "updated_at"]
        for field in private_fields:
            self.assertNotIn(
                field, data, f"Field {field} should NOT be in public serializer"
            )

    def test_organization_full_serializer_for_owner(self):
        """Test that owner sees full serializer with all fields"""
        self.client.force_authenticate(user=self.owner)
        url = reverse("organizations-detail", kwargs={"pk": self.organization.id})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Owner should see owner_id and updated_at
        self.assertIn("owner_id", data)
        self.assertIn("updated_at", data)
        self.assertEqual(data["owner_id"], self.owner.id)
