#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import re
import unicodedata
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional

QUOTE_CHARS = ['"', '“', '”', '”', '‟', '‟']


def extract_quoted_segments(s: str) -> List[str]:
    # Extract inside Vietnamese/ASCII quotes; fallback to none
    segs: List[str] = []
    # Simple approach: find pairs of any quote chars and capture between
    # Try ASCII quotes first
    for m in re.finditer(r'"([^"\n]+)"', s):
        segs.append(m.group(1))
    # Curly quotes
    for m in re.finditer(r'[“‟]([^”‟\n]+)[”‟]', s):
        segs.append(m.group(1))
    return segs


def detect_quantified_clause(raw: str) -> Optional[Tuple[str, str, str, bool]]:
    """Return (kind, subj, pred, pred_is_negated) where kind in {'forall','exists'}.
    Works on diacritics-free normalized text.
    """
    s0 = norm_cmp(raw)
    s0 = s0.replace('\u00a0', ' ')
    # exists + (maybe negated)
    m = re.search(r"\b(co|ton tai)\s+(?:it\s+nhat\s+)?(?:mot\s+)?(.+?)\s+(.+)$", s0)
    if m:
        subj = m.group(2).strip()
        pred = m.group(3).strip()
        pred_neg = pred.startswith('khong ')
        return ('exists', subj, pred, pred_neg)
    # forall + (maybe negated)
    m = re.search(r"\b(moi|tat ca|voi moi)\s+(.+?)\s+(?:deu\s+)?(.+)$", s0)
    if m:
        subj = m.group(2).strip()
        pred = m.group(3).strip()
        pred_neg = pred.startswith('khong ')
        return ('forall', subj, pred, pred_neg)
    return None


def is_prop_option(text: str) -> bool:
    s = text or ''
    s0 = norm_cmp(s)
    if ('?' in s) or ('!' in s):
        return False
    if any(tok in s0 for tok in ['hay ', 'hay', 'khong duoc', 'dung ']):
        return False
    if any(tok in s0 for tok in [' la ', ' la', 'la ', 'chia het', '=', '>', '<', '≥', '≤']):
        return True
    if any(tok in s0 for tok in [' so ', ' tam giac', ' thu do', ' hinh ', ' la so']):
        return True
    return False


def auto_answer_prop_classify(it: Dict[str, Any]) -> Optional[int]:
    if it.get('type') != 'mc' or it.get('answer_index') is not None:
        return None
    t = is_prop_classify_task(it.get('stem') or '')
    if not t:
        return None
    options = list(it.get('options') or [])
    marks = [is_prop_option(o) for o in options]
    if t == 'is_prop':
        idxs = [i for i, m in enumerate(marks) if m]
    else:
        idxs = [i for i, m in enumerate(marks) if not m]
    return idxs[0] if len(idxs) == 1 else None


LETTER_TAG_RE = re.compile(r"(?i)(?:^|\s)([a-e][\)\.])\s*")


def extract_lettered_segments(stem: str) -> List[str]:
    segs: List[str] = []
    matches = list(LETTER_TAG_RE.finditer(stem))
    if len(matches) < 2:
        return segs
    for i, m in enumerate(matches):
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(stem)
        seg = stem[start:end].strip()
        if seg:
            segs.append(seg)
    return segs


def numeric_option_index(options: List[str], n: int) -> Optional[int]:
    for i, o in enumerate(options):
        m = re.search(r"\d+", o)
        if m and int(m.group(0)) == n:
            return i
    return None


def auto_answer_count_props(it: Dict[str, Any]) -> Optional[int]:
    if it.get('type') != 'mc' or it.get('answer_index') is not None:
        return None
    stem = it.get('stem') or ''
    s0 = norm_cmp(stem)
    if ('bao nhieu' in s0 or 'co bao nhieu' in s0) and 'menh de' in s0:
        segs = extract_lettered_segments(stem)
        if len(segs) < 2:
            # Fallback: split by sentence punctuation (strip LaTeX first)
            text = re.sub(r"\$[^$]*\$", " ", stem)
            parts = re.split(r"[\.!?]+\s+", text)
            segs = [p.strip() for p in parts if p.strip()]
        if len(segs) >= 2:
            cnt = sum(1 for seg in segs if is_prop_option(seg))
            return numeric_option_index(list(it.get('options') or []), cnt)
    return None


