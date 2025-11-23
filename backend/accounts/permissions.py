from rest_framework import permissions

from .models import Profile


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission:
    - Anyone can read (GET, HEAD, OPTIONS)
    - Only the owner can write (POST, PUT, PATCH, DELETE)
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to anyone
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to the owner
        return obj.owner == request.user


class IsOrganizerOrReadOnly(permissions.BasePermission):
    """
    Custom permission:
    - Anyone can read (GET, HEAD, OPTIONS)
    - Only authenticated users with ORGANIZER role can create
    - Only the owner can update/delete (collaborators cannot edit organization)
    """

    def has_permission(self, request, view):
        # Read permissions are allowed to anyone
        if request.method in permissions.SAFE_METHODS:
            return True

        # Create requires authentication and ORGANIZER role
        if request.method == "POST":
            if not request.user or not request.user.is_authenticated:
                return False
            try:
                profile = request.user.profile
                return profile.role == Profile.Role.ORGANIZER
            except Profile.DoesNotExist:
                return False

        # Update/delete are handled by has_object_permission
        return True

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to anyone
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to the owner (not collaborators)
        return obj.owner == request.user


class IsAuthenticatedOrCreate(permissions.BasePermission):
    """
    Custom permission:
    - Anyone can create (POST)
    - Only authenticated users can read/update/delete
    """

    def has_permission(self, request, view):
        # Allow creation without authentication
        if request.method == "POST":
            return True

        # Other methods require authentication
        return request.user and request.user.is_authenticated
