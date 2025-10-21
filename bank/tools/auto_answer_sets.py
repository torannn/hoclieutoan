#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Tuple, Dict, Any

# ------------ Interval structures ------------

@dataclass
class Interval:
    l: Optional[float]  # None means -inf
    lc: bool            # left closed
    r: Optional[float]  # None means +inf
    rc: bool            # right closed

    def copy(self):
        return Interval(self.l, self.lc, self.r, self.rc)


def _norm_minus(s: str) -> str:
    return s.replace('−', '-').replace('–', '-')


def _parse_num(tok: str) -> Optional[float]:
    tok = tok.strip()
    tok = _norm_minus(tok)
    tok = tok.replace('∞', 'inf')
    if tok in ('-inf', 'inf'):
        return None if tok == 'inf' else None  # handled by bracket; we'll map separately
    # Here we represent infinities via None outside. We'll interpret signs by context.
    try:
        return float(tok)
    except Exception:
        return None


RE_INTERVAL = re.compile(r"^\s*([\(\[])[\s]*([+\-−]?\d+(?:\.\d+)?|[+\-−]?∞)\s*,\s*([+\-−]?\d+(?:\.\d+)?|[+\-−]?∞)\s*([\)\]])\s*$")


def parse_interval(s: str) -> Interval:
    s = s.strip()
    s = s.replace(' ', '')
    s = s.replace('−', '-')
    m = RE_INTERVAL.match(s)
    if not m:
        raise ValueError(f"Not an interval: {s}")
    lb, a, b, rb = m.groups()
    lc = lb == '['
    rc = rb == ']'
    a = a.replace('−', '-')
    b = b.replace('−', '-')
    if a in ('-∞', '-inf'):
        l = None
    elif a in ('∞', 'inf'):
        # invalid but tolerate
        l = None
    else:
        l = float(a)
    if b in ('∞', 'inf'):
        r = None
    elif b in ('-∞', '-inf'):
        r = None
    else:
        r = float(b)
    return Interval(l, lc, r, rc)


def parse_union(expr: str) -> List[Interval]:
    # split by union symbol
    parts = [p for p in re.split(r"∪|U", expr) if p.strip()]
    intervals: List[Interval] = []
    for p in parts:
        intervals.append(parse_interval(p))
    intervals = merge_intervals(intervals)
    return intervals


def merge_intervals(intervals: List[Interval]) -> List[Interval]:
    def key(iv: Interval):
        return (-float('inf') if iv.l is None else iv.l, 0 if iv.lc else 1)
    ints = sorted([iv.copy() for iv in intervals], key=key)
    out: List[Interval] = []
    for iv in ints:
        if not out:
            out.append(iv)
            continue
        last = out[-1]
        # Determine overlap/adjacency
        # Convert None to +-inf comparators
        l1 = -float('inf') if last.l is None else last.l
        r1 = float('inf') if last.r is None else last.r
        l2 = -float('inf') if iv.l is None else iv.l
        r2 = float('inf') if iv.r is None else iv.r
        # Check if iv starts before last ends, considering closures
        overlap = (l2 < r1) or (l2 == r1 and (last.rc or iv.lc))
        if overlap:
            # merge
            # New left is last.l, last.lc
            # New right is max of endpoints
            # Compute which endpoint is farther
            if r2 > r1:
                last.r = iv.r
                last.rc = iv.rc
            elif r2 == r1:
                last.rc = last.rc or iv.rc
            # else keep last
        else:
            out.append(iv)
    return out


