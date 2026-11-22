#!/usr/bin/env python3
import importlib.util
from pathlib import Path
spec=importlib.util.spec_from_file_location('indexer',Path(__file__).with_name('fetch-racinglap.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
feed={'name':'F1 TV','embed':'https://weellz.live/replay?id=abc-f1tv'}
row={'series':{'key':'f1'},'year':2026,'round':1,'type':'shootout','id':'abc','feeds':[feed,feed,{'name':'bad','embed':'https://evil.test/replay?id=x'}]}
result=m.parse_catalogue({'api':'racinglap','version':1,'replays':[row,dict(row,series={'key':'f2'}),dict(row,year=2025)]})
assert len(result)==1 and result[0]['key']=='sprint-qualifying'
assert result[0]['sources']==[{'label':'RacingLap · F1 TV','url':feed['embed']}]
for url in ['https://weellz.live.evil.test/replay?id=x','https://weellz.live/replay?id=x&extra=y','https://weellz.live/replay?id=x&id=y','https://weellz.live/replay?id=x#fragment','https://user@weellz.live/replay?id=x']:
    assert not m.valid_embed(url)
for bad in [{}, {'api':'racinglap','version':2,'replays':[row]}, {'api':'racinglap','version':1,'replays':[]}]:
    try: m.parse_catalogue(bad)
    except ValueError: pass
    else: raise AssertionError('invalid catalogue accepted')
print('RacingLap API indexer: validation, F1/season filtering, sprint mapping, URL safety and deduplication passed')
