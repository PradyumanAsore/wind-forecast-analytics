"""
Timezone, calendar, and UK settlement period utility functions.
Strictly manages UTC vs Europe/London timestamps and DST transitions.
"""
from datetime import date, datetime, time, timedelta
from typing import List, Tuple
from zoneinfo import ZoneInfo

LONDON_TZ = ZoneInfo("Europe/London")
UTC_TZ = ZoneInfo("UTC")


def parse_iso_datetime(dt_str: str) -> datetime:
    """Parses an ISO format datetime string into a timezone-aware UTC datetime."""
    # Replace Z with +00:00 if present
    cleaned = dt_str.replace("Z", "+00:00")
    dt = datetime.fromisoformat(cleaned)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC_TZ)
    return dt.astimezone(UTC_TZ)


def to_uk_local(dt: datetime) -> datetime:
    """Converts any timezone-aware datetime to Europe/London."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC_TZ)
    return dt.astimezone(LONDON_TZ)


def format_uk_local(dt: datetime) -> str:
    """Formats a datetime as 'YYYY-MM-DD HH:MM' in UK local time."""
    return to_uk_local(dt).strftime("%Y-%m-%d %H:%M")


def get_decision_cutoff_utc(delivery_date: date, cutoff_time_str: str = "11:00") -> datetime:
    """
    Computes the Day-Ahead purchasing decision cutoff in UTC for a given delivery date.
    
    UK Wholesale Day-Ahead market timeline:
    The order books for the day-ahead auction close on the day preceding delivery (D-1)
    at 11:00 London local time (EPEX SPOT GB Day-Ahead Auction).
    
    Args:
        delivery_date: The date of electricity delivery (day D).
        cutoff_time_str: Cutoff time formatted as 'HH:MM' (default '11:00').
        
    Returns:
        Timezone-aware UTC datetime of the cutoff on D-1.
    """
    parts = cutoff_time_str.split(":")
    hour = int(parts[0])
    minute = int(parts[1]) if len(parts) > 1 else 0
    
    cutoff_date = delivery_date - timedelta(days=1)
    # Construct cutoff in UK local time on D-1
    local_cutoff = datetime(cutoff_date.year, cutoff_date.month, cutoff_date.day, hour, minute, tzinfo=LONDON_TZ)
    return local_cutoff.astimezone(UTC_TZ)


def get_expected_settlement_intervals(target_date: date) -> List[Tuple[int, datetime, str]]:
    """
    Generates all expected half-hour settlement intervals for a delivery date in the UK.
    Accurately accounts for standard 48-period days, 46-period days (spring clock change),
    and 50-period days (fall clock change).
    
    Returns:
        List of tuples: (settlement_period_num, interval_start_utc, formatted_local_time)
    """
    # Start of day in Europe/London
    day_start_local = datetime(target_date.year, target_date.month, target_date.day, 0, 0, tzinfo=LONDON_TZ)
    day_end_local = day_start_local + timedelta(days=1)
    
    day_start_utc = day_start_local.astimezone(UTC_TZ)
    day_end_utc = day_end_local.astimezone(UTC_TZ)
    
    intervals = []
    current_utc = day_start_utc
    period = 1
    
    while current_utc < day_end_utc:
        local_str = format_uk_local(current_utc)
        intervals.append((period, current_utc, local_str))
        current_utc += timedelta(minutes=30)
        period += 1
        
    return intervals
