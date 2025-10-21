#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import re
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple, Any

# ------------- Parsing helpers -------------

RE_SET_DEF = re.compile(r"([A-Za-zĐđÂâÊêÔôƯưA-Z]+)\s*=\s*\{([^}]*)\}")
RE_SET_EXPR_IN_TEXT = re.compile(r"\{([^}]*)\}")

DELIMS = [',', ';', ' ', '，', '；']


def normalize_token(tok: str) -> str:
    t = tok.strip()
    t = t.replace('\u00a0', ' ')
    t = t.strip('.').strip()
    # Remove stray unicode combining or OCR accents in simple cases
    t = t.replace('“', '').replace('”', '').replace('"', '')
    return t


def split_elements(s: str) -> List[str]:
    s = s.replace(';', ',')
    s = s.replace('；', ',')
    # Replace multiple spaces and commas
    s = re.sub(r"\s+", " ", s)
    s = s.replace(' ,', ',').replace(', ', ',')
    parts = [normalize_token(p) for p in s.split(',') if normalize_token(p)]
    # Some sources use spaces; try to split further if single token contains spaces and digits/letters
    out: List[str] = []
    for p in parts:
        if ' ' in p and not re.search(r"\d\s+\d", p):
            out.extend([q for q in p.split(' ') if q])
        else:
            out.append(p)
    return out


def parse_finite_set_body(body: str) -> Optional[List[str]]:
    # Reject set-builder style like {x ∈ N* | ...}
    if '|' in body or '∈' in body or ':' in body:
        return None
    elems = split_elements(body)
    # Filter out obvious noise
    elems = [e for e in elems if e not in {'', '{', '}', '∅'}]
    return elems


def parse_set_definitions(text: str) -> Dict[str, List[str]]:
    defs: Dict[str, List[str]] = {}
    for m in RE_SET_DEF.finditer(text):
        name = m.group(1).strip()
        body = m.group(2)
        elems = parse_finite_set_body(body)
        if elems is not None:
            defs[name] = elems
    return defs


def detect_set_operation(text: str, defs: Dict[str, List[str]]) -> Tuple[str, Optional[str], Optional[str]]:
    s = text.replace(' ', '')
    # Find explicit op forms like A∩B, A∪B, A\B
    m = re.search(r"([A-Za-z]+)∩([A-Za-z]+)", s)
    if m:
        return ('intersection', m.group(1), m.group(2))
    m = re.search(r"([A-Za-z]+)∪([A-Za-z]+)", s)
    if m:
        return ('union', m.group(1), m.group(2))
    m = re.search(r"([A-Za-z]+)\\([A-Za-z]+)", s)
    if m:
        return ('difference', m.group(1), m.group(2))
    # Vietnamese words
    sl = text.lower()
    if 'giao' in sl:
        # pick first two defined sets
        names = list(defs.keys())
        if len(names) >= 2:
            return ('intersection', names[0], names[1])
    if 'hợp' in sl or 'hop' in sl:
        names = list(defs.keys())
        if len(names) >= 2:
            return ('union', names[0], names[1])
    if 'hiệu' in sl or 'hieu' in sl:
        names = list(defs.keys())
        if len(names) >= 2:
            return ('difference', names[0], names[1])
    # CAB: complement of B in A
    if 'cab' in sl or 'c_ab' in sl or 'c b a' in sl:
        # assume A and B present
        if 'A' in defs and 'B' in defs:
            return ('difference', 'A', 'B')
    return ('', None, None)


def set_intersection(a: List[str], b: List[str]) -> List[str]:
    return sorted(list(set(a) & set(b)), key=lambda x: (not x.isdigit(), x if not x.isdigit() else int(x)))


def set_union(a: List[str], b: List[str]) -> List[str]:
    return sorted(list(set(a) | set(b)), key=lambda x: (not x.isdigit(), x if not x.isdigit() else int(x)))


def set_difference(a: List[str], b: List[str]) -> List[str]:
    return sorted(list(set(a) - set(b)), key=lambda x: (not x.isdigit(), x if not x.isdigit() else int(x)))


def normalize_set_string(elems: List[str]) -> str:
    # normalize to '{1;2;3}' or '{a;b;c}'
    def key(x: str):
        return (not x.isdigit(), x if not x.isdigit() else int(x))
    ordered = sorted(elems, key=key)
    joined = ';'.join(str(int(x)) if x.isdigit() else x for x in ordered)
    return '{' + joined + '}'


def parse_option_set(opt: str) -> Optional[List[str]]:
    m = RE_SET_EXPR_IN_TEXT.search(opt)
    if not m:
        # Option might be exactly like '{1;2}' or '{1,2}' without extra text
        if opt.strip().startswith('{') and opt.strip().endswith('}'):
            body = opt.strip()[1:-1]
        else:
            return None
    else:
        body = m.group(1)
    elems = parse_finite_set_body(body)
    return elems


def auto_answer_item(it: Dict[str, Any]) -> Optional[int]:
    if it.get('type') != 'mc' or it.get('answer_index') is not None:
        return None
    stem = it.get('stem') or ''
    defs = parse_set_definitions(stem)
    op, L, R = detect_set_operation(stem, defs)
    if not op:
        return None
    if L not in defs or (op != 'complement' and R not in defs and op != 'difference'):
        # difference requires both L and R
        if op in ('union', 'intersection', 'difference') and (L not in defs or R not in defs):
            return None
    # Compute target
    if op == 'intersection':
        target = set_intersection(defs[L], defs[R])
    elif op == 'union':
        target = set_union(defs[L], defs[R])
    elif op == 'difference':
        target = set_difference(defs[L], defs[R])
    else:
        return None
    # Compare to options
    opts = it.get('options') or []
    best = None
    for idx, o in enumerate(opts):
        elems = parse_option_set(str(o))
        if elems is None:
            continue
        if set(elems) == set(target):
            best = idx
            break
    return best


def process_file(p: Path) -> Tuple[int, int]:
    items: List[Dict[str, Any]] = []
    with p.open('r', encoding='utf-8') as f:
        for line in f:
            if line.strip():
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
    with p.open('w', encoding='utf-8') as f:
        for it in items:
            f.write(json.dumps(it, ensure_ascii=False) + '\n')
    return updated, total_null


def main():
    import argparse
    ap = argparse.ArgumentParser(description='Auto-answer finite set operations from stems and options.')
    ap.add_argument('--input', nargs='+', default=None)
    args = ap.parse_args()
    files: List[Path] = [Path(p) for p in (args.input or [])]
    if not files:
        files = list(Path('bank/g10/sets/import').glob('*.items.jsonl'))
    tot_u = 0
    tot_n = 0
    for p in files:
        u, n = process_file(p)
        tot_u += u
        tot_n += n
        print(f"{p}: updated {u}/{n} null answers (finite sets)")
    print(f"Done. Total updated {tot_u}/{tot_n}.")


if __name__ == '__main__':
    main()
