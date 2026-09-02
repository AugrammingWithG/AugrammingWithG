#!/usr/bin/env python3
"""
Regenerates github-fingerprint.svg from live GitHub contribution data.

Env vars required:
  GH_LOGIN  - GitHub username, e.g. "AugrammingWithG"
  GH_TOKEN  - a token with access to GraphQL contributionsCollection
              (the default Actions GITHUB_TOKEN works for public data;
              use a classic PAT with no extra scopes if it doesn't)

Optional env vars:
  OUTPUT_PATH        - where to write the SVG (default: assets/github-fingerprint.svg)
  CONTRIB_MAX_AXIS   - normalization max for the "Total Contributions" axis (default: 500)
  STREAK_MAX_AXIS    - normalization max for the streak axes, in days (default: 14)
"""

import os
import sys
import json
import datetime
import urllib.request
import urllib.error

GH_LOGIN = os.environ.get("GH_LOGIN")
GH_TOKEN = os.environ.get("GH_TOKEN")
OUTPUT_PATH = os.environ.get("OUTPUT_PATH", "assets/github-fingerprint.svg")
CONTRIB_MAX_AXIS = float(os.environ.get("CONTRIB_MAX_AXIS", "500"))
STREAK_MAX_AXIS = float(os.environ.get("STREAK_MAX_AXIS", "14"))

API_ROOT = "https://api.github.com"
GRAPHQL_URL = f"{API_ROOT}/graphql"

if not GH_LOGIN or not GH_TOKEN:
    print("GH_LOGIN and GH_TOKEN must be set", file=sys.stderr)
    sys.exit(1)


def gh_request(url, data=None, headers=None):
    headers = headers or {}
    headers.setdefault("Authorization", f"Bearer {GH_TOKEN}")
    headers.setdefault("Accept", "application/vnd.github+json")
    headers.setdefault("User-Agent", "fingerprint-svg-bot")
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method="POST" if data else "GET")
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code} calling {url}: {e.read().decode('utf-8')}", file=sys.stderr)
        raise


def get_account_created_date():
    data = gh_request(f"{API_ROOT}/users/{GH_LOGIN}")
    created = data["created_at"]  # e.g. "2023-09-22T04:00:00Z"
    return datetime.date.fromisoformat(created[:10])


def get_contribution_days(start_date, end_date):
    """GraphQL contributionsCollection only accepts <=1 year windows, so we
    walk the range in <=365-day chunks and stitch the results together."""
    query = """
    query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                date
                contributionCount
              }
            }
          }
        }
      }
    }
    """
    all_days = {}
    total = 0
    cursor = start_date
    while cursor <= end_date:
        chunk_end = min(cursor + datetime.timedelta(days=364), end_date)
        variables = {
            "login": GH_LOGIN,
            "from": f"{cursor.isoformat()}T00:00:00Z",
            "to": f"{chunk_end.isoformat()}T23:59:59Z",
        }
        payload = gh_request(GRAPHQL_URL, data={"query": query, "variables": variables})
        if "errors" in payload:
            print(json.dumps(payload["errors"], indent=2), file=sys.stderr)
            sys.exit(1)
        calendar = payload["data"]["user"]["contributionsCollection"]["contributionCalendar"]
        total += calendar["totalContributions"]
        for week in calendar["weeks"]:
            for day in week["contributionDays"]:
                d = datetime.date.fromisoformat(day["date"])
                all_days[d] = day["contributionCount"]
        cursor = chunk_end + datetime.timedelta(days=1)
    return total, all_days


