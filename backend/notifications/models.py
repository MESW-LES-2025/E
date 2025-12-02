from django.conf import settings
from django.db import models


# Create your models here.
class Notification(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications"
    )
    title = models.CharField(max_length=255)
    message = models.TextField(blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]  # newer first for listing

    def __str__(self):
        return f"{self.user.username} - {self.title}"