def strip_diacritics(s: str) -> str:
    nf = unicodedata.normalize('NFD', s)
    return ''.join(ch for ch in nf if unicodedata.category(ch) != 'Mn')


def norm(s: str) -> str:
    s = s.strip().lower()
    s = s.replace('“', '"').replace('”', '"')
    s = s.replace("'", '"')
    s = re.sub(r"\s+", " ", s)
    return s


def norm_cmp(s: str) -> str:
    return strip_diacritics(norm(s))


def is_negation_task(stem: str) -> bool:
    s = norm_cmp(stem)
    return ('phu dinh' in s)


def is_prop_classify_task(stem: str) -> Optional[str]:
    s = norm_cmp(stem)
    if ('cau nao' in s or 'phat bieu nao' in s or 'trong cac cau sau' in s) and 'menh de' in s:
        if ('khong phai' in s) or ('khong la' in s):
            return 'not_prop'
        return 'is_prop'
    return None


def extract_subject_predicate(s: str) -> Optional[Tuple[str, str, str]]:
    # Parse diacritics-free forms:
    # 1) "moi <S> deu <P>"
    # 2) "co it nhat (mot) <S> <P>"
    s0 = norm_cmp(s)
    s0 = s0.replace('"', '')
    # Pattern 1 (forall)
    m = re.search(r"\bmoi\s+(.+?)\s+deu\s+(.+)$", s0)
    if m:
        subj = m.group(1).strip()
        pred = m.group(2).strip()
        return ('forall', subj, pred)
    # Pattern 2 (exists)
    m = re.search(r"\bco\s+(?:it\s+nhat\s+)?(?:mot\s+)?(.+?)\s+(.+)$", s0)
    if m:
        subj = m.group(1).strip()
        pred = m.group(2).strip()
        return ('exists', subj, pred)
    return None


def negate_predicate(pred: str) -> str:
    p = norm_cmp(pred)
    p = re.sub(r"\s+", " ", p).strip()
    if p.startswith('khong '):
        # remove leading 'khong '
        p = p[len('khong '):]
    else:
        p = 'khong ' + p
    return p.strip()


def candidates_for_negation(kind: str, subj: str, pred: str) -> List[str]:
    npred = negate_predicate(pred)
    cands: List[str] = []
    if kind == 'forall':
        # ¬(forall x: P) => exists x: ¬P
        cands.extend([
            f"co it nhat mot {subj} {npred}",
            f"co it nhat {subj} {npred}",
            f"co mot {subj} {npred}",
            f"co {subj} {npred}",
            f"ton tai {subj} {npred}",
        ])
    elif kind == 'exists':
        # ¬(exists x: P) => forall x: ¬P
        cands.extend([
            f"moi {subj} deu {npred}",
            f"tat ca {subj} deu {npred}",
        ])
    return cands


def match_option(options: List[str], target_phrases: List[str]) -> Optional[int]:
    tcs = [norm_cmp(tp) for tp in target_phrases]
    for idx, opt in enumerate(options):
        oc = norm_cmp(opt)
        for tc in tcs:
            if tc and tc in oc:
                return idx
    return None


def extract_simple_prop(stem: str) -> Optional[str]:
    segs = extract_quoted_segments(stem)
    if segs:
        return norm_cmp(segs[0])
    m = re.search(r":\s*([“\"]?)([^\n]+?)\1\s*$", stem)
    if m:
        return norm_cmp(m.group(2))
    return None


