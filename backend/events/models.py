from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import models


def get_default_organizer():
    """
    Returns the first superuser to act as a default organizer.
    """
    User = get_user_model()
    return User.objects.filter(is_superuser=True).first()


# Create your models here.
class Event(models.Model):
    STATUS_CHOICES = [
        ("Active", "Active"),
        ("Cancelled", "Cancelled"),
    ]

    name = models.CharField(max_length=100)
    date = models.DateTimeField()
    location = models.CharField(max_length=300, blank=True, null=True)
    description = models.CharField(max_length=300, blank=True, null=True)
    organizer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="organized_events",
        # default=get_default_organizer, # Temporarily commented out
        null=True,  # Temporarily allow null
        blank=True,
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="Active")

    def __str__(self):
        return self.name
