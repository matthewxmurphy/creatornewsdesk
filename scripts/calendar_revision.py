#!/usr/bin/env python3
"""Manage a source revision without changing package compatibility versions."""
import argparse
import datetime as dt
import os
from pathlib import Path
import re
from zoneinfo import ZoneInfo

PATTERN = re.compile(r'^(\d{4})\.([1-9]\d?)\.(\d{2})\.(\d{3})$')

def parse(value):
    match = PATTERN.fullmatch(value)
    if not match:
        raise ValueError('Expected YYYY.M.DD.XXX, for example 2026.10.05.001')
    year, month, day, revision = map(int, match.groups())
    date = dt.date(year, month, day)
    if revision < 1:
        raise ValueError('The daily revision must start at 001')
    return date, revision

def next_revision(current, date):
    previous_date, previous_revision = parse(current)
    if date < previous_date:
        raise ValueError('Cannot move a source revision backwards in time')
    sequence = previous_revision + 1 if date == previous_date else 1
    return f'{date.year}.{date.month}.{date.day:02d}.{sequence:03d}'

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument('--check', action='store_true')
    action.add_argument('--next', action='store_true', help='Preview the next revision without writing')
    action.add_argument('--bump', action='store_true', help='Write the next source revision to VERSION')
    parser.add_argument('--date', type=dt.date.fromisoformat, help='Optional YYYY-MM-DD; defaults to America/Los_Angeles today')
    args = parser.parse_args()
    path = Path(__file__).resolve().parents[1] / 'VERSION'
    current = path.read_text().strip()
    parse(current)
    if args.check:
        print(current)
        return
    date = args.date or dt.datetime.now(ZoneInfo('America/Los_Angeles')).date()
    result = next_revision(current, date)
    if args.bump:
        temporary = path.with_name('VERSION.tmp')
        with temporary.open('x') as stream:
            stream.write(result + '\n')
        os.replace(temporary, path)
    print(result)

if __name__ == '__main__':
    main()
