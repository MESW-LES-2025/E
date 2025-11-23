# Generated manually to merge conflicting migrations

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("events", "0011_make_organization_required"),
        ("events", "0011_remove_event_registered_users_alter_event_organizer"),
    ]

    operations = [
        # This is a merge migration - no operations needed
        # Both branches have been merged
    ]
