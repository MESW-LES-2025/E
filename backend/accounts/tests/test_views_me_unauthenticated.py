"""Test for OrganizationViewSet.me unauthenticated branch"""

from unittest.mock import Mock
from django.test import TestCase
from rest_framework.exceptions import NotAuthenticated
from rest_framework.test import APIRequestFactory

from accounts.views import OrganizationViewSet


class OrganizationViewSetMeUnauthenticatedTest(TestCase):
    """Test to cover unauthenticated branch in OrganizationViewSet.me"""

    def test_me_action_raises_not_authenticated_when_user_not_authenticated(self):
        """Test that me action raises NotAuthenticated when user is not authenticated"""
        factory = APIRequestFactory()
        request = factory.get("/")
        # Create a mock user that is not authenticated
        request.user = Mock()
        request.user.is_authenticated = False

        viewset = OrganizationViewSet()
        viewset.request = request

        # Should raise NotAuthenticated
        with self.assertRaises(NotAuthenticated):
            viewset.me(request)
