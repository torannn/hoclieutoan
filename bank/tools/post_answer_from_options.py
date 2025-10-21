#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import re
from pathlib import Path
from typing import List, Dict, Any, Tuple

MARKERS = [
    "# Lời giải", "#  Lời giải", "Lời giải", "Trả lời", "# Trả lời:",
    "Chọn", "Chon", "# Chọn", "# Chon", "Đáp án", "Dap an"
]
RE_MARKER_CI = re.compile(r"(?i)(#\s*loi\s*giai|loi\s*giai|tra\s*loi|#\s*tra\s*loi|dap\s*an|chon|\bd/a\b|\bdap\s*an\b|\bđap\s*an\b)")

RE_PICK = re.compile(r"(?i)(?:đáp\s*án|dap\s*an|chọn|chon)\s*([ABCD])\b")


def clean_option_text(opt: str) -> str:
    cut = len(opt)
    # case-sensitive quick cuts for common markers
    for m in MARKERS:
        pos = opt.find(m)
        if pos != -1:
            cut = min(cut, pos)
    # case-insensitive sweep
    m = RE_MARKER_CI.search(opt)
    if m:
        cut = min(cut, m.start())
    cleaned = opt[:cut]
    # remove obvious trailing answer tables like "Cau 1 2 3 ..." or "ĐÁP ÁN ..."
    cleaned = re.sub(r"(?is)(#?\s*\b(dap|đap|đáp)\s*an\b.*)$", "", cleaned)
    cleaned = re.sub(r"(?is)(\b(cau|câu)\s*\d+(?:\s*\d+)?.*)$", "", cleaned)
    return cleaned.strip()


def answer_from_option_tags(options: List[str]) -> int:
    # If any option text includes 'Chọn X', take X as letter; Only if unique
    found = None
    for idx, opt in enumerate(options):
        m = RE_PICK.search(opt)
        if m:
            letter = m.group(1).upper()
            # If the chosen letter refers to the label rather than this option, we accept it
            # else if pattern like 'Chọn D' appears inside option D, we still accept letter
            found = {"A": 0, "B": 1, "C": 2, "D": 3}.get(letter, None)
            if found is not None:
                return found
    return -1


def answer_from_solution(sol: str) -> int:
    if not sol:
        return -1
    m = RE_PICK.search(sol)
    if not m:
        return -1
    return {"A": 0, "B": 1, "C": 2, "D": 3}.get(m.group(1).upper(), -1)


def process_file(path: Path) -> Tuple[int, int]:
    items: List[Dict[str, Any]] = []
    with path.open('r', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                items.append(json.loads(line))
    updated = 0
    total_null = 0
    for it in items:
        if it.get('type') != 'mc' or it.get('answer_index') is not None:
            continue
        total_null += 1
        options = [str(x) for x in (it.get('options') or [])]
        # Try solution text first
        ans = answer_from_solution(it.get('solution') or '')
        if ans < 0:
            # Try tags inside options
            ans = answer_from_option_tags(options)
        if ans >= 0:
            it['answer_index'] = ans
            updated += 1
        # Clean options regardless
        it['options'] = [clean_option_text(o) for o in options]
    with path.open('w', encoding='utf-8') as f:
        for it in items:
            f.write(json.dumps(it, ensure_ascii=False) + '\n')
    return updated, total_null


def main():
    import argparse
    ap = argparse.ArgumentParser(description='Post-process answers from embedded tags and clean options.')
    ap.add_argument('--input', nargs='+', default=None)
    args = ap.parse_args()
    files = [Path(p) for p in (args.input or [])]
    if not files:
        files = list(Path('bank/g10/sets/import').glob('*.items.jsonl'))
    tot_u = 0
    tot_n = 0
    for p in files:
        u, n = process_file(p)
        tot_u += u
        tot_n += n
        print(f"{p}: updated {u}/{n} null answers and cleaned options")
    print(f"Done. Total updated {tot_u}/{tot_n}.")


if __name__ == '__main__':
    main()
