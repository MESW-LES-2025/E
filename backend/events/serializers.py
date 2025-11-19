from rest_framework import serializers

from .models import Event


class EventSerializer(serializers.ModelSerializer):
    organizer_name = serializers.CharField(source="organizer.username", read_only=True)

    class Meta:
        model = Event
        fields = [
            "id",
            "name",
            "date",
            "location",
            "description",
            "capacity",
            "organizer",  # The organizer's ID
            "organizer_name",  # The organizer's username
            "status",
        ]
        read_only_fields = ["organizer"]
