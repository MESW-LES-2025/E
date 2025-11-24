# Generated migration to make organization field required

import django.db.models.deletion
from django.db import migrations, models


def delete_events_without_organization(apps, schema_editor):
    """Delete events that don't have an organization"""
    Event = apps.get_model("events", "Event")
    Event.objects.filter(organization__isnull=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("events", "0010_event_organization"),
        ("accounts", "0005_organization_address_organization_city_and_more"),
    ]

    operations = [
        # First, delete events without organizations
        migrations.RunPython(
            delete_events_without_organization, migrations.RunPython.noop
        ),
        # Then make the field non-nullable
        migrations.AlterField(
            model_name="event",
            name="organization",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="events",
                to="accounts.organization",
                null=False,
            ),
        ),
    ]
