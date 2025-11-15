from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import Organization, Profile, User


# Register your models here.
@admin.register(User)
class UserAdmin(BaseUserAdmin):
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "username",
                    "first_name",
                    "last_name",
                    "email",
                    "password1",
                    "password2",
                ),
            },
        ),
    )


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "role", "phone_number")
    list_editable = ("role",)
    list_per_page = 10
    list_select_related = ("user",)
    ordering = ("user__first_name", "user__last_name", "role")
    search_fields = ("user__username", "user__first_name", "user__last_name", "role")


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "owner", "created_at")
    list_select_related = ("owner",)
    search_fields = ("name", "owner__username", "owner__email")
