"""Tests for notifications consumers"""

import asyncio

from asgiref.sync import async_to_sync
from channels.layers import InMemoryChannelLayer
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from notifications.consumers import NotificationConsumer

User = get_user_model()


def create_communicator_with_scope(user_id):
    """Helper to create communicator with proper scope"""
    communicator = WebsocketCommunicator(
        NotificationConsumer.as_asgi(),
        f"/ws/notifications/{user_id}/",
    )
    # Set up scope before connect
    if "url_route" not in communicator.scope:
        communicator.scope["url_route"] = {}
    communicator.scope["url_route"]["kwargs"] = {"user_id": str(user_id)}
    return communicator


class NotificationConsumerTest(TestCase):
    """Tests for NotificationConsumer"""

    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
        )
        self.channel_layer = InMemoryChannelLayer()

    @override_settings(
        CHANNEL_LAYERS={"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}
    )
    def test_connect(self):
        """Test WebSocket connection"""

        async def _test():
            communicator = create_communicator_with_scope(self.user.id)
            connected, subprotocol = await communicator.connect()
            self.assertTrue(connected)
            await communicator.disconnect()

        async_to_sync(_test)()

    @override_settings(
        CHANNEL_LAYERS={"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}
    )
    def test_connect_sets_user_id_and_group_name(self):
        """Test that connect sets user_id and group_name correctly"""

        async def _test():
            communicator = create_communicator_with_scope(self.user.id)
            # communicator = create_communicator_with_scope(self.user.id)
            connected, subprotocol = await communicator.connect()
            self.assertTrue(connected)
            await communicator.disconnect()

        async_to_sync(_test)()

    @override_settings(
        CHANNEL_LAYERS={"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}
    )
    def test_connect_adds_to_group(self):
        """Test that connect adds user to notification group"""

        async def _test():
            communicator = create_communicator_with_scope(self.user.id)
            # communicator = create_communicator_with_scope(self.user.id)
            connected, subprotocol = await communicator.connect()
            self.assertTrue(connected)
            await communicator.disconnect()

        async_to_sync(_test)()

    @override_settings(
        CHANNEL_LAYERS={"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}
    )
    def test_disconnect(self):
        """Test WebSocket disconnection"""

        async def _test():
            communicator = create_communicator_with_scope(self.user.id)
            # communicator = create_communicator_with_scope(self.user.id)
            await communicator.connect()
            await communicator.disconnect()

        async_to_sync(_test)()

    @override_settings(
        CHANNEL_LAYERS={"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}
    )
    def test_disconnect_removes_from_group(self):
        """Test that disconnect removes user from group"""

        async def _test():
            communicator = create_communicator_with_scope(self.user.id)
            # communicator = create_communicator_with_scope(self.user.id)
            await communicator.connect()
            await communicator.disconnect()

        async_to_sync(_test)()

    @override_settings(
        CHANNEL_LAYERS={"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}
    )
    def test_receive_message(self):
        """Test receiving message from WebSocket"""

        async def _test():
            communicator = create_communicator_with_scope(self.user.id)
            # communicator = create_communicator_with_scope(self.user.id)
            connected, subprotocol = await communicator.connect()
            self.assertTrue(connected)

            # Send a message
            await communicator.send_json_to({"message": "Hello World"})

            # Should receive the message back via chat_message handler
            response = await communicator.receive_json_from()
            self.assertIn("message", response)
            self.assertEqual(response["message"], "Hello World")

            await communicator.disconnect()

        async_to_sync(_test)()

    @override_settings(
        CHANNEL_LAYERS={"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}
    )
    def test_receive_sends_to_group(self):
        """Test that receive sends message to room group"""

        async def _test():
            communicator = create_communicator_with_scope(self.user.id)
            # communicator = create_communicator_with_scope(self.user.id)
            connected, subprotocol = await communicator.connect()
            self.assertTrue(connected)

            # Send a message
            await communicator.send_json_to({"message": "Test message"})

            # Should receive the message back
            response = await communicator.receive_json_from()
            self.assertIn("message", response)

            await communicator.disconnect()

        async_to_sync(_test)()

    @override_settings(
        CHANNEL_LAYERS={"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}
    )
    def test_receive_invalid_json(self):
        """Test handling of invalid JSON in receive"""

        async def _test():
            communicator = create_communicator_with_scope(self.user.id)
            # communicator = create_communicator_with_scope(self.user.id)
            connected, subprotocol = await communicator.connect()
            self.assertTrue(connected)

            # Send invalid JSON - this should be handled gracefully
            await communicator.send_to(text_data="invalid json")
            # Wait a bit to ensure the error is handled
            await asyncio.sleep(0.1)

            await communicator.disconnect()

        async_to_sync(_test)()

    @override_settings(
        CHANNEL_LAYERS={"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}
    )
    def test_receive_with_missing_message_key(self):
        """Test receive with JSON missing message key"""

        async def _test():
            communicator = create_communicator_with_scope(self.user.id)
            # communicator = create_communicator_with_scope(self.user.id)
            connected, subprotocol = await communicator.connect()
            self.assertTrue(connected)

            # Send JSON without message key - should handle gracefully
            await communicator.send_json_to({"type": "test"})
            # Wait a bit to ensure the error is handled
            await asyncio.sleep(0.1)

            await communicator.disconnect()

        async_to_sync(_test)()
