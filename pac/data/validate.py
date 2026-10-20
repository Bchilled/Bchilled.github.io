#!/usr/bin/env python3
"""Validate pac/data/*.json: parses, and chart-data-derived values match the source exactly.
Usage: python3 validate.py [path/to/chart-data.json]"""
import json,sys,os
here=os.path.dirname(os.path.abspath(__file__))
files=['stats.json','pure-pac-kit.json','ghosts.json','units.json']
data={f:json.load(open(os.path.join(here,f),encoding='utf-8')) for f in files}
print('parse OK:',', '.join(files))
src=sys.argv[1] if len(sys.argv)>1 else os.path.join(here,'..','charts','chart-data.json')
if os.path.exists(src):
    cd=json.load(open(src,encoding='utf-8')); by={i['id']:i for i in cd['items']}
    assert data['stats.json']['stats']==cd['stats'] and data['stats.json']['wheelOrder']==cd['wheelOrder']
    assert data['pure-pac-kit.json']['chartRow']==by[2142]
    g=data['ghosts.json']; assert len(g['ghosts'])==13
    for x in g['ghosts']:
        assert x['chartRow'] is None or x['chartRow']==by[x['chartRow']['id']]
    assert sorted(sum(g['families'].values(),[]))==sorted(x['Ghost'] for x in g['ghosts'])
    print('source match OK against',src)
else: print('chart-data.json not found; source check skipped')
