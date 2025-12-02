from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification
from .serializers import NotificationSerializer


class IsOwnerNotificationMixin:
    def get_queryset(self):
        # Always filter notifications by the logged-in user
        return Notification.objects.filter(user=self.request.user)


class NotificationListView(IsOwnerNotificationMixin, generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NotificationSerializer
    # ordering is handled by model's Meta ordering


class NotificationDetailView(IsOwnerNotificationMixin, generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NotificationSerializer


class MarkAsReadView(IsOwnerNotificationMixin, APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            notif = self.get_queryset().get(pk=pk)
        except Notification.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if not notif.is_read:
            notif.is_read = True
            notif.save(update_fields=["is_read"])
        return Response({"id": notif.id, "is_read": notif.is_read})


class MarkAsUnreadView(IsOwnerNotificationMixin, APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            notif = self.get_queryset().get(pk=pk)
        except Notification.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if notif.is_read:
            notif.is_read = False
            notif.save(update_fields=["is_read"])
        return Response({"id": notif.id, "is_read": notif.is_read})


class MarkAllAsReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        qs = Notification.objects.filter(user=request.user, is_read=False)
        updated = qs.update(is_read=True)
        return Response({"updated": updated})


class UnreadCountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({"unread": count})
