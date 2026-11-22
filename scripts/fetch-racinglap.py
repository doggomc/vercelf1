#!/usr/bin/env python3
"""Refresh the static F1 Weellz replay catalogue. Run locally: python3 scripts/fetch-racinglap.py
No requests are made by the deployed site. Aborts without replacing the last good index on errors.
"""
import html, json, re, sys, time, urllib.parse, urllib.request
from pathlib import Path
from html.parser import HTMLParser

BASE = 'https://racinglap.net'
OUT = Path(__file__).resolve().parent.parent / 'src/data/racinglap-replays.json'
SEASONS = (2026,)  # Expand explicitly after confirming RacingLap publishes other seasons.
class Links(HTMLParser):
    def __init__(self): super().__init__(); self.anchors=[]; self.current=None; self.buttons=[]; self.button=None; self.in_name=False
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag=='a': self.current={'href':a.get('href',''),'text':''}
        elif tag=='button' and 'chsrc' in a.get('class','').split(): self.button={'url':a.get('data-src',''),'name':''}
        elif tag=='span' and self.button is not None and 'chname' in a.get('class','').split(): self.in_name=True
    def handle_data(self, text):
        if self.current is not None: self.current['text']+=text+' '
        if self.button is not None and self.in_name: self.button['name']+=text
    def handle_endtag(self,tag):
        if tag=='a' and self.current is not None: self.anchors.append(self.current); self.current=None
        if tag=='span': self.in_name=False
        if tag=='button' and self.button is not None: self.buttons.append(self.button); self.button=None

def get(path):
    time.sleep(0.5)
    request=urllib.request.Request(BASE+path,headers={'User-Agent':'FreeF1-Replay-Indexer/1.0','Accept':'text/html'})
    with urllib.request.urlopen(request,timeout=25) as r: return r.read(3_000_000).decode('utf-8')
def parse(text):
    p=Links(); p.feed(text); return p

def main():
    entries=[]; requests=0
    session_map={'race':'race','qualifying':'qualifying','sprint':'sprint','sprint qualifying':'sprint-qualifying','sprint shootout':'sprint-qualifying','practice 1':'fp1','practice 2':'fp2','practice 3':'fp3'}
    for year in SEASONS:
        listing=parse(get(f'/replays?series=f1&year={year}')); requests+=1
        rounds=[]
        for a in listing.anchors:
            u=urllib.parse.urlparse(html.unescape(a['href'])); q=urllib.parse.parse_qs(u.query)
            if u.path=='/replays' and q.get('series')==['f1'] and q.get('year')==[str(year)] and re.fullmatch(r'[a-z0-9-]+',q.get('round',[''])[0]):
                path=u.path+'?'+urllib.parse.urlencode({'series':'f1','year':year,'round':q['round'][0]})
                if path not in rounds: rounds.append(path)
        if not rounds: raise ValueError('No round links found; page structure may have changed')
        for path in rounds:
            text=get(path); requests+=1; page=parse(text)
            match=re.search(r'<div class="rd">\s*Round\s+(\d+)',text)
            if not match: raise ValueError('No round number in '+path)
            round_number=int(match.group(1))
            candidates=[]
            for a in page.anchors:
                m=re.fullmatch(r'/replays/([\w-]+)',a['href']); title=re.search(r'Formula 1\s*-\s*(Sprint Qualifying|Sprint Shootout|Practice [123]|Qualifying|Sprint|Race)\b',a['text'],re.I)
                if m and title:
                    key=session_map[title.group(1).lower()]
                    if (m.group(1),key) not in candidates: candidates.append((m.group(1),key))
            if not candidates: raise ValueError('No F1 sessions in '+path)
            for replay_id,key in candidates:
                session=parse(get('/replays/'+replay_id)); requests+=1; players=[]
                for b in session.buttons:
                    u=urllib.parse.urlparse(b['url']); q=urllib.parse.parse_qs(u.query)
                    if u.scheme=='https' and u.netloc=='weellz.live' and u.path=='/replay' and set(q)=={'id'} and len(q['id'])==1 and re.fullmatch(r'[\w-]+',q['id'][0]):
                        item={'label':'RacingLap · '+b['name'].strip()[:60], 'url':b['url']}
                        if b['name'].strip() and item not in players: players.append(item)
                if players: entries.append({'season':year,'round':round_number,'key':key,'id':replay_id,'sources':players})
    if not entries: raise ValueError('No replay players found; refusing to overwrite index')
    data={'source':BASE+'/replays','items':entries}
    temp=OUT.with_suffix('.tmp'); temp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n'); temp.replace(OUT)
    browser=OUT.parent / 'replays-browser.json'
    combined=json.loads(browser.read_text()); combined['racinglap']=entries
    temp_browser=browser.with_suffix('.tmp'); temp_browser.write_text(json.dumps(combined,ensure_ascii=False,separators=(',',':'))); temp_browser.replace(browser)
    print(f'Saved {len(entries)} sessions, {sum(len(e["sources"]) for e in entries)} feeds, using {requests} RacingLap requests.')
if __name__=='__main__':
    try: main()
    except Exception as e: print('Refresh failed, previous catalogue preserved:',e,file=sys.stderr); sys.exit(1)
