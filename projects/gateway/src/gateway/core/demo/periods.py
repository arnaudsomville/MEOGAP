"""Inclusive UTC month-period helpers for the deterministic M0 demo."""

from __future__ import annotations

import calendar

from fastapi import status

from gateway.core.demo.constants import MONTH_PATTERN, MONTHS_PER_YEAR
from gateway.core.demo.errors import DemoError


def month_sequence(start_month: str, end_month: str) -> list[str]:
    """Return the inclusive YYYY-MM month sequence between two bounds.

    Args:
    ----
        start_month(str): inclusive start month.
        end_month(str): inclusive end month.

    Returns:
    -------
        list[str]: ordered inclusive months.

    """
    year, month = (int(part) for part in start_month.split('-'))
    end_year, end = (int(part) for part in end_month.split('-'))
    months: list[str] = []
    while (year, month) <= (end_year, end):
        months.append(f'{year:04d}-{month:02d}')
        month += 1
        if month > MONTHS_PER_YEAR:
            year += 1
            month = 1
    return months


def evenly_spaced_months(start_month: str, end_month: str, count: int) -> list[str]:
    """Select evenly spaced inclusive months from a request period.

    Args:
    ----
        start_month(str): inclusive request start month.
        end_month(str): inclusive request end month.
        count(int): requested number of mock frames.

    Returns:
    -------
        list[str]: selected YYYY-MM months.

    """
    months = month_sequence(start_month, end_month)
    if len(months) <= count:
        return months
    if count <= 1:
        return [months[0]]
    indexes = [round(index * (len(months) - 1) / (count - 1)) for index in range(count)]
    return [months[index] for index in dict.fromkeys(indexes)]


def month_end(month: str) -> str:
    """Return the last UTC date of a YYYY-MM month.

    Args:
    ----
        month(str): YYYY-MM month.

    Returns:
    -------
        str: ISO date for the last day of the month.

    """
    year, month_number = (int(part) for part in month.split('-'))
    return f'{month}-{calendar.monthrange(year, month_number)[1]:02d}'


def validate_period(start_month: str, end_month: str) -> None:
    """Validate an inclusive month range.

    Args:
    ----
        start_month(str): inclusive start month.
        end_month(str): inclusive end month.

    Raises:
    ------
        DemoError: when either month is invalid or the range is inverted.

    """
    if not MONTH_PATTERN.fullmatch(start_month) or not MONTH_PATTERN.fullmatch(end_month):
        raise DemoError(status.HTTP_422_UNPROCESSABLE_ENTITY, 'INVALID_PERIOD', 'Months must use YYYY-MM format.')
    if start_month > end_month:
        raise DemoError(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            'INVALID_PERIOD',
            'The start month must be on or before the end month.',
        )
