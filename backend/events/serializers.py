from django.contrib.auth import get_user_model
from djoser.serializers import UserSerializer as BaseUserSerializer
from rest_framework import serializers

from .models import Event

User = get_user_model()


class EventSerializer(serializers.ModelSerializer):
    organizer_name = serializers.CharField(source="organizer.username", read_only=True)
    created_by = serializers.CharField(source="organizer.username", read_only=True)
    organization_name = serializers.SerializerMethodField()
    organization_id = serializers.SerializerMethodField()
    participant_count = serializers.SerializerMethodField()
    interest_count = serializers.SerializerMethodField()
    is_participating = serializers.SerializerMethodField()
    is_interested = serializers.SerializerMethodField()
    is_full = serializers.SerializerMethodField()

    def get_organization_name(self, obj):
        if obj.organization:
            return obj.organization.name
        return None

    def get_organization_id(self, obj):
        if obj.organization:
            return obj.organization.id
        return None

    def get_participant_count(self, obj):
        return obj.participants.count()

    def get_interest_count(self, obj):
        return obj.interested_users.count()

    def get_is_participating(self, obj):
        request = self.context.get("request")
        if request and hasattr(request, "user") and request.user.is_authenticated:
            return obj.participants.filter(pk=request.user.pk).exists()
        return False

    def get_is_interested(self, obj):
        request = self.context.get("request")
        if request and hasattr(request, "user") and request.user.is_authenticated:
            return obj.interested_users.filter(pk=request.user.pk).exists()
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

    def validate_organization(self, value):
        """Ensure organization is provided"""
        if not value:
            raise serializers.ValidationError("Organization is required.")
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
            "category",
            "organizer",
            "organizer_name",
            "created_by",
            "organization",
            "organization_id",
            "organization_name",
            "status",
            "participant_count",
            "interest_count",
            "interested_users",
            "is_participating",
            "is_interested",
            "is_full",
        ]
        read_only_fields = [
            "organizer",
            "organizer_name",
            "created_by",
            "organization_name",
            "organization_id",
            "participant_count",
            "interest_count",
            "is_participating",
            "is_interested",
            "is_full",
        ]
        extra_kwargs = {
            "organization": {"required": True},
        }


class UserSerializer(BaseUserSerializer):
    role = serializers.CharField(source="profile.role", read_only=True)

    class Meta(BaseUserSerializer.Meta):
        model = User
        fields = ("id", "username", "email", "first_name", "last_name", "role")