def negate_simple_prop(p: str) -> List[str]:
    s = norm_cmp(p)
    out: List[str] = []
    s2 = re.sub(r"\s+", " ", s)
    if ' chia het cho ' in s2:
        out.append(s2.replace(' chia het cho ', ' khong chia het cho '))
        out.append(s2.replace(' chia het cho ', ' khong chia cho '))
    if ' chia cho ' in s2 and 'chia het cho' not in s2:
        out.append(s2.replace(' chia cho ', ' khong chia cho '))
        out.append(s2.replace(' chia cho ', ' khong chia het cho '))
    if ' khong chia het cho ' in s2:
        out.append(s2.replace(' khong chia het cho ', ' chia het cho '))
        out.append(s2.replace(' khong chia het cho ', ' chia cho '))
    if ' khong chia cho ' in s2:
        out.append(s2.replace(' khong chia cho ', ' chia cho '))
        out.append(s2.replace(' khong chia cho ', ' chia het cho '))
    pairs = [
        (' = ', ' ≠ '), (' ≠ ', ' = '), (' <= ', ' > '), (' >= ', ' < '),
        (' ≤ ', ' > '), (' ≥ ', ' < '), (' < ', ' ≥ '), (' > ', ' ≤ '),
    ]
    for a, b in pairs:
        if a in s2:
            out.append(s2.replace(a, b))
    if ' la ' in s2:
        out.append(s2.replace(' la ', ' khong la '))
        out.append(s2.replace(' la ', ' khong phai la '))
        # synonyms: so le <-> so chan
        if ' so le' in s2 or 'so le ' in s2 or ' so le ' in s2:
            out.append(s2.replace(' so le', ' so chan'))
            out.append(s2.replace(' so le ', ' so chan '))
        if ' so chan' in s2 or 'so chan ' in s2 or ' so chan ' in s2:
            out.append(s2.replace(' so chan', ' so le'))
            out.append(s2.replace(' so chan ', ' so le '))
        # synonyms: nguyen to <-> hop so (approximate)
        if ' so nguyen to' in s2 or ' so nguyen to ' in s2:
            out.append(s2.replace(' so nguyen to', ' hop so'))
            out.append(s2.replace(' so nguyen to ', ' hop so '))
        if ' hop so' in s2 or ' hop so ' in s2:
            out.append(s2.replace(' hop so', ' so nguyen to'))
            out.append(s2.replace(' hop so ', ' so nguyen to '))
    if ' khong la ' in s2:
        out.append(s2.replace(' khong la ', ' la '))
    if ' khong phai la ' in s2:
        out.append(s2.replace(' khong phai la ', ' la '))
    if ' ∈ ' in s2:
        out.append(s2.replace(' ∈ ', ' ∉ '))
    if ' ∉ ' in s2:
        out.append(s2.replace(' ∉ ', ' ∈ '))
    out_norm = []
    for t in out:
        u = re.sub(r"\s+", " ", t).strip()
        if u and u != s:
            out_norm.append(u)
    return list(dict.fromkeys(out_norm))


def auto_answer_simple_negation(it: Dict[str, Any]) -> Optional[int]:
    if it.get('type') != 'mc' or it.get('answer_index') is not None:
        return None
    stem = it.get('stem') or ''
    if not is_negation_task(stem):
        return None
    p = extract_simple_prop(stem)
    if not p:
        return None
    cands = negate_simple_prop(p)
    if not cands:
        return None
    return match_option(list(it.get('options') or []), cands)


def is_converse_task(stem: str) -> bool:
    s0 = norm_cmp(stem)
    return ('menh de dao' in s0) or ('tim menh de dao' in s0) or ('dao cua' in s0)


def extract_if_then(raw: str) -> Optional[Tuple[str, str]]:
    s0 = norm_cmp(raw)
    # Look for "neu P thi Q" inside quotes if any, else in the whole string
    cands = extract_quoted_segments(raw) or [raw]
    for seg in cands:
        t = norm_cmp(seg)
        m = re.search(r"\bneu\s+(.+?)\s+thi\s+(.+)$", t)
        if m:
            P = m.group(1).strip()
            Q = m.group(2).strip()
            return (P, Q)
    return None


