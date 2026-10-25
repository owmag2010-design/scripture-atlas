# Apply fact-check findings (JSON array of {id, field, fix}) to content/discoveries/*.json. Usage: python3 scripts/apply-review.py review.json [skip-id:field ...]
import json, sys, re, glob
review = json.load(open(sys.argv[1])); skip = set(sys.argv[2:])
files = {f: json.load(open(f)) for f in glob.glob("content/discoveries/*.json")}
byid = {d["id"]: (f, d) for f, L in files.items() for d in L}
done = 0
for r in review:
    key = f'{r["id"]}:{r["field"]}'
    if key in skip or r["id"] not in byid: print("skip", key); continue
    fix = r["fix"]; d = byid[r["id"]][1]; field = r["field"]
    if isinstance(fix, str) and not fix.startswith(("Add ", "Cite ")) or isinstance(fix, dict) and field != "sources" or isinstance(fix, list):
        m = re.fullmatch(r"(\w+)\[(\d+)\]\.(\w+)", field)
        if m: d[m[1]][int(m[2])][m[3]] = fix
        elif "." in field: a, b = field.split(".", 1); d.setdefault(a, {})[b] = fix
        elif fix == "remove": d.pop(field, None)
        else: d[field] = fix
        done += 1
    elif isinstance(fix, dict) and field == "sources" and fix.get("url"):
        if fix["url"] not in [s["url"] for s in d["sources"]]: d["sources"].append(fix); done += 1
    else: print("manual", key, "-", r["problem"][:120])
for f, L in files.items(): json.dump(L, open(f, "w"), indent=1, ensure_ascii=False)
print(done, "applied")
