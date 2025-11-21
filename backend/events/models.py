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
        default=get_default_organizer,
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="Active")
    # TODO: add those fields for my feature
    # registered_users = models.ManyToManyField(
    #     User, related_name="registered_events", blank=True
    # )
    # interested_users = models.ManyToManyField(
    #     User, related_name="interested_events", blank=True
    # )

    def __str__(self):
        return self.name
