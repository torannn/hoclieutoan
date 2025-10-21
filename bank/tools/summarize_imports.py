#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
from pathlib import Path
from typing import Dict, Any


def summarize_file(p: Path) -> Dict[str, Any]:
    counts = {"mc": 0, "tf": 0, "short": 0, "other": 0}
    mc_null = 0
    total = 0
    for line in p.read_text(encoding='utf-8').splitlines():
        if not line.strip():
            continue
        try:
            it = json.loads(line)
        except Exception:
            continue
        total += 1
        t = it.get('type')
        if t in counts:
            counts[t] += 1
        else:
            counts['other'] += 1
        if t == 'mc' and (it.get('answer_index') is None):
            mc_null += 1
    return {"file": str(p), "total": total, **counts, "mc_null": mc_null}


def main():
    base = Path('bank/g10/sets/import')
    files = sorted(base.glob('*.items.jsonl'))
    grand = {"mc": 0, "tf": 0, "short": 0, "other": 0, "mc_null": 0, "total": 0}
    for p in files:
        s = summarize_file(p)
        print(f"{p.name}: total={s['total']}, mc={s['mc']} (null={s['mc_null']}), tf={s['tf']}, short={s['short']}, other={s['other']}")
        for k in grand:
            grand[k] += s[k]
    print(f"Total: total={grand['total']}, mc={grand['mc']} (null={grand['mc_null']}), tf={grand['tf']}, short={grand['short']}, other={grand['other']}")


if __name__ == '__main__':
    main()
