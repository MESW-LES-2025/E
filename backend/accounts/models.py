# from django.db import models
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver


# Create your models here.
class User(AbstractUser):
    first_name = models.CharField(max_length=30)
    last_name = models.CharField(max_length=30)
    email = models.EmailField(unique=True)


class Organization(models.Model):
    class OrganizationType(models.TextChoices):
        COMPANY = "COMPANY", "Company"
        NON_PROFIT = "NON_PROFIT", "Non-profit"
        COMMUNITY = "COMMUNITY", "Community"
        EDUCATIONAL = "EDUCATIONAL", "Educational"
        GOVERNMENT = "GOVERNMENT", "Government"
        OTHER = "OTHER", "Other"

    # Basic information
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="owned_organizations",
        on_delete=models.CASCADE,
    )

    # Contact information
    email = models.EmailField(blank=True, null=True, unique=True)
    website = models.URLField(blank=True)
    phone = models.CharField(max_length=20, blank=True)

    # Location
    address = models.CharField(max_length=500, blank=True)
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)

    # Branding
    logo_url = models.URLField(blank=True, null=True)
    cover_image_url = models.URLField(blank=True, null=True)

    # Social media
    twitter_handle = models.CharField(max_length=100, blank=True)
    facebook_url = models.URLField(blank=True)
    linkedin_url = models.URLField(blank=True)
    instagram_handle = models.CharField(max_length=100, blank=True)

    # Metadata
    organization_type = models.CharField(
        max_length=50,
        choices=OrganizationType.choices,
        blank=True,
    )
    established_date = models.DateField(null=True, blank=True)

    # Collaborators (organizers who can manage events but not the organization)
    collaborators = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="collaborating_organizations",
        blank=True,
        help_text=(
            "Organizers who can create, update, and cancel events "
            "for this organization"
        ),
    )

    # Followers (users who want to track this organization's events)
    followers = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="followed_organizations",
        blank=True,
        help_text="Users who follow this organization to track its events",
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Profile(models.Model):
    class Role(models.TextChoices):
        ATTENDEE = "ATTENDEE", "Attendee"
        ORGANIZER = "ORGANIZER", "Organizer"
        ADMIN = "ADMIN", "Admin"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.ATTENDEE,
    )
    phone_number = models.CharField(max_length=15, blank=True)
    bio = models.TextField(blank=True)
    # later add birth_date, etc.

    class Meta:
        ordering = ["user__first_name", "user__last_name"]

    def __str__(self):
        return f"{self.user.username} Profile"


@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    if kwargs.get("raw", False):
        return

    if created:
        Profile.objects.create(user=instance)
    else:
        Profile.objects.get_or_create(user=instance)
