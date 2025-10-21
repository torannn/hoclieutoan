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


def coerce_mc(it: Dict[str, Any]) -> Dict[str, Any]:
    out: Dict[str, Any] = {
        'type': 'mc',
        'stem': it.get('stem', ''),
        'options': list(it.get('options') or []),
        'answer_index': it.get('answer_index'),
        'measures': list(it.get('measures') or []),
        'requires': list(it.get('requires') or []),
    }
    if it.get('solution'):
        out['solution'] = it['solution']
    return out


def coerce_tf(it: Dict[str, Any]) -> Dict[str, Any]:
    out: Dict[str, Any] = {
        'type': 'tf',
        'stem': it.get('stem', ''),
        'statements': list(it.get('statements') or []),
        'measures': list(it.get('measures') or []),
        'requires': list(it.get('requires') or []),
    }
    if it.get('answers'):
        out['answers'] = list(it['answers'])
    if it.get('solution'):
        out['solution'] = it['solution']
    return out


def coerce_short(it: Dict[str, Any]) -> Dict[str, Any]:
    out: Dict[str, Any] = {
        'type': 'short',
        'stem': it.get('stem', ''),
        'final_answer': it.get('final_answer'),
        'measures': list(it.get('measures') or []),
        'requires': list(it.get('requires') or []),
    }
    if it.get('solution'):
        out['solution'] = it['solution']
    return out


def is_valid_mc(it: Dict[str, Any]) -> bool:
    return (
        it.get('type') == 'mc' and
        isinstance(it.get('stem'), str) and it.get('stem').strip() != '' and
        isinstance(it.get('options'), list) and len(it.get('options')) >= 2
    )


def is_valid_tf(it: Dict[str, Any]) -> bool:
    return (
        it.get('type') == 'tf' and
        isinstance(it.get('stem'), str) and it.get('stem').strip() != '' and
        isinstance(it.get('statements'), list) and len(it.get('statements')) >= 1
    )


def is_valid_short(it: Dict[str, Any]) -> bool:
    return (
        it.get('type') == 'short' and
        isinstance(it.get('stem'), str) and it.get('stem').strip() != '' and
        (it.get('final_answer') is not None)
    )


def main():
    import argparse
    ap = argparse.ArgumentParser(description='Build a clean items file from import JSONLs (preserve MC/TF/Short).')
    ap.add_argument('--inputs', nargs='+', default=None, help='Input *.items.jsonl files (default: bank/g10/sets/import/*.items.jsonl)')
    ap.add_argument('--out', default='bank/g10/sets/items.generated.jsonl', help='Output JSONL path')
    ap.add_argument('--continue-from', default='bank/g10/sets/items.jsonl', help='Existing items file for continuing ID numbering')
    args = ap.parse_args()

    inp_files: List[Path] = [Path(p) for p in (args.inputs or [])]
    if not inp_files:
        inp_files = list(Path('bank/g10/sets/import').glob('*.items.jsonl'))

    prior = read_items_jsonl(Path(args.continue_from))
    max_id = get_max_id_number(prior)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open('w', encoding='utf-8') as f:
        # retain prior items if you want (not required) — here we only build new set
        pass

    to_write: List[Dict[str, Any]] = []
    for p in inp_files:
        for line in p.read_text(encoding='utf-8').splitlines():
            if not line.strip():
                continue
            try:
                it = json.loads(line)
            except Exception:
                continue
            t = it.get('type')
            normalized = None
            if t == 'mc' and is_valid_mc(it):
                normalized = coerce_mc(it)
            elif t == 'tf' and is_valid_tf(it):
                normalized = coerce_tf(it)
            elif t == 'short' and is_valid_short(it):
                normalized = coerce_short(it)
            else:
                continue
            max_id += 1
            normalized['id'] = f"G10-SET-I-{max_id:04d}"
            to_write.append(normalized)

    with out_path.open('w', encoding='utf-8') as f:
        for it in to_write:
            f.write(json.dumps(it, ensure_ascii=False) + '\n')

    print(f"Built {len(to_write)} items -> {out_path}")


if __name__ == '__main__':
    main()
