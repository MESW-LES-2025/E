"""
Utility functions for event management.
"""


def detect_critical_changes(old_event, new_data):
    """
    Detect if critical fields have changed in an event update.

    Critical fields: date, location, status
    Non-critical fields: name, description, category, capacity

    Args:
        old_event: The Event instance before update
        new_data: Dictionary with new field values from request

    Returns:
        Dictionary with change information if critical changes detected:
        {
            'changes': [
                {
                    'field': 'date'|'location'|'status',
                    'old_value': old_value,
                    'new_value': new_value
                }
            ]
        }
        None if no critical changes detected
    """
    changes = []

    # Check date changes
    if "date" in new_data:
        new_date = new_data["date"]
        # Handle both string and datetime objects
        if isinstance(new_date, str):
            from django.utils.dateparse import parse_datetime

            new_date = parse_datetime(new_date)

        if new_date and old_event.date != new_date:
            changes.append(
                {
                    "field": "date",
                    "old_value": old_event.date.isoformat() if old_event.date else None,
                    "new_value": new_date.isoformat() if new_date else None,
                }
            )

    # Check location changes
    if "location" in new_data:
        new_location = new_data["location"]
        old_location = old_event.location or ""
        new_location_str = new_location or ""

        if old_location.strip() != new_location_str.strip():
            changes.append(
                {
                    "field": "location",
                    "old_value": old_location,
                    "new_value": new_location_str,
                }
            )

    # Check status changes
    if "status" in new_data:
        new_status = new_data["status"]
        if old_event.status != new_status:
            changes.append(
                {
                    "field": "status",
                    "old_value": old_event.status,
                    "new_value": new_status,
                }
            )

    if changes:
        return {"changes": changes}

    return None
