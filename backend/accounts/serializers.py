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
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)
    participating_events = serializers.PrimaryKeyRelatedField(
        many=True,
        read_only=True,
        source="user.participating_events",
    )

    class Meta:
        model = Profile
        fields = [
            "id",
            "user_id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "phone_number",
            "bio",
            "participating_events",
        ]
        read_only_fields = [
            "id",
            "user_id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "participating_events",
        ]


class PublicOrganizationSerializer(serializers.ModelSerializer):
    """Public serializer for organization profiles - safe fields only"""

    owner_name = serializers.SerializerMethodField()
    event_count = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()

    def get_owner_name(self, obj):
        """Return owner's full name instead of ID for privacy"""
        return f"{obj.owner.first_name} {obj.owner.last_name}".strip()

    def get_event_count(self, obj):
        """Count all active events for this organization."""
        from events.models import Event

        return Event.objects.filter(organization=obj, status="Active").count()

    def get_is_following(self, obj):
        """Check if the current user is following this organization"""
        request = self.context.get("request")
        if request and hasattr(request, "user") and request.user.is_authenticated:
            return obj.followers.filter(pk=request.user.pk).exists()
        return False

    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "description",
            "email",
            "website",
            "phone",
            "address",
            "city",
            "country",
            "logo_url",
            "cover_image_url",
            "twitter_handle",
            "facebook_url",
            "linkedin_url",
            "instagram_handle",
            "organization_type",
            "established_date",
            "owner_name",
            "event_count",
            "is_following",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "owner_name",
            "event_count",
            "is_following",
            "created_at",
        ]


class CollaboratorOrganizationSerializer(PublicOrganizationSerializer):
    """Serializer for collaborators with is_collaborator flag."""

    is_collaborator = serializers.SerializerMethodField()

    def get_is_collaborator(self, obj):
        """Check if the current user is a collaborator"""
        request = self.context.get("request")
        if request and hasattr(request, "user") and request.user.is_authenticated:
            return obj.collaborators.filter(pk=request.user.pk).exists()
        return False

    class Meta(PublicOrganizationSerializer.Meta):
        fields = PublicOrganizationSerializer.Meta.fields + ["is_collaborator"]
        read_only_fields = PublicOrganizationSerializer.Meta.read_only_fields + [
            "is_collaborator"
        ]


class OrganizationSerializer(serializers.ModelSerializer):
    """Full serializer for organization owners - includes sensitive fields"""

    owner_id = serializers.IntegerField(read_only=True)
    owner_name = serializers.SerializerMethodField()
    event_count = serializers.SerializerMethodField()
    collaborators = serializers.SerializerMethodField()
    is_collaborator = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()

    def get_owner_name(self, obj):
        """Return owner's full name"""
        return f"{obj.owner.first_name} {obj.owner.last_name}".strip()

    def get_event_count(self, obj):
        """Count all active events for this organization."""
        from events.models import Event

        return Event.objects.filter(organization=obj, status="Active").count()

    def get_collaborators(self, obj):
        """Return list of collaborator usernames"""
        return [
            {
                "id": user.id,
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,
            }
            for user in obj.collaborators.all()
        ]

    def get_is_collaborator(self, obj):
        """Check if the current user is a collaborator"""
        request = self.context.get("request")
        if request and hasattr(request, "user") and request.user.is_authenticated:
            return obj.collaborators.filter(pk=request.user.pk).exists()
        return False

    def get_is_following(self, obj):
        """Check if the current user is following this organization"""
        request = self.context.get("request")
        if request and hasattr(request, "user") and request.user.is_authenticated:
            return obj.followers.filter(pk=request.user.pk).exists()
        return False

    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "description",
            "owner_id",
            "owner_name",
            "email",
            "website",
            "phone",
            "address",
            "city",
            "country",
            "logo_url",
            "cover_image_url",
            "twitter_handle",
            "facebook_url",
            "linkedin_url",
            "instagram_handle",
            "organization_type",
            "established_date",
            "event_count",
            "collaborators",
            "is_collaborator",
            "is_following",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "owner_id",
            "owner_name",
            "event_count",
            "collaborators",
            "is_collaborator",
            "is_following",
            "created_at",
            "updated_at",
        ]
