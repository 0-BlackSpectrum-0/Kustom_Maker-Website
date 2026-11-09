# tools/spec-extract/mine_smali.py
import os, sys, re, json

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
KLWP_SMALI = os.path.join(ROOT, 'references', 'decompiled', 'klwp', 'apktool')
KWGT_SMALI = os.path.join(ROOT, 'references', 'decompiled', 'kwgt', 'apktool')

def search_strings(keywords, root_dir):
    results = {k: [] for k in keywords}
    if not os.path.exists(root_dir):
        return results
        
    for root, dirs, files in os.walk(root_dir):
        for f in files:
            if f.endswith('.smali'):
                fp = os.path.join(root, f)
                try:
                    with open(fp, 'r', encoding='utf-8', errors='ignore') as sfile:
                        content = sfile.read()
                        for kw in keywords:
                            if kw in content:
                                results[kw].append(fp)
                except Exception:
                    pass
    return results

if __name__ == '__main__':
    keywords = [
        "ProgressModule", "CurvedTextModule", "KomponentModule",
        "progress_mode", "curved_text", "paint_mode", "fx_mask"
    ]
    print("Searching smali...")
    res = search_strings(keywords, KLWP_SMALI)
    for kw, paths in res.items():
        print(f"{kw}: {len(paths)} occurrences")
        for p in paths[:3]:
            print(f"  {os.path.relpath(p, ROOT)}")