def intersect(a: List[Interval], b: List[Interval]) -> List[Interval]:
    res: List[Interval] = []
    i = j = 0
    while i < len(a) and j < len(b):
        A = a[i]
        B = b[j]
        # compute overlap
        lA = -float('inf') if A.l is None else A.l
        rA = float('inf') if A.r is None else A.r
        lB = -float('inf') if B.l is None else B.l
        rB = float('inf') if B.r is None else B.r
        left = max(lA, lB)
        right = min(rA, rB)
        if left < right or (left == right and ((A.l is None or B.l is None) or (A.rc and B.lc))):
            # determine closures
            if left == lA:
                lc = A.lc if A.l is not None else False
            else:
                lc = B.lc if B.l is not None else False
            if right == rA:
                rc = A.rc if A.r is not None else False
            else:
                rc = B.rc if B.r is not None else False
            if left < right or (left == right and lc and rc):
                lval = None if left == -float('inf') else left
                rval = None if right == float('inf') else right
                res.append(Interval(lval, lc, rval, rc))
        # advance pointer
        if rA < rB:
            i += 1
        elif rA > rB:
            j += 1
        else:
            i += 1; j += 1
    return merge_intervals(res)


def difference(a: List[Interval], b: List[Interval]) -> List[Interval]:
    res: List[Interval] = []
    current = merge_intervals(a)
    for B in merge_intervals(b):
        new_current: List[Interval] = []
        for A in current:
            lA = -float('inf') if A.l is None else A.l
            rA = float('inf') if A.r is None else A.r
            lB = -float('inf') if B.l is None else B.l
            rB = float('inf') if B.r is None else B.r
            if rB <= lA or lB >= rA:
                new_current.append(A)
                continue
            # left piece
            if lB > lA or (lB == lA and not (A.lc and B.lc)):
                lval = A.l
                lc = A.lc
                rval = B.l
                rc = not B.lc
                new_current.append(Interval(lval, lc, rval, rc))
            # right piece
            if rB < rA or (rB == rA and not (A.rc and B.rc)):
                lval = B.r
                lc = not B.rc
                rval = A.r
                rc = A.rc
                new_current.append(Interval(lval, lc, rval, rc))
        current = merge_intervals([iv for iv in new_current if (iv.l != iv.r or (iv.l is None and iv.r is not None) or (iv.r is None and iv.l is not None))])
    res = current
    return res


def complement(u: List[Interval]) -> List[Interval]:
    merged = merge_intervals(u)
    res: List[Interval] = []
    prev_r = None  # -inf represented by None
    prev_rc = False
    # start from -inf to first left
    for iv in merged:
        if prev_r is None:
            # (-inf, iv.l)
            res.append(Interval(None, False, iv.l, not iv.lc))
        else:
            # (prev_r, iv.l)
            res.append(Interval(prev_r, not prev_rc, iv.l, not iv.lc))
        prev_r = iv.r
        prev_rc = iv.rc
    # tail to +inf
    res.append(Interval(prev_r, not prev_rc if prev_r is not None else False, None, False))
    # clean zero-length
    out = []
    for iv in res:
        if iv.l is None and iv.r is None:
            continue  # would be R itself, not expected here
        # exclude empty
        if iv.l == iv.r:
            if iv.l is None or iv.r is None:
                out.append(iv)
            elif iv.lc and iv.rc:
                # single point interval; keep only if closed both sides (but complements never produce this)
                out.append(iv)
            else:
                continue
        else:
            out.append(iv)
    return merge_intervals(out)


def fmt_union(intervals: List[Interval]) -> str:
    def fmt(iv: Interval) -> str:
        lb = '[' if iv.lc else '('
        rb = ']' if iv.rc else ')'
        l = '-∞' if iv.l is None else (str(int(iv.l)) if iv.l.is_integer() else str(iv.l))
        r = '∞' if iv.r is None else (str(int(iv.r)) if iv.r.is_integer() else str(iv.r))
        return f"{lb}{l},{r}{rb}"
    return ' ∪ '.join(fmt(iv) for iv in intervals)


def equal_unions(a: List[Interval], b: List[Interval]) -> bool:
    A = fmt_union(merge_intervals(a))
    B = fmt_union(merge_intervals(b))
    return A == B


# ------------ Auto-answer driver ------------

