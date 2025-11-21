from rest_framework import serializers

from .models import Event


class EventSerializer(serializers.ModelSerializer):
    organizer_name = serializers.CharField(source="organizer.username", read_only=True)
    participant_count = serializers.SerializerMethodField()
    is_participating = serializers.SerializerMethodField()
    is_full = serializers.SerializerMethodField()

    def get_participant_count(self, obj):
        return obj.participants.count()

    def get_is_participating(self, obj):
        request = self.context.get("request")
        if request and hasattr(request, "user") and request.user.is_authenticated:
            return obj.participants.filter(pk=request.user.pk).exists()
        return False

    def get_is_full(self, obj):
        if obj.capacity is None or obj.capacity == 0:
            return False
        return obj.participants.count() >= obj.capacity

    def validate_capacity(self, value):
        """Convert 0 or empty string to None for unlimited capacity"""
        if value == 0 or value == "" or value is None:
            return None
        if value < 0:
            raise serializers.ValidationError("Capacity cannot be negative.")
        return value

    class Meta:
        model = Event
        fields = [
            "id",
            "name",
            "date",
            "location",
            "description",
            "capacity",
            "organizer",
            "organizer_name",
            "status",
            "participant_count",
            "is_participating",
            "is_full",
        ]
        read_only_fields = [
            "organizer",
            "participant_count",
            "is_participating",
            "is_full",
        ]
