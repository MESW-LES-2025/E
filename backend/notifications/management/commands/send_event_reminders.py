from datetime import timedelta

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.core.management.base import BaseCommand
from django.utils import timezone

from events.models import Event


class Command(BaseCommand):
    help = "Sends event reminders to participants"

    def handle(self, *args, **options):
        now = timezone.now()

        # 24h Reminders
        # Find events happening roughly 24h from now that haven't been notified yet.
        # Window is 15 minutes to account for scheduler drift or downtime.
        remind_24h_events = Event.objects.filter(
            date__gte=now + timedelta(hours=24),
            date__lte=now + timedelta(hours=24, minutes=15),
            reminder_24h_sent=False,
        )

        # 1h Reminders
        remind_1h_events = Event.objects.filter(
            date__gte=now + timedelta(hours=1),
            date__lte=now + timedelta(hours=1, minutes=15),
            reminder_1h_sent=False,
        )

        channel_layer = get_channel_layer()

        for event in remind_24h_events:
            for participant in event.participants.all():
                message = {
                    "type": "send_notification",
                    "message": {
                        "type": "event_reminder",
                        "event_name": event.name,
                        "start_time": event.date.isoformat(),
                        "time_left": "24 hours",
                    },
                }
                async_to_sync(channel_layer.group_send)(
                    f"notifications_{participant.id}", message
                )

            # Mark as sent to prevent duplicates
            event.reminder_24h_sent = True
            event.save(update_fields=["reminder_24h_sent"])

            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully sent 24h reminders for event "{event.name}"'
                )
            )

        for event in remind_1h_events:
            for participant in event.participants.all():
                message = {
                    "type": "send_notification",
                    "message": {
                        "type": "event_reminder",
                        "event_name": event.name,
                        "start_time": event.date.isoformat(),
                        "time_left": "1 hour",
                    },
                }
                async_to_sync(channel_layer.group_send)(
                    f"notifications_{participant.id}", message
                )

            # Mark as sent to prevent duplicates
            event.reminder_1h_sent = True
            event.save(update_fields=["reminder_1h_sent"])

            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully sent 1h reminders for event "{event.name}"'
                )
            )
