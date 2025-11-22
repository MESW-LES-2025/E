from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import models


# Remove after implement that only organizers can create events
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
    organization = models.ForeignKey(
        "accounts.Organization",
        on_delete=models.CASCADE,
        related_name="events",
        null=False,
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="Active")
    capacity = models.IntegerField(blank=True, null=True)

    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="participating_events",
    )

    class Meta:
        ordering = ["date", "id"]  # Order by date, then by id for consistency

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        # Convert 0 to None for unlimited capacity
        if self.capacity == 0:
            self.capacity = None
        super().save(*args, **kwargs)
