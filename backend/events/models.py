from django.db import models


# Create your models here.
class Event(models.Model):
    name = models.CharField(max_length=100)
    date = models.DateTimeField()
    location = models.CharField(max_length=300, blank=True, null=True)

    def __str__(self):
        return self.name
