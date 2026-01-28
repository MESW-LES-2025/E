"""Tests for notifications app configuration"""

import os
from unittest.mock import patch, Mock

from django.test import TestCase, override_settings
from notifications.apps import NotificationsConfig


class NotificationsConfigTest(TestCase):
    """Tests for NotificationsConfig"""

    def test_app_config(self):
        """Test that app config is properly configured"""
        config = NotificationsConfig("notifications", None)
        self.assertEqual(config.name, "notifications")
        self.assertEqual(config.default_auto_field, "django.db.models.BigAutoField")

    @patch("notifications.apps.BackgroundScheduler")
    @patch("django.core.management.call_command")
    @patch("builtins.print")
    @patch.dict(os.environ, {"RUN_MAIN": "true"})
    def test_ready_starts_scheduler(self, mock_print, mock_call_command, mock_scheduler_class):
        """Test that ready() starts scheduler when RUN_MAIN is true"""
        mock_scheduler = Mock()
        mock_scheduler_class.return_value = mock_scheduler

        config = NotificationsConfig("notifications", None)
        config.ready()

        # Verify scheduler was created and configured
        mock_scheduler_class.assert_called_once()
        # Verify job was added with correct parameters
        mock_scheduler.add_job.assert_called_once()
        call_args = mock_scheduler.add_job.call_args
        self.assertEqual(call_args[1]["trigger"], "interval")
        self.assertEqual(call_args[1]["minutes"], 1)
        # Verify scheduler was started
        mock_scheduler.start.assert_called_once()
        # Verify print statement
        mock_print.assert_called()

    @patch("notifications.apps.BackgroundScheduler")
    @patch.dict(os.environ, {"RUN_MAIN": "false"}, clear=False)
    def test_ready_skips_scheduler_when_not_main(self, mock_scheduler_class):
        """Test that ready() skips scheduler when RUN_MAIN is not true"""
        config = NotificationsConfig("notifications", None)
        config.ready()

        # Scheduler should not be started
        mock_scheduler_class.assert_not_called()

    @patch("notifications.apps.BackgroundScheduler")
    @patch("django.core.management.call_command")
    @patch.dict(os.environ, {"RUN_MAIN": "true"})
    def test_ready_handles_scheduler_error(self, mock_call_command, mock_scheduler_class):
        """Test that ready() handles scheduler errors gracefully"""
        mock_scheduler = Mock()
        mock_scheduler_class.return_value = mock_scheduler
        mock_call_command.side_effect = Exception("Command error")

        config = NotificationsConfig("notifications", None)
        config.ready()

        # Should not crash, scheduler should still be started
        mock_scheduler.start.assert_called()

    @patch("notifications.apps.BackgroundScheduler")
    @patch("django.core.management.call_command")
    @patch.dict(os.environ, {"RUN_MAIN": "true"})
    def test_scheduler_job_calls_command(self, mock_call_command, mock_scheduler_class):
        """Test that scheduler job calls send_event_reminders command"""
        mock_scheduler = Mock()
        mock_scheduler_class.return_value = mock_scheduler

        config = NotificationsConfig("notifications", None)
        config.ready()

        # Get the job function that was added
        call_args = mock_scheduler.add_job.call_args
        job_func = call_args[0][0]

        # Call the job function
        job_func()

        # Should call the command
        mock_call_command.assert_called_with("send_event_reminders")

    @patch("notifications.apps.BackgroundScheduler")
    @patch("django.core.management.call_command")
    @patch("builtins.print")
    @patch.dict(os.environ, {"RUN_MAIN": "true"})
    def test_scheduler_job_handles_exception(self, mock_print, mock_call_command, mock_scheduler_class):
        """Test that scheduler job handles exceptions"""
        mock_scheduler = Mock()
        mock_scheduler_class.return_value = mock_scheduler
        mock_call_command.side_effect = Exception("Test error")

        config = NotificationsConfig("notifications", None)
        config.ready()

        # Get the job function
        call_args = mock_scheduler.add_job.call_args
        job_func = call_args[0][0]

        # Call the job function - should not raise
        try:
            job_func()
        except Exception:
            self.fail("Job function should handle exceptions gracefully")

        # Should print error message with the exception
        mock_print.assert_called()
        # Verify the error message format
        print_calls = [str(call) for call in mock_print.call_args_list]
        error_printed = any("Error sending reminders" in str(call) for call in print_calls)
        self.assertTrue(error_printed, "Error message should be printed")
