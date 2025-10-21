#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
from pathlib import Path
from typing import List, Dict, Any

def load_jsonl(path: Path) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    with path.open('r', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                items.append(json.loads(line))
    return items


def get_segment(md_path: Path, start: int, end: int) -> str:
    lines = md_path.read_text(encoding='utf-8', errors='ignore').splitlines()
    # start/end are 1-indexed in source_ref; clamp
    s = max(1, start)
    e = min(len(lines), end)
    seg = lines[s-1:e]
    # Show at most ~30 lines
    if len(seg) > 30:
        seg = seg[:30]
    # Prefix with line numbers
    out = []
    for i, ln in enumerate(seg, start=s):
        out.append(f"{i:5d}: {ln}")
    return "\n".join(out)


def main():
    import argparse
    ap = argparse.ArgumentParser(description='Print a QA snapshot for pilot items with source segments.')
    ap.add_argument('--pilot', nargs='+', default=None)
    ap.add_argument('--per-file', type=int, default=5)
    args = ap.parse_args()

    pilot_files = [Path(p) for p in (args.pilot or [])]
    if not pilot_files:
        pilot_files = list(Path('bank/g10/sets/import/pilot').glob('*.pilot.jsonl'))

    for pf in pilot_files:
        print('='*80)
        print(f"Pilot file: {pf}")
        items = load_jsonl(pf)
        for it in items[: args.per_file]:
            src = it.get('source_ref') or {}
            md_rel = src.get('path') or ''
            md_path = Path(md_rel)
            start = int(src.get('line_start', 1) or 1)
            end = int(src.get('line_end', start) or start)
            print('-'*80)
            print(f"Type: {it.get('type')}\nStem: {it.get('stem')}")
            if it.get('type') == 'mc':
                opts = it.get('options') or []
                for idx, o in enumerate(opts):
                    tag = chr(ord('A') + idx)
                    mark = ' <==' if it.get('answer_index') == idx else ''
                    print(f"  {tag}. {o}{mark}")
            elif it.get('type') == 'short':
                print(f"  Final answer: {it.get('final_answer')}")
            print(f"Source: {md_rel} [{start}-{end}]\n")
            try:
                seg = get_segment(md_path, start, end)
                print(seg)
            except Exception as ex:
                print(f"(Could not read source: {ex})")
        print('='*80)


if __name__ == '__main__':
    main()