SET_TASKS = {"G10-SET-TASK-012", "G10-SET-TASK-013", "G10-SET-TASK-014", "G10-SET-TASK-015"}

RE_ANY_INTERVAL = re.compile(r"[\(\[][\s\S]*?[\)\]]")


def extract_intervals_from_text(s: str) -> List[str]:
    # rough extraction of bracketed sequences
    cands = re.findall(r"[\(\[][\-−\+\d\.,\s∞inf]+[\)\]]", s)
    return [c.strip() for c in cands]


def infer_operation(stem: str) -> str:
    s = stem.lower()
    if 'giao' in s or '∩' in s:
        return 'intersection'
    if 'hợp' in s or '∪' in s or 'hop' in s:
        return 'union'
    if 'phần bù' in s or 'bù' in s or 'phan bu' in s:
        return 'complement'
    if 'hiệu' in s or '\\' in s or 'hieu' in s:
        return 'difference'
    return ''


def parse_option_expr(opt: str) -> Optional[List[Interval]]:
    try:
        return parse_union(opt)
    except Exception:
        return None


def auto_answer_item(it: Dict[str, Any]) -> Optional[int]:
    # Only MC, only with set interval tasks
    if it.get('type') != 'mc' or it.get('answer_index') is not None:
        return None
    measures = set(it.get('measures') or [])
    if not (measures & SET_TASKS):
        return None
    op = infer_operation(it.get('stem', ''))
    if not op:
        return None
    # Extract base intervals from stem
    interval_texts = extract_intervals_from_text(it['stem'])
    if not interval_texts:
        return None
    # For complement, the first bracket expression(s) are the set to complement
    try:
        if op == 'complement':
            base = parse_union(' ∪ '.join(interval_texts))
            target = complement(base)
        else:
            # expect two or more intervals; we take the first two unions
            # split by 'và' or 'va' or comma patterns
            if len(interval_texts) < 2:
                return None
            A = parse_union(interval_texts[0])
            B = parse_union(interval_texts[1])
            if op == 'intersection':
                target = intersect(A, B)
            elif op == 'union':
                target = merge_intervals(A + B)
            elif op == 'difference':
                target = difference(A, B)
            else:
                return None
    except Exception:
        return None

    # Compare against options
    options = it.get('options') or []
    best_idx = None
    for idx, opt in enumerate(options):
        parsed = parse_option_expr(opt)
        if parsed is None:
            continue
        if equal_unions(parsed, target):
            best_idx = idx
            break
    return best_idx


def process_file(path: Path) -> Tuple[int, int]:
    items: List[Dict[str, Any]] = []
    with path.open('r', encoding='utf-8') as f:
        for line in f:
            if not line.strip():
                continue
            items.append(json.loads(line))
    updated = 0
    total_null = 0
    for it in items:
        if it.get('type') == 'mc' and it.get('answer_index') is None:
            total_null += 1
            idx = auto_answer_item(it)
            if idx is not None:
                it['answer_index'] = idx
                updated += 1
    with path.open('w', encoding='utf-8') as f:
        for it in items:
            f.write(json.dumps(it, ensure_ascii=False) + '\n')
    return updated, total_null


def main():
    import argparse
    ap = argparse.ArgumentParser(description='Auto-answer set/interval items.')
    ap.add_argument('--input', nargs='+', default=None, help='Input JSONL files (default: all in bank/g10/sets/import/*.items.jsonl)')
    args = ap.parse_args()
    files: List[Path] = []
    if args.input:
        files = [Path(p) for p in args.input]
    else:
        files = list(Path('bank/g10/sets/import').glob('*.items.jsonl'))
    total_upd = 0
    total_null = 0
    for p in files:
        upd, nulls = process_file(p)
        total_upd += upd
        total_null += nulls
        print(f"{p}: updated {upd}/{nulls} null answers")
    print(f"Done. Total updated {total_upd}/{total_null} null answers across {len(files)} files.")


if __name__ == '__main__':
    main()
