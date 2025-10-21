#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
from pathlib import Path
from typing import List, Dict, Any

MIN_PER_FILE = 25


def load_jsonl(path: Path) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    with path.open('r', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                try:
                    items.append(json.loads(line))
                except Exception:
                    pass
    return items


def save_jsonl(path: Path, items: List[Dict[str, Any]]):
    with path.open('w', encoding='utf-8') as f:
        for it in items:
            f.write(json.dumps(it, ensure_ascii=False) + '\n')


def is_good_mc(it: Dict[str, Any]) -> bool:
    if it.get('type') != 'mc':
        return False
    if it.get('answer_index') is None:
        return False
    opts = it.get('options') or []
    if not isinstance(opts, list) or len(opts) < 2:
        return False
    return True


def main():
    import argparse
    ap = argparse.ArgumentParser(description='Select a pilot subset of items with answers for QA and integration.')
    ap.add_argument('--inputs', nargs='+', default=None)
    ap.add_argument('--out-dir', default='bank/g10/sets/import/pilot')
    ap.add_argument('--per-file', type=int, default=MIN_PER_FILE)
    args = ap.parse_args()

    inp_files: List[Path] = [Path(p) for p in (args.inputs or [])]
    if not inp_files:
        inp_files = list(Path('bank/g10/sets/import').glob('*.items.jsonl'))

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    for p in inp_files:
        items = load_jsonl(p)
        good = [it for it in items if is_good_mc(it)]
        sel = good[: args.per_file]
        out_path = out_dir / (p.stem + '.pilot.jsonl')
        save_jsonl(out_path, sel)
        print(f"{p}: selected {len(sel)}/{len(good)} with answers -> {out_path}")


if __name__ == '__main__':
    main()
