import csv,re,json,sys
D='/workspace/usda/FoodData_Central_sr_legacy_food_csv_2018-04/'
foods={r['fdc_id']:r['description'] for r in csv.DictReader(open(D+'food.csv'))}
tok=lambda s:set(re.findall(r"[a-z0-9%'\"/.\-&]+",s.lower().replace(',',' ').replace('(',' ').replace(')',' ')))
FT={k:tok(v) for k,v in foods.items()}
out={};miss=[]
for line in open('tools/usda_map.txt',encoding='utf8'):
    line=line.strip()
    if not line or line.startswith('#'):continue
    ru,q=line.split('=',1)
    if q.startswith('#'): out[ru]=q[1:]; continue
    qt=tok(q)
    c=[k for k,t in FT.items() if qt<=t]
    if not c: miss.append((ru,q)); continue
    BAD=re.compile(r'added solution|enhanced|fat free|new zealand|imported|school lunch|australian|low sodium|reduced sodium|lifeway|ralston|with salt|includes onion',re.I)
    best=min(c,key=lambda k:(bool(BAD.search(foods[k])),len(FT[k]-qt),len(foods[k]))); out[ru]=best
json.dump(out,open('tools/usda_ids.json','w'),ensure_ascii=False)
print(len(out),'matched',len(miss),'miss')
for m in miss: print(' MISS',m)