def compute_streaks(day_counts):
    """day_counts: dict[date] -> contributionCount, contiguous daily coverage."""
    if not day_counts:
        return 0, (None, None), 0, (None, None)

    ordered_dates = sorted(day_counts.keys())
    today = ordered_dates[-1]

    # current streak: walk backward from the most recent day with data
    current_len = 0
    cur_end = today
    d = today
    while d in day_counts and day_counts[d] > 0:
        current_len += 1
        d -= datetime.timedelta(days=1)
    cur_start = cur_end - datetime.timedelta(days=current_len - 1) if current_len else None

    # longest streak: single pass over the sorted date range
    longest_len = 0
    longest_range = (None, None)
    run_len = 0
    run_start = None
    prev_date = None
    for d in ordered_dates:
        if day_counts[d] > 0:
            if run_len == 0:
                run_start = d
            run_len += 1
            prev_date = d
            if run_len > longest_len:
                longest_len = run_len
                longest_range = (run_start, prev_date)
        else:
            run_len = 0

    return current_len, (cur_start, cur_end) if current_len else (None, None), longest_len, longest_range


def fmt_range(start, end):
    if start is None:
        return "—"
    if start == end:
        return start.strftime("%b %-d")
    if start.year == end.year and start.month == end.month:
        return f"{start.strftime('%b %-d')} – {end.strftime('%-d')}"
    if start.year == end.year:
        return f"{start.strftime('%b %-d')} – {end.strftime('%b %-d')}"
    return f"{start.strftime('%b %-d, %Y')} – {end.strftime('%b %-d, %Y')}"


def polar(angle_deg, radius, cx=0.0, cy=0.0):
    theta = datetime_safe_radians(angle_deg)
    import math
    x = cx + radius * math.sin(theta)
    y = cy - radius * math.cos(theta)
    return x, y


def datetime_safe_radians(deg):
    import math
    return math.radians(deg)


