from rest_framework.decorators import action
from rest_framework.mixins import CreateModelMixin, RetrieveModelMixin, UpdateModelMixin
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet, ModelViewSet

from .models import Organization, Profile
from .permissions import IsOrganizerOrReadOnly
from .serializers import (
    OrganizationSerializer,
    ProfileSerializer,
    PublicOrganizationSerializer,
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
        """Use public serializer for non-owners, full serializer for owners"""
        if self.action in ["list", "retrieve"]:
            # Check if user is viewing their own organization
            if hasattr(self, "request") and self.request.user.is_authenticated:
                if self.action == "retrieve":
                    try:
                        obj = self.get_object()
                        if obj.owner == self.request.user:
                            return OrganizationSerializer
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

    @action(detail=True, methods=["get"], permission_classes=[AllowAny])
    def events(self, request, pk=None):
        """Get events organized by this organization's owner (public endpoint)"""
        organization = self.get_object()
        from events.models import Event
        from events.serializers import EventSerializer

        events = Event.objects.filter(
            organizer=organization.owner, status="Active"
        ).order_by("date")

        serializer = EventSerializer(events, many=True, context={"request": request})
        return Response(serializer.data)
