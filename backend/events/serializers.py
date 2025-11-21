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
            "organizer",  # The organizer's ID
            "organizer_name",  # The organizer's username
            "status",
            # TODO: add those fields for my feature
            # "registered_users",
            # "interested_users",
        ]
        read_only_fields = ["organizer"]
