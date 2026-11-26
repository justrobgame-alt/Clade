"""Date Clade's Kinship tree with TimeTree divergence times (TimeTree of Life newick).
usage: python3 -I build_ages.py ttol.nwk animals.json kinship.json out.json"""
import sys, json, re, random, statistics
nwk, animals_p, kin_p, out_p = sys.argv[1:5]
s = open(nwk).read().strip()
# --- parse newick iteratively: nodes as [parent, length, name] ---
par=[-1]; ln=[0.0]; nm=['']; cur=0; i=0; n=len(s)
tok = re.compile(r"[^(),:;]+")
while i<n:
    c=s[i]
    if c=='(':
        par.append(cur); ln.append(0.0); nm.append(''); cur=len(par)-1; i+=1
    elif c==',':
        p=par[cur]; par.append(p); ln.append(0.0); nm.append(''); cur=len(par)-1; i+=1
    elif c==')':
        cur=par[cur]; i+=1
    elif c==':':
        m=tok.match(s,i+1); ln[cur]=float(m.group()); i=m.end()
    elif c==';': break
    else:
        m=tok.match(s,i); nm[cur]=m.group().strip("'"); i=m.end()
N=len(par); kids=[[] for _ in range(N)]
for k in range(1,N): kids[par[k]].append(k)
# node age = path length down to any tip (tree is ultrametric); compute bottom-up
age=[0.0]*N
for k in range(N-1,0,-1):
    age[par[k]]=max(age[par[k]], age[k]+ln[k])
depth=[0]*N
for k in range(1,N): depth[k]=depth[par[k]]+1
tips={nm[k].replace('_',' ').lower():k for k in range(N) if not kids[k] and nm[k]}
genus={}
for name,k in tips.items(): genus.setdefault(name.split(' ')[0],k)
def mrca(a,b):
    while a!=b:
        if depth[a]<depth[b]: a,b=b,a
        a=par[a]
    return a
# --- our tree ---
A={a['id']:a for a in json.load(open(animals_p))}
kin=json.load(open(kin_p)); nodes=kin['nodes']; M=len(nodes)
tipof={}; exact=0; bygen=0
for lid in kin['leaves']:
    a=A.get(lid); 
    if not a or not a.get('sci'): continue
    sci=a['sci'].lower()
    if sci in tips: tipof[lid]=(tips[sci],True); exact+=1
    elif sci.split(' ')[0] in genus: tipof[lid]=(genus[sci.split(' ')[0]],False); bygen+=1
print('leaves',len(kin['leaves']),'exact',exact,'genus',bygen,file=sys.stderr)
ch=[[] for _ in range(M)]
for k,x in enumerate(nodes):
    if x[2]>=0: ch[x[2]].append(k)
direct=[[] for _ in range(M)]
for lid,p in kin['leaves'].items(): direct[p].append(lid)
# mapped leaves under each node (bottom-up; parents come before children)
under=[None]*M
for k in range(M-1,-1,-1):
    u=[l for l in direct[k] if l in tipof]
    for c in ch[k]: u+=under[c][:40]
    under[k]=u
random.seed(7)
raw=[None]*M
for k in range(M):
    branches=[[l] for l in direct[k] if l in tipof]+[under[c] for c in ch[k] if under[c]]
    if len(branches)<2: continue
    vals=[]
    for a in range(len(branches)):
        for b in range(a+1,len(branches)):
            for _ in range(6):
                x=random.choice(branches[a]); y=random.choice(branches[b])
                (tx,ex),(ty,ey)=tipof[x],tipof[y]
                if tx==ty: continue
                # genus stand-ins can't date a split inside that same genus
                if not (ex and ey) and A[x]['sci'].split(' ')[0]==A[y]['sci'].split(' ')[0]: continue
                vals.append(age[mrca(tx,ty)])
    if vals: raw[k]=statistics.median(vals)
dated=sum(v is not None for v in raw)
# enforce parent >= child (bottom-up), then fill gaps top-down by even spacing
final=list(raw); est=[0]*M
for k in range(M-1,-1,-1):
    m=max([final[c] for c in ch[k] if final[c] is not None], default=None)
    if final[k] is not None and m is not None and final[k]<m: final[k]=m; est[k]=1
def below(k):
    d=0; best=0.0
    vals=[final[c] for c in ch[k] if final[c] is not None]
    return max(vals) if vals else None
for k in range(M):
    if final[k] is not None: continue
    est[k]=1
    p=nodes[k][2]; up=final[p] if p>=0 else None
    # nearest dated descendant and how many undated steps lead to it
    steps=1; lo=None; frontier=ch[k]
    while frontier and lo is None:
        vals=[final[c] for c in frontier if final[c] is not None]
        if vals: lo=max(vals)
        else: steps+=1; frontier=[g for c in frontier for g in ch[c]]
    if lo is None: lo=0.0; steps=1 if up is None else 2
    if up is None: final[k]=lo*1.15 if lo else None
    else: final[k]=up-(up-lo)/(steps+1)
for k in range(M):
    p=nodes[k][2]
    if final[k] is not None and final[k] < 0.02: final[k]=0.02; est[k]=1   # never show a split as 'zero years'
    if p>=0 and final[p] is not None and final[k] is not None and final[k]>final[p]: final[k]=final[p]; est[k]=1
def rnd(v):
    if v is None: return None
    return round(v,3) if v<1 else round(v,2) if v<10 else round(v,1)
bad=0
for k,x in enumerate(nodes):
    x[1]=rnd(final[k]); x[3]=est[k]
    p=x[2]
    if p>=0 and x[1] is not None and nodes[p][1] is not None and x[1]>nodes[p][1]+1e-9: bad+=1
kin['dated']={'source':'TimeTree of Life (timetree.org)','note':'Ages are million years ago. Flagged nodes (est) are placed between dated neighbours.'}
json.dump(kin,open(out_p,'w'),separators=(',',':'),ensure_ascii=False)
print('nodes',M,'dated directly',dated,'estimated',sum(est),'undated',sum(x[1] is None for x in nodes),'order violations',bad,file=sys.stderr)
