"""PDF bbox-layout -> строки по колонкам: [page, col, x, y, text]"""
import re, json, sys, html
src=open(sys.argv[1],encoding='utf-8').read()
pages=src.split('<page ')[1:]
out=[]
W=re.compile(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</word>',re.S)
for pi,p in enumerate(pages,1):
    lines=[]
    for lm in re.finditer(r'<line [^>]*>(.*?)</line>',p,re.S):
        ws=[(float(a),float(b),float(c),html.unescape(t)) for a,b,c,d,t in W.findall(lm.group(1))]
        if ws: lines.append(ws)
    cov=[0]*600
    for ws in lines:
        for w in ws:
            for x in range(max(0,int(w[0])),min(600,int(w[2])+1)): cov[x]+=1
    split=283.0; best=0; run=0
    for x in range(240,340):
        if cov[x]==0:
            run+=1
            if run>best: best=run; split=x-run/2
        else: run=0
    for ws in lines:
        for col in (0,1):
            g=[w for w in ws if (w[0]<split)==(col==0)]
            if not g: continue
            out.append([pi,col,round(g[0][0],1),round(min(w[1] for w in g),1),' '.join(w[3] for w in g)])
json.dump(out,open(sys.argv[2],'w'),ensure_ascii=False)
print(len(out))
