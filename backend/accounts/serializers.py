from django.contrib.auth import get_user_model
from djoser.serializers import UserCreateSerializer as BaseUserCreateSerializer
from djoser.serializers import UserSerializer as BaseUserSerializer
from rest_framework import serializers

from .models import Organization, Profile

User = get_user_model()


class UserCreateSerializer(BaseUserCreateSerializer):

    role = serializers.ChoiceField(
        choices=Profile.Role.choices,
        default=Profile.Role.ATTENDEE,
    )

    class Meta(BaseUserCreateSerializer.Meta):
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "password",
            "role",
        )

    def validate(self, attrs):
        self._role = attrs.get("role", Profile.Role.ATTENDEE)

        attrs_without_role = {k: v for k, v in attrs.items() if k != "role"}

        validated = super().validate(attrs_without_role)
        return validated

    def create(self, validated_data):
        role = getattr(self, "_role", Profile.Role.ATTENDEE)

        user = super().create(validated_data)

        profile, _ = Profile.objects.get_or_create(user=user)
        profile.role = role
        profile.save()

        return user


class UserSerializer(BaseUserSerializer):
    role = serializers.CharField(source="profile.role", read_only=True)

    class Meta(BaseUserSerializer.Meta):
        model = User
        fields = ("id", "username", "email", "first_name", "last_name", "role")


class ProfileSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = Profile
        fields = ["id", "user_id", "role", "phone_number", "bio"]
        read_only_fields = ["id", "user_id"]


class OrganizationSerializer(serializers.ModelSerializer):
    owner_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = Organization
        fields = ["id", "name", "description", "owner_id", "created_at", "updated_at"]
        read_only_fields = ["id", "owner_id", "created_at", "updated_at"]
