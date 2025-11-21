from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from .models import Profile

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