def build_svg(total_contrib, since_date, current_len, current_range, longest_len, longest_range):
    R = 190.0
    frac_contrib = max(0.06, min(1.0, total_contrib / CONTRIB_MAX_AXIS))
    frac_current = max(0.06, min(1.0, current_len / STREAK_MAX_AXIS))
    frac_longest = max(0.06, min(1.0, longest_len / STREAK_MAX_AXIS))

    v0 = polar(0, R * frac_contrib)
    v1 = polar(120, R * frac_longest)
    v2 = polar(240, R * frac_current)

    points = f"{v0[0]:.1f},{v0[1]:.1f} {v1[0]:.1f},{v1[1]:.1f} {v2[0]:.1f},{v2[1]:.1f}"

    since_str = since_date.strftime("%b %-d, %Y")
    current_range_str = fmt_range(*current_range)
    longest_range_str = fmt_range(*longest_range)

    svg = f"""<svg width="720" height="760" viewBox="0 0 720 760" xmlns="http://www.w3.org/2000/svg">
  <title>GitHub contribution fingerprint</title>
  <defs>
    <filter id="dotGlow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <rect x="0" y="0" width="720" height="760" fill="#000000"/>

  <text x="40" y="62" font-family="'Arial Black','Helvetica Neue',Helvetica,Arial,sans-serif" font-size="32" font-weight="800" letter-spacing="0.5" fill="#FFFFFF">CONTRIBUTION FINGERPRINT</text>
  <line x1="40" y1="92" x2="680" y2="92" stroke="#2A2A2E" stroke-width="1"/>

  <g transform="translate(40,132)">
    <circle cx="8" cy="0" r="8" fill="#CFD0D4"/>
    <text x="26" y="5" font-family="-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-size="16" fill="#E6E6E9">You</text>
  </g>
  <text x="40" y="166" font-family="ui-monospace,'SF Mono','Cascadia Code','Roboto Mono',monospace" font-size="11.5" fill="#6E6E76">{GH_LOGIN} · {since_str} – Present</text>

  <g transform="translate(360,468)">
    <circle cx="0" cy="0" r="47.5" fill="none" stroke="#2E2E32" stroke-width="1" stroke-dasharray="3 4"/>
    <circle cx="0" cy="0" r="95" fill="none" stroke="#2E2E32" stroke-width="1" stroke-dasharray="3 4"/>
    <circle cx="0" cy="0" r="142.5" fill="none" stroke="#2E2E32" stroke-width="1" stroke-dasharray="3 4"/>
    <circle cx="0" cy="0" r="190" fill="none" stroke="#3A3A3E" stroke-width="1" stroke-dasharray="3 4"/>

    <line x1="0" y1="0" x2="0" y2="-190" stroke="#2E2E32" stroke-width="1" stroke-dasharray="3 4"/>
    <line x1="0" y1="0" x2="164.5" y2="95" stroke="#2E2E32" stroke-width="1" stroke-dasharray="3 4"/>
    <line x1="0" y1="0" x2="-164.5" y2="95" stroke="#2E2E32" stroke-width="1" stroke-dasharray="3 4"/>

    <path d="M-5,0 L5,0 M0,-5 L0,5" stroke="#55555A" stroke-width="1"/>

    <polygon points="{points}" fill="#CFD0D4" fill-opacity="0.28" stroke="#CFD0D4" stroke-width="2" stroke-linejoin="round"/>

    <g fill="#FFFFFF" filter="url(#dotGlow)">
      <circle cx="{v0[0]:.1f}" cy="{v0[1]:.1f}" r="5"/>
      <circle cx="{v1[0]:.1f}" cy="{v1[1]:.1f}" r="5"/>
      <circle cx="{v2[0]:.1f}" cy="{v2[1]:.1f}" r="5"/>
    </g>

    <g text-anchor="middle">
      <text x="0" y="-214" font-family="-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-size="15" fill="#9B9BA2">Total Contributions</text>
      <text x="0" y="-186" font-family="-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-size="24" font-weight="700" fill="#FFFFFF">{total_contrib}</text>
      <text x="0" y="-166" font-family="ui-monospace,'SF Mono','Cascadia Code','Roboto Mono',monospace" font-size="11" fill="#6E6E76">since {since_str}</text>
    </g>

    <g text-anchor="start">
      <text x="182" y="118" font-family="-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-size="15" fill="#9B9BA2">Longest Streak</text>
      <text x="182" y="146" font-family="-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-size="24" font-weight="700" fill="#FFFFFF">{longest_len}</text>
      <text x="182" y="168" font-family="ui-monospace,'SF Mono','Cascadia Code','Roboto Mono',monospace" font-size="11" fill="#6E6E76">{longest_range_str}</text>
    </g>

    <g text-anchor="end">
      <text x="-182" y="118" font-family="-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-size="15" fill="#9B9BA2">Current Streak</text>
      <text x="-182" y="146" font-family="-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-size="24" font-weight="700" fill="#FFFFFF">{current_len}</text>
      <text x="-182" y="168" font-family="ui-monospace,'SF Mono','Cascadia Code','Roboto Mono',monospace" font-size="11" fill="#6E6E76">{current_range_str}</text>
    </g>
  </g>

  <text x="40" y="732" font-family="ui-monospace,'SF Mono','Cascadia Code','Roboto Mono',monospace" font-size="10.5" fill="#4E4E54">axes scaled to {int(CONTRIB_MAX_AXIS)} contributions / {int(STREAK_MAX_AXIS)}-day streaks · updated {datetime.date.today().isoformat()}</text>
</svg>
"""
    return svg


def main():
    since_date = get_account_created_date()
    today = datetime.date.today()
    total_contrib, day_counts = get_contribution_days(since_date, today)
    current_len, current_range, longest_len, longest_range = compute_streaks(day_counts)

    svg = build_svg(total_contrib, since_date, current_len, current_range, longest_len, longest_range)

    os.makedirs(os.path.dirname(OUTPUT_PATH) or ".", exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        f.write(svg)

    print(f"Wrote {OUTPUT_PATH}")
    print(f"  Total contributions: {total_contrib}")
    print(f"  Current streak: {current_len} ({fmt_range(*current_range)})")
    print(f"  Longest streak: {longest_len} ({fmt_range(*longest_range)})")


if __name__ == "__main__":
    main()
