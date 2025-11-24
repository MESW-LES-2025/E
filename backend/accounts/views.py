from rest_framework.decorators import action
from rest_framework.mixins import CreateModelMixin, RetrieveModelMixin, UpdateModelMixin
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet, ModelViewSet

from events.models import Event
from events.serializers import EventSerializer

from .models import Organization, Profile
from .permissions import IsOrganizerOrReadOnly
from .serializers import (
    CollaboratorOrganizationSerializer,
    OrganizationSerializer,
    ProfileSerializer,
    PublicOrganizationSerializer,
    UserSerializer,
)


class ProfileViewSet(
    CreateModelMixin, RetrieveModelMixin, UpdateModelMixin, GenericViewSet
):

    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        profile, _ = Profile.objects.get_or_create(user=self.request.user)
        return profile

    @action(detail=False, methods=["get", "put", "patch"], url_path="me")
    def me(self, request, *args, **kwargs):
        profile = self.get_object()

        if request.method in ("PUT", "PATCH"):
            partial = request.method == "PATCH"
            serializer = self.get_serializer(
                profile, data=request.data, partial=partial
            )
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            # Refresh profile from DB to get updated data
            profile.refresh_from_db()
            # Create new serializer with updated profile
            serializer = self.get_serializer(profile)
        else:
            serializer = self.get_serializer(profile)

        return Response(serializer.data)


