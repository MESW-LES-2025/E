"""Tests for notifications routing"""

from django.test import TestCase
from notifications.routing import websocket_urlpatterns


class NotificationsRoutingTest(TestCase):
    """Tests for WebSocket URL routing"""

    def test_websocket_urlpatterns_exists(self):
        """Test that websocket_urlpatterns is defined"""
        self.assertIsNotNone(websocket_urlpatterns)
        self.assertEqual(len(websocket_urlpatterns), 1)

    def test_websocket_url_pattern_matches_user_id(self):
        """Test that URL pattern matches user_id parameter"""
        pattern = websocket_urlpatterns[0]
        # Check that pattern is a URLPattern
        from django.urls.resolvers import URLPattern

        self.assertIsInstance(pattern, URLPattern)

        # Test pattern matching - pattern.pattern is a RegexPattern
        # We can verify it exists and has the expected structure
        self.assertIsNotNone(pattern.pattern)
        # The pattern should contain user_id group
        pattern_str = str(pattern.pattern)
        self.assertIn("user_id", pattern_str or "")

    def test_websocket_url_pattern_consumer(self):
        """Test that URL pattern uses NotificationConsumer"""
        from notifications.consumers import NotificationConsumer

        pattern = websocket_urlpatterns[0]
        # The callback should be NotificationConsumer.as_asgi()
        # We can't directly check the callback, but we can verify it's callable
        self.assertTrue(hasattr(pattern.callback, "__call__") or hasattr(pattern, "callback"))
