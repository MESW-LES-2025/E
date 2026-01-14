import os

from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "notifications"

    def ready(self):
        # Prevent scheduler from running twice when using runserver with autoreload
        if os.environ.get("RUN_MAIN") == "true":
            from apscheduler.schedulers.background import BackgroundScheduler
            from django.core.management import call_command

            def send_reminders():
                # We catch exceptions to prevent the scheduler from crashing
                try:
                    call_command("send_event_reminders")
                except Exception as e:
                    print(f"Error sending reminders: {e}")

            scheduler = BackgroundScheduler()
            # Run every 1 minute
            scheduler.add_job(send_reminders, "interval", minutes=1)
            scheduler.start()
            print("Scheduler started: send_event_reminders running every 1 minute.")
