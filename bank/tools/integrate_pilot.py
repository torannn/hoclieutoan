#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import re
from pathlib import Path
from typing import List, Dict, Any, Tuple

ID_RE = re.compile(r"^G10-SET-I-(\d{4})$")

ALLOWED_FIELDS_BASE = {
    'id', 'type', 'stem', 'measures', 'requires', 'rationalized_by', 'grounded_in', 'difficulty', 'points'
}
ALLOWED_FIELDS_MC = ALLOWED_FIELDS_BASE | {'options', 'answer_index'}


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
            n = int(m.group(1))
            maxn = max(maxn, n)
    return maxn


def coerce_mc_schema(it: Dict[str, Any]) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    out['type'] = 'mc'
    out['stem'] = it.get('stem', '')
    out['options'] = list(it.get('options') or [])
    out['answer_index'] = it.get('answer_index')
    out['measures'] = list(it.get('measures') or [])
    out['requires'] = list(it.get('requires') or [])
    # keep only allowed fields beyond required
    if it.get('difficulty'):
        out['difficulty'] = it['difficulty']
    if it.get('points') is not None:
        out['points'] = it['points']
    if it.get('rationalized_by'):
        out['rationalized_by'] = list(it['rationalized_by'])
    if it.get('grounded_in'):
        out['grounded_in'] = list(it['grounded_in'])
    return out


def is_good_mc(it: Dict[str, Any]) -> bool:
    return (
        it.get('type') == 'mc' and
        (it.get('answer_index') is not None) and
        isinstance(it.get('options'), list) and len(it.get('options')) >= 2 and
        isinstance(it.get('stem'), str) and it.get('stem').strip() != ''
    )


def write_items_jsonl_append(path: Path, items: List[Dict[str, Any]]):
    with path.open('a', encoding='utf-8') as f:
        for it in items:
            f.write(json.dumps(it, ensure_ascii=False) + '\n')


def main():
    import argparse
    ap = argparse.ArgumentParser(description='Integrate pilot items into main items.jsonl with new sequential IDs.')
    ap.add_argument('--pilot', nargs='+', default=None, help='Pilot JSONL files to integrate (default: bank/g10/sets/import/pilot/*.pilot.jsonl)')
    ap.add_argument('--items', default='bank/g10/sets/items.jsonl', help='Main items.jsonl path')
    args = ap.parse_args()

    pilot_files: List[Path] = [Path(p) for p in (args.pilot or [])]
    if not pilot_files:
        pilot_files = list(Path('bank/g10/sets/import/pilot').glob('*.pilot.jsonl'))

    main_path = Path(args.items)
    existing = read_items_jsonl(main_path)
    max_id = get_max_id_number(existing)

    to_append: List[Dict[str, Any]] = []
    for pf in pilot_files:
        for line in pf.read_text(encoding='utf-8').splitlines():
            if not line.strip():
                continue
            it = json.loads(line)
            if not is_good_mc(it):
                continue
            coerced = coerce_mc_schema(it)
            max_id += 1
            coerced['id'] = f"G10-SET-I-{max_id:04d}"
            to_append.append(coerced)
    write_items_jsonl_append(main_path, to_append)
    print(f"Integrated {len(to_append)} items -> {main_path}")


if __name__ == '__main__':
    main()
