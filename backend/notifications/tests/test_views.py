from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from ..models import Notification

User = get_user_model()


class NotificationAPITest(APITestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(
            username="user1", email="user1@example.com", password="password123"
        )
        self.user2 = User.objects.create_user(
            username="user2", email="user2@example.com", password="password123"
        )

        self.notif1_user1 = Notification.objects.create(
            user=self.user1, title="U1 N1", is_read=False
        )
        self.notif2_user1 = Notification.objects.create(
            user=self.user1, title="U1 N2", is_read=True
        )
        self.notif1_user2 = Notification.objects.create(
            user=self.user2, title="U2 N1", is_read=False
        )

    def test_list_notifications_unauthenticated(self):
        url = reverse("notification-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_notifications_authenticated(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse("notification-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        self.assertEqual(response.data[0]["title"], self.notif2_user1.title)
        self.assertEqual(response.data[1]["title"], self.notif1_user1.title)

    def test_detail_notification_owner(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse("notification-detail", kwargs={"pk": self.notif1_user1.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], self.notif1_user1.title)

    def test_detail_notification_not_owner(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse("notification-detail", kwargs={"pk": self.notif1_user2.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_mark_as_read(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse("notification-mark-read", kwargs={"pk": self.notif1_user1.pk})
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_read"])

        self.notif1_user1.refresh_from_db()
        self.assertTrue(self.notif1_user1.is_read)

    def test_mark_as_read_already_read(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse("notification-mark-read", kwargs={"pk": self.notif2_user1.pk})
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_read"])

        self.notif2_user1.refresh_from_db()
        self.assertTrue(self.notif2_user1.is_read)

    def test_mark_as_read_not_owner(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse("notification-mark-read", kwargs={"pk": self.notif1_user2.pk})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_mark_as_unread(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse("notification-mark-unread", kwargs={"pk": self.notif2_user1.pk})
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["is_read"])

        self.notif2_user1.refresh_from_db()
        self.assertFalse(self.notif2_user1.is_read)

    def test_mark_as_unread_already_unread(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse("notification-mark-unread", kwargs={"pk": self.notif1_user1.pk})
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["is_read"])

        self.notif1_user1.refresh_from_db()
        self.assertFalse(self.notif1_user1.is_read)

    def test_mark_as_unread_not_owner(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse("notification-mark-unread", kwargs={"pk": self.notif1_user2.pk})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_mark_all_as_read(self):
        # user1 has one unread notification
        self.client.force_authenticate(user=self.user1)
        url = reverse("notification-mark-all-read")
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["updated"], 1)

        self.notif1_user1.refresh_from_db()
        self.assertTrue(self.notif1_user1.is_read)

        # Check that other user's notifications are not affected
        self.notif1_user2.refresh_from_db()
        self.assertFalse(self.notif1_user2.is_read)

    def test_mark_all_as_read_no_unread(self):
        # Mark all as read first
        self.user1.notifications.update(is_read=True)

        self.client.force_authenticate(user=self.user1)
        url = reverse("notification-mark-all-read")
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["updated"], 0)

    def test_unread_count(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse("notification-unread-count")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unread"], 1)

    def test_unread_count_zero(self):
        self.user1.notifications.update(is_read=True)
        self.client.force_authenticate(user=self.user1)
        url = reverse("notification-unread-count")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unread"], 0)

    def test_unread_count_unauthenticated(self):
        url = reverse("notification-unread-count")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
