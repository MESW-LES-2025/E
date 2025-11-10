from django.contrib.auth.models import User
from django.db import models


# Create your models here.
class Event(models.Model):
    name = models.CharField(max_length=100)
    date = models.DateTimeField()
    location = models.CharField(max_length=300, blank=True, null=True)
    description = models.CharField(max_length=300, blank=True, null=True)
    organizer = models.ForeignKey(User, on_delete=models.CASCADE)
    registered_users = models.ManyToManyField(
        User, related_name="registered_events", blank=True
    )
    interested_users = models.ManyToManyField(
        User, related_name="interested_events", blank=True
    )

    def __str__(self):
        return self.name