def auto_answer_converse(it: Dict[str, Any]) -> Optional[int]:
    if it.get('type') != 'mc' or it.get('answer_index') is not None:
        return None
    stem = it.get('stem') or ''
    if not is_converse_task(stem):
        return None
    pq = extract_if_then(stem)
    if not pq:
        return None
    P, Q = pq
    cands = [f"neu {Q} thi {P}"]
    return match_option(list(it.get('options') or []), cands)


def auto_answer_negation(it: Dict[str, Any]) -> Optional[int]:
    if it.get('type') != 'mc' or it.get('answer_index') is not None:
        return None
    stem = it.get('stem') or ''
    if not is_negation_task(stem):
        return None
    # Extract quoted phrase if present, else use stem
    options = list(it.get('options') or [])
    # Prefer parsing the quoted proposition if present
    segs = extract_quoted_segments(stem)
    parsed = None
    if segs:
        for seg in segs:
            q = detect_quantified_clause(seg)
            if q:
                parsed = q
                break
    if not parsed:
        # Fallback to whole stem parsing (legacy)
        sp = extract_subject_predicate(stem)
        if sp:
            kind, subj, pred = sp
            parsed = (kind, subj, pred, pred.startswith('khong '))
    if parsed:
        kind, subj, pred, pred_neg = parsed
        # Negation logic depends on whether predicate is already negated
        if kind == 'forall':
            # ¬(forall x: P) => exists x: ¬P ; if P is 'khong R', then ¬P is R
            target_pred = pred[len('khong '):] if pred_neg else ('khong ' + pred)
            cands = candidates_for_negation('forall', subj, target_pred)
        else:  # exists
            # ¬(exists x: P) => forall x: ¬P ; if P is 'khong R', then ¬P is R
            target_pred = pred[len('khong '):] if pred_neg else ('khong ' + pred)
            cands = candidates_for_negation('exists', subj, target_pred)
        idx = match_option(options, cands)
        if idx is not None:
            return idx
    # Coarse fallback: if stem mentions 'moi' (forall), choose option mentioning existence + negation
    s0 = norm_cmp(stem)
    if 'moi ' in s0 and 'deu' in s0:
        matches = []
        for i, opt in enumerate(options):
            oc = norm_cmp(opt)
            if (('co ' in oc or 'ton tai' in oc) and 'khong ' in oc):
                matches.append(i)
        if len(matches) == 1:
            return matches[0]
    # If stem mentions 'co' (exists), choose option mentioning 'moi' + negation
    if 'co ' in s0 or 'ton tai' in s0:
        matches = []
        for i, opt in enumerate(options):
            oc = norm_cmp(opt)
            if (('moi ' in oc or 'tat ca' in oc) and 'khong ' in oc):
                matches.append(i)
        if len(matches) == 1:
            return matches[0]
    return None


def process_file(p: Path) -> Tuple[int, int]:
    items: List[Dict[str, Any]] = []
    with p.open('r', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                items.append(json.loads(line))
    updated = 0
    nulls = 0
    for it in items:
        if it.get('type') == 'mc' and it.get('answer_index') is None:
            nulls += 1
            idx = auto_answer_simple_negation(it)
            if idx is None:
                idx = auto_answer_converse(it)
            if idx is None:
                idx = auto_answer_negation(it)
            if idx is None:
                idx = auto_answer_prop_classify(it)
            if idx is None:
                idx = auto_answer_count_props(it)
            if idx is not None:
                it['answer_index'] = idx
                updated += 1
    with p.open('w', encoding='utf-8') as f:
        for it in items:
            f.write(json.dumps(it, ensure_ascii=False) + '\n')
    return updated, nulls


def main():
    import argparse
    ap = argparse.ArgumentParser(description='Auto-answer logic negation (phủ định) items.')
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
        print(f"{p}: updated {u}/{n} null answers (logic heuristics)")
    print(f"Done. Total updated {tot_u}/{tot_n}.")


if __name__ == '__main__':
    main()
