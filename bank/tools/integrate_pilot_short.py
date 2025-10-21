#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import re
from pathlib import Path
from typing import List, Dict, Any

ID_RE = re.compile(r"^G10-SET-I-(\d{4})$")


def read_items_jsonl(path: Path) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    if not path.exists():
        return items
    with path.open('r', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                try:
                    items.append(json.loads(line))
                except Exception:
                    pass
    return items


def get_max_id_number(items: List[Dict[str, Any]]) -> int:
    maxn = 0
    for it in items:
        iid = it.get('id', '')
        m = ID_RE.match(iid)
        if m:
            try:
                n = int(m.group(1))
            except Exception:
                continue
            maxn = max(maxn, n)
    return maxn


def coerce_short_schema(it: Dict[str, Any]) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    out['type'] = 'short'
    out['stem'] = it.get('stem', '')
    out['final_answer'] = it.get('final_answer')
    out['measures'] = list(it.get('measures') or [])
    out['requires'] = list(it.get('requires') or [])
    if it.get('rationalized_by'):
        out['rationalized_by'] = list(it['rationalized_by'])
    if it.get('grounded_in'):
        out['grounded_in'] = list(it['grounded_in'])
    if it.get('difficulty'):
        out['difficulty'] = it['difficulty']
    if it.get('points') is not None:
        out['points'] = it['points']
    return out


def is_good_short(it: Dict[str, Any]) -> bool:
    return (
        it.get('type') == 'short' and
        isinstance(it.get('stem'), str) and it.get('stem').strip() != '' and
        (it.get('final_answer') is not None)
    )


def write_items_jsonl_append(path: Path, items: List[Dict[str, Any]]):
    with path.open('a', encoding='utf-8') as f:
        for it in items:
            f.write(json.dumps(it, ensure_ascii=False) + '\n')


def main():
    import argparse
    ap = argparse.ArgumentParser(description='Integrate pilot short-answer items into main items.jsonl with sequential IDs.')
    ap.add_argument('--pilot', nargs='+', default=None, help='Pilot short JSONL files (default: bank/g10/sets/import/pilot/*.short.pilot.jsonl)')
    ap.add_argument('--items', default='bank/g10/sets/items.jsonl', help='Main items.jsonl path')
    args = ap.parse_args()

    pilot_files: List[Path] = [Path(p) for p in (args.pilot or [])]
    if not pilot_files:
        pilot_files = list(Path('bank/g10/sets/import/pilot').glob('*.short.pilot.jsonl'))

    main_path = Path(args.items)
    existing = read_items_jsonl(main_path)
    max_id = get_max_id_number(existing)

    to_append: List[Dict[str, Any]] = []
    for pf in pilot_files:
        for line in pf.read_text(encoding='utf-8').splitlines():
            if not line.strip():
                continue
            it = json.loads(line)
            if not is_good_short(it):
                continue
            coerced = coerce_short_schema(it)
            max_id += 1
            coerced['id'] = f"G10-SET-I-{max_id:04d}"
            to_append.append(coerced)
    write_items_jsonl_append(main_path, to_append)
    print(f"Integrated {len(to_append)} short items -> {main_path}")


if __name__ == '__main__':
    main()