class OrganizationViewSet(ModelViewSet):
    """ViewSet for organizations with public read access and restricted write"""

    queryset = Organization.objects.all()
    permission_classes = [IsOrganizerOrReadOnly]

    def get_permissions(self):
        """Different permissions for different actions"""
        # Use IsOrganizerOrReadOnly which handles:
        # - Public read access
        # - ORGANIZER role required for create
        # - Owner-only for update/delete
        return [IsOrganizerOrReadOnly()]

    def get_serializer_class(self):
        """Use appropriate serializer based on user role:
        - Owners: OrganizationSerializer (full access)
        - Collaborators: CollaboratorOrganizationSerializer (event management only)
        - Public: PublicOrganizationSerializer (read-only)
        """
        if self.action in ["list", "retrieve"]:
            # Check if user is viewing their own organization or is a collaborator
            if hasattr(self, "request") and self.request.user.is_authenticated:
                if self.action == "retrieve":
                    try:
                        obj = self.get_object()
                        # Return full serializer for owners
                        if obj.owner == self.request.user:
                            return OrganizationSerializer
                        # Return collaborator serializer (no owner fields)
                        if obj.collaborators.filter(pk=self.request.user.pk).exists():
                            return CollaboratorOrganizationSerializer
                    except Exception:
                        pass
                # Check if any organizations in list belong to user
                # For list, we'll use public serializer (can optimize later)
                return PublicOrganizationSerializer
            # Unauthenticated users get public serializer
            return PublicOrganizationSerializer
        # Create/update/delete always use full serializer (requires auth)
        return OrganizationSerializer

    def get_queryset(self):
        """All organizations are publicly viewable"""
        return Organization.objects.all().select_related("owner")

    def perform_create(self, serializer):
        """Set owner when creating organization"""
        serializer.save(owner=self.request.user)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def me(self, request):
        """Get organizations owned by user and where user is a collaborator."""
        if not request.user.is_authenticated:
            from rest_framework.exceptions import NotAuthenticated

            raise NotAuthenticated()

        # Get owned organizations
        owned_organizations = Organization.objects.filter(
            owner=request.user
        ).select_related("owner")

        # Get organizations where user is a collaborator
        collaborated_organizations = Organization.objects.filter(
            collaborators=request.user
        ).select_related("owner")

        # Serialize both
        owned_serializer = OrganizationSerializer(
            owned_organizations, many=True, context={"request": request}
        )
        collaborated_serializer = OrganizationSerializer(
            collaborated_organizations, many=True, context={"request": request}
        )

        return Response(
            {
                "owned": owned_serializer.data,
                "collaborated": collaborated_serializer.data,
            }
        )

    @action(detail=True, methods=["get"], permission_classes=[AllowAny])
    def events(self, request, pk=None):
        """Get events for this organization.
        - Public users: Only active events
        - Owners and collaborators: All events (Active, Cancelled, etc.)
        """
        organization = self.get_object()

        # Check if user is owner or collaborator
        is_owner_or_collaborator = False
        if request.user.is_authenticated:
            is_owner = organization.owner == request.user
            is_collaborator = organization.collaborators.filter(
                pk=request.user.pk
            ).exists()
            is_owner_or_collaborator = is_owner or is_collaborator

        # Filter events based on user role
        if is_owner_or_collaborator:
            # Owners and collaborators see ALL events regardless of status
            # No status filter applied - shows Active, Cancelled, and any other status
            events = Event.objects.filter(organization=organization).order_by("date")
        else:
            # Public users only see active events
            events = Event.objects.filter(
                organization=organization, status="Active"
            ).order_by("date")

        serializer = EventSerializer(events, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def search_users(self, request):
        """Search users by username with advanced string matching"""
        from django.contrib.auth import get_user_model
        from django.db.models import Q

        User = get_user_model()
        query = request.query_params.get("q", "").strip()

        if not query or len(query) < 2:
            return Response(
                {"detail": "Query must be at least 2 characters"}, status=400
            )

        # Advanced string matching: search in username, first_name, last_name, email
        # Using icontains for case-insensitive partial matching
        users = User.objects.filter(
            Q(username__icontains=query)
            | Q(first_name__icontains=query)
            | Q(last_name__icontains=query)
            | Q(email__icontains=query)
        ).select_related("profile")[
            :20
        ]  # Limit to 20 results

        # Only return users with ORGANIZER role
        organizer_users = [
            user
            for user in users
            if hasattr(user, "profile") and user.profile.role == Profile.Role.ORGANIZER
        ]

        serializer = UserSerializer(organizer_users, many=True)
        return Response(serializer.data)

    @action(
        detail=True,
        methods=["post", "delete"],
        permission_classes=[IsAuthenticated],
        url_path="collaborators/(?P<user_id>[^/.]+)",
    )
    def manage_collaborator(self, request, pk=None, user_id=None):
        """Add or remove a collaborator from an organization"""
        from django.contrib.auth import get_user_model

        User = get_user_model()
        organization = self.get_object()

        # Only owner can manage collaborators
        if organization.owner != request.user:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied(
                "Only the organization owner can manage collaborators"
            )

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            from rest_framework.exceptions import NotFound

            raise NotFound("User not found")

        # Ensure user is an organizer
        if not hasattr(user, "profile") or user.profile.role != Profile.Role.ORGANIZER:
            from rest_framework.exceptions import ValidationError

            raise ValidationError("Only users with ORGANIZER role can be collaborators")

        if request.method == "POST":
            # Add collaborator
            if organization.collaborators.filter(pk=user_id).exists():
                return Response(
                    {"detail": "User is already a collaborator"}, status=400
                )
            organization.collaborators.add(user)
            return Response({"detail": "Collaborator added successfully"}, status=200)
        else:  # DELETE
            # Remove collaborator
            if not organization.collaborators.filter(pk=user_id).exists():
                return Response({"detail": "User is not a collaborator"}, status=400)
            organization.collaborators.remove(user)
            return Response({"detail": "Collaborator removed successfully"}, status=200)

    @action(
        detail=True,
        methods=["get"],
        permission_classes=[IsAuthenticated],
        url_path="collaborators",
    )
    def list_collaborators(self, request, pk=None):
        """List all collaborators for an organization"""
        organization = self.get_object()

        # Only owner can view collaborators
        if organization.owner != request.user:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Only the organization owner can view collaborators")

        collaborators = organization.collaborators.all()
        serializer = UserSerializer(collaborators, many=True)
        return Response(serializer.data)

    @action(
        detail=True,
        methods=["post", "delete"],
        permission_classes=[IsAuthenticated],
        url_path="follow",
    )
    def manage_follow(self, request, pk=None):
        """Follow or unfollow an organization"""
        organization = self.get_object()

        if request.method == "POST":
            # Follow organization
            if organization.followers.filter(pk=request.user.pk).exists():
                return Response(
                    {"detail": "You are already following this organization"},
                    status=400,
                )
            organization.followers.add(request.user)
            return Response(
                {"detail": "Organization followed successfully"}, status=200
            )
        else:  # DELETE
            # Unfollow organization
            if not organization.followers.filter(pk=request.user.pk).exists():
                return Response(
                    {"detail": "You are not following this organization"}, status=400
                )
            organization.followers.remove(request.user)
            return Response(
                {"detail": "Organization unfollowed successfully"}, status=200
            )

    @action(
        detail=False,
        methods=["get"],
        permission_classes=[IsAuthenticated],
        url_path="followed",
    )
    def followed(self, request):
        """Get all organizations the current user is following"""
        followed_organizations = Organization.objects.filter(
            followers=request.user
        ).select_related("owner")

        serializer = PublicOrganizationSerializer(
            followed_organizations, many=True, context={"request": request}
        )
        return Response(serializer.data)
