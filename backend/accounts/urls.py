from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import OrganizationViewSet, ProfileViewSet

router = DefaultRouter()
router.register("profile", ProfileViewSet, basename="profile")
router.register("organizations", OrganizationViewSet, basename="organizations")

urlpatterns = [
    path("", include(router.urls)),
]
