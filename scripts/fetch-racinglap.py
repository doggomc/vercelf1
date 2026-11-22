#!/usr/bin/env python3
"""Refresh the bundled F1 replay index from RacingLap's public API.

Run manually: python3 scripts/fetch-racinglap.py
One API request per run; deployed visitors make no RacingLap catalogue requests.
The last good catalogue is retained if fetching or validation fails.
"""
import json
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

API = 'https://racinglap.net/api/v1/replays.json'
OUT = Path(__file__).resolve().parent.parent / 'src/data/racinglap-replays.json'
BROWSER = OUT.parent / 'replays-browser.json'
SEASONS = (2026,)
SESSION_TYPES = {'fp1':'fp1', 'fp2':'fp2', 'fp3':'fp3', 'race':'race', 'qualifying':'qualifying',
                 'sprint':'sprint', 'shootout':'sprint-qualifying', 'sprint-qualifying':'sprint-qualifying'}


def valid_embed(value):
    if not isinstance(value, str) or len(value) > 512:
        return False
    try:
        u = urllib.parse.urlsplit(value)
        q = urllib.parse.parse_qs(u.query, keep_blank_values=True, strict_parsing=True)
        return (u.scheme == 'https' and u.netloc == 'weellz.live' and u.path == '/replay'
                and not u.fragment and set(q) == {'id'} and len(q['id']) == 1
                and bool(re.fullmatch(r'[A-Za-z0-9_-]{1,120}', q['id'][0])))
    except ValueError:
        return False


def parse_catalogue(data):
    if not isinstance(data, dict) or data.get('api') != 'racinglap' or data.get('version') != 1 or not isinstance(data.get('replays'), list):
        raise ValueError('Unexpected RacingLap API response')
    entries = []
    for row in data['replays']:
        if not isinstance(row, dict) or not isinstance(row.get('series'), dict) or row['series'].get('key') != 'f1':
            continue
        season, rnd, key, replay_id = row.get('year'), row.get('round'), SESSION_TYPES.get(row.get('type')), row.get('id')
        if season not in SEASONS or not isinstance(rnd, int) or isinstance(rnd, bool) or not 1 <= rnd <= 24 or not key or not isinstance(replay_id, str) or not re.fullmatch(r'[A-Za-z0-9_-]{1,120}', replay_id):
            continue
        feeds = row.get('feeds')
        if not isinstance(feeds, list):
            continue
        sources, seen = [], set()
        for feed in feeds:
            if not isinstance(feed, dict):
                continue
            name, url = feed.get('name'), feed.get('embed')
            if not isinstance(name, str) or not name.strip() or not valid_embed(url) or url in seen:
                continue
            sources.append({'label':'RacingLap · ' + name.strip()[:60], 'url':url})
            seen.add(url)
        if sources:
            entries.append({'season':season, 'round':rnd, 'key':key, 'id':replay_id, 'sources':sources})
    if not entries:
        raise ValueError('No supported F1 replays found; refusing to overwrite index')
    return entries


def main():
    request = urllib.request.Request(API, headers={'User-Agent':'FreeF1-Replay-Indexer/1.0', 'Accept':'application/json'})
    with urllib.request.urlopen(request, timeout=25) as response:
        raw = response.read(3_000_001)
    if len(raw) > 3_000_000:
        raise ValueError('RacingLap API response too large')
    entries = parse_catalogue(json.loads(raw))
    combined = json.loads(BROWSER.read_text(encoding='utf-8'))
    if not isinstance(combined, dict) or not isinstance(combined.get('items'), list):
        raise ValueError('FullRaces browser index is invalid')
    combined['racinglap'] = entries
    data = {'source':API, 'items':entries}
    temp, temp_browser = OUT.with_suffix('.tmp'), BROWSER.with_suffix('.tmp')
    try:
        temp.write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
        temp_browser.write_text(json.dumps(combined, ensure_ascii=False, separators=(',',':')), encoding='utf-8')
        temp.replace(OUT)
        temp_browser.replace(BROWSER)
    finally:
        temp.unlink(missing_ok=True)
        temp_browser.unlink(missing_ok=True)
    print(f'Saved {len(entries)} sessions, {sum(len(e["sources"]) for e in entries)} feeds, using 1 RacingLap API request.')

if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print('Refresh failed:', exc, file=sys.stderr)
        sys.exit(1)
