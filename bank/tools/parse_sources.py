#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import json
import re
import sys
import unicodedata
from hashlib import md5
from pathlib import Path
from typing import List, Dict, Any, Tuple
from dataclasses import dataclass

# -------------------------------
# Normalization utilities
# -------------------------------

SP_BULLETS = "»•◦▪"

RE_SPACES_IN_DIGITS = re.compile(r"(?<=\d)\s+(?=\d)")
RE_NESTED_BRACES = re.compile(r"\{\s*\{([^}]*)\}\s*\}")
RE_RM_RM = re.compile(r"\\mathrm\s*\{([^}]*)\}")
RE_PRIME_PRIME = re.compile(r"\^\s*\{\s*\\prime\s*\\prime\s*\}")
RE_DEG = re.compile(r"\^\s*\{\s*\\circ\s*\}")
RE_MULTI_SPACE = re.compile(r"[\t ]+")
RE_HTML_TAG = re.compile(r"<[^>]+>")

# Câu ... regex
RE_CAU_HEAD = re.compile(r"^\s*(?:»\s*)?Câu\s+(\d+)\s*[\.:]")
RE_OPTIONS_SPLIT = re.compile(r"(?:(?:^|\s))(A|B|C|D)\.\s+")
RE_INLINE_ABCD = re.compile(r"\bA\.\s|\bB\.\s|\bC\.\s|\bD\.\s")
RE_OPTION_CAP = re.compile(r"\b([ABCD])\.\s+(.*?)\s*(?=(?:[ABCD]\.\s)|$)")
RE_ANSWER_IN_SOLUTION = re.compile(r"(?i)(?:Đáp án|Dap an|Chọn|Chon|Đúng là|Đúng:)[^A-D]*([ABCD])\b")
RE_TF_CUE = re.compile(r"(?i)đúng\s*/\s*sai|đúng\s*sai|d/s|dung\s*sai")
RE_TF_LINE = re.compile(r"^\s*([a-dA-D])\s*[\)\.]\s*(.+?)\s*$")
RE_TF_ANS = re.compile(r"(?i)\b([a-d])\s*[\)\.:]?\s*(đúng|sai)\b")
RE_FINAL_MARK = re.compile(r"(?i)(đáp\s*(?:án|số)|kết\s*quả)\s*[:：]\s*(.+)")
RE_INTERVAL_ANS = re.compile(r"([\(\[]\s*(?:-?\d+(?:\.\d+)?|\-?∞|∞|inf)\s*,\s*(?:-?\d+(?:\.\d+)?|\-?∞|∞|inf)\s*[\)\]])")
RE_NUM_ASSIGN = re.compile(r"(?i)\b([a-z])\s*=\s*([-+]?\d+(?:\.\d+)?)")
RE_SET_BRACE = re.compile(r"(\{[^\}]+\})")
RE_IN_MEMBERSHIP = re.compile(r"(?i)\b([a-z])\s*∈\s*([^\s,;\n]+)")

# Solution markers
SOLUTION_MARKERS = [
    "# Lời giải", "#  Lời giải", " Lời giải", "Lời giải", "# Trả lời:", "Trả lời:",
]

# Markers used to trim trailing content from options/stems
STOP_MARKERS = [
    "# Lời giải", "#  Lời giải", "Lời giải", "Trả lời", "# Trả lời:",
    "Chọn ", "# Chọn", "Đáp án", "ĐÁP ÁN", "Dap an", "DAP AN", "Đáp án đúng"
]
RE_STOP_MARKERS_CI = re.compile(r"(?i)(#\s*loi\s*giai|loi\s*giai|tra\s*loi|#\s*tra\s*loi|dap\s*an|đap\s*an|đáp\s*án|chon|chọn|#\s*chon|#\s*chọn)")


def _strip_html_tables(block: str) -> str:
    # Remove raw HTML tables; they are often malformed in OCR
    return RE_HTML_TAG.sub(" ", block)


def normalize_text(text: str) -> str:
    # Collapse nested braces {...{...}...}
    while True:
        new_text = RE_NESTED_BRACES.sub(r"{\1}", text)
        if new_text == text:
            break
        text = new_text

    # Remove \mathrm{...} and collapse inner spaces
    def _rm_repl(m):
        inner = m.group(1)
        inner = inner.replace(" ", "")
        return inner

    text = RE_RM_RM.sub(_rm_repl, text)

    # Normalize common math symbols
    text = text.replace("\\Longleftrightarrow", "\\Leftrightarrow")
    text = text.replace("\\Rightarrow", "⇒")  # keep as symbol for simpler parsing
    text = text.replace("\\Leftrightarrow", "⇔")

    # Remove prime-prime artifacts from OCR quotes
    text = RE_PRIME_PRIME.sub("", text)

    # Normalize degree
    text = RE_DEG.sub(r"^{\\circ}", text)

    # Collapse spaces between digits (e.g., 1 8 0 -> 180)
    text = RE_SPACES_IN_DIGITS.sub("", text)

    # Remove weird bullets
    text = re.sub("[" + re.escape(SP_BULLETS) + "]", " ", text)

    # Remove most HTML residue (tables etc.)
    text = _strip_html_tables(text)

    # Collapse whitespace
    text = RE_MULTI_SPACE.sub(" ", text)
    text = re.sub(r"\s+\n", "\n", text)

    return text


# -------------------------------
# Normalized matching helpers
# -------------------------------

def strip_diacritics(s: str) -> str:
    return "".join(ch for ch in unicodedata.normalize("NFD", s) if unicodedata.category(ch) != "Mn")


def norm_cmp(s: str) -> str:
    s = strip_diacritics(s or "")
    s = s.lower()
    s = re.sub(r"\s+", " ", s).strip()
    return s


def has_tf_cue(text: str) -> bool:
    if not text:
        return False
    # Direct regex quick checks
    if RE_TF_CUE.search(text):
        return True
    # Diacritics-insensitive, punctuation-tolerant checks
    t = norm_cmp(text)
    if 'xet tinh dung' in t:
        return True
    if 'xet tinh dung sai' in t or 'xet tinh dung (sai)' in t:
        return True
    if 'dung sai' in t or 'dung/sai' in t:
        return True
    return False


SHORT_STEM_CUES = [
    "tim", "giai", "tinh", "xac dinh", "hay tim", "dap so", "ket qua", "tim m", "tim x", "gia tri", "tim tap", "tim khoang"
]


def is_plausible_final_answer(ans: str) -> bool:
    if not ans:
        return False
    a = ans.strip()
    # Reject empty braces or lone symbols like { } or {\circ}
    if a in {"{}", "{ }", "{\\circ}", "{ \\circ }"}:
        return False
    # Accept if contains digits or infinity or relation/membership symbols
    if re.search(r"\d", a):
        return True
    if any(sym in a for sym in ["∞", "-∞", "inf", "=", "∈", "[", "]", "(", ")"]):
        return True
    # Set braces with letters/numbers separated by , ; or spaces
    if a.startswith("{") and a.endswith("}"):
        inner = a[1:-1].strip()
        if len(inner) == 0:
            return False
        if re.search(r"[\w\d]", inner):
            return True
    return False

# -------------------------------
# Parsing
# -------------------------------

@dataclass
class ItemBlock:
    idx: int
    stem: str
    options: List[str]
    answer_letter: str
    solution: str
    line_start: int
    line_end: int


def iter_cau_blocks(lines: List[str]) -> List[Tuple[int, int, int]]:
    """
    Return list of tuples (cau_number, start_line_idx, end_line_idx_exclusive)
    marking blocks starting at a 'Câu n.' and ending before next 'Câu' or EOF.
    """
    starts: List[Tuple[int, int]] = []
    for i, ln in enumerate(lines):
        m = RE_CAU_HEAD.match(ln)
        if m:
            try:
                n = int(m.group(1))
            except Exception:
                n = -1
            starts.append((n, i))

    blocks = []
    for j, (n, s) in enumerate(starts):
        e = starts[j + 1][1] if j + 1 < len(starts) else len(lines)
        blocks.append((n, s, e))
    return blocks


def parse_options(block_text: str) -> List[str]:
    # Try to capture A./B./C./D. with a regex that tolerates inline or multiline
    options: List[str] = []
    # Replace newlines with spaces to simplify inline captures
    text = block_text.replace("\n", " ")

    # Build matches in order A, B, C, D
    caps = list(RE_OPTION_CAP.finditer(text))
    if caps:
        # Ensure order A-D
        by_label: Dict[str, str] = {}
        for m in caps:
            by_label[m.group(1)] = m.group(2).strip()
        for label in ["A", "B", "C", "D"]:
            if label in by_label:
                options.append(by_label[label])
        if len(options) == 4:
            return options

    # Fallback: split on ' A. ' etc
    if RE_INLINE_ABCD.search(text):
        parts = re.split(r"\b[ABCD]\.\s+", text)
        # First part is stem remainder; skip
        opt_parts = [p.strip() for p in parts[1:5]]
        if len(opt_parts) == 4:
            return opt_parts

    return []


def extract_solution(lines: List[str], start: int, end: int) -> Tuple[str, int]:
    """Find solution text starting after the block within [start, end),
    returns (solution_text, end_line_idx)
    """
    # Search forward from start for solution markers within the block tail
    local = lines[start:end]
    sol_start_rel = -1
    for i, ln in enumerate(local):
        if any(marker in ln for marker in SOLUTION_MARKERS):
            sol_start_rel = i + 1  # content after the marker line
            break
    if sol_start_rel == -1:
        return ("", end)

    # Capture until a new heading or new 'Câu'
    sol_lines: List[str] = []
    for j in range(sol_start_rel, len(local)):
        if RE_CAU_HEAD.match(local[j]):
            break
        if local[j].strip().startswith("# ") and j > sol_start_rel:
            break
        sol_lines.append(local[j])
    return ("\n".join(sol_lines).strip(), start + sol_start_rel + len(sol_lines))


def detect_measure(stem: str) -> List[str]:
    s = stem.lower()
    measures: List[str] = []
    # Interval presence gate
    has_interval = bool(re.search(r"[\(\[][\s\-0-9∞,]+[\)\]]", stem))
    # Interval set ops
    if has_interval and ("giao" in s or "∩" in s):
        measures.append("G10-SET-TASK-012")
    if has_interval and ("hợp" in s or "hop" in s or "∪" in s):
        measures.append("G10-SET-TASK-013")
    if has_interval and ("phần bù" in s or "phan bu" in s or "cab" in s):
        measures.append("G10-SET-TASK-015")
    if has_interval and ("hiệu" in s or "hieu" in s or "a\\b" in s or " \\ " in s):
        measures.append("G10-SET-TASK-014")
    if "n(a ∪ b)" in s or "ven" in s:
        measures.append("G10-SET-TASK-016")
    if "bao hàm" in s or "3 tập" in s or "ba tập" in s:
        measures.append("G10-SET-TASK-017")
    if "tham số" in s or "tìm m" in s or "tham so" in s:
        measures.append("G10-SET-TASK-018")
    # Logic tasks
    if "mệnh đề" in s or "menh de" in s:
        if "phủ định" in s or "phu dinh" in s:
            measures.append("G10-SET-TASK-021")
        if "∀" in stem or "exists" in s or "tồn tại" in s or "voi moi" in s or "ton tai" in s:
            measures.append("G10-SET-TASK-022")
        if "⇒" in stem or "kéo theo" in s or "keo theo" in s:
            measures.append("G10-SET-TASK-023")
        if "⇔" in stem or "tương đương" in s or "tuong duong" in s or "cần và đủ" in s or "can va du" in s:
            measures.append("G10-SET-TASK-024")
        if "đảo" in s or "dao" in s:
            measures.append("G10-SET-TASK-025")
    return list(dict.fromkeys(measures))


def guess_answer_from_solution(sol_text: str) -> int:
    if not sol_text:
        return -1
    m = RE_ANSWER_IN_SOLUTION.search(sol_text)
    if m:
        letter = m.group(1).upper()
        return {"A": 0, "B": 1, "C": 2, "D": 3}.get(letter, -1)
    return -1


def guess_answer_from_raw_block(raw_block: str) -> int:
    if not raw_block:
        return -1
    m = RE_ANSWER_IN_SOLUTION.search(raw_block)
    if m:
        letter = m.group(1).upper()
        return {"A": 0, "B": 1, "C": 2, "D": 3}.get(letter, -1)
    return -1


def gen_item_id(prefix: str, stem: str) -> str:
    h = md5(stem.encode("utf-8")).hexdigest()[:8]
    return f"G10-SET-I-{prefix}-{h}"


def parse_file(md_path: Path, source_id: str) -> List[Dict[str, Any]]:
    raw = md_path.read_text(encoding="utf-8", errors="ignore")
    norm = normalize_text(raw)
    lines = norm.splitlines()

    items: List[Dict[str, Any]] = []
    blocks = iter_cau_blocks(lines)

    for n, s, e in blocks:
        raw_block = "\n".join(lines[s:e]).strip()
        # Trim trailing solution from block for option parsing
        cut = len(raw_block)
        for mark in STOP_MARKERS:
            pos = raw_block.find(mark)
            if pos != -1:
                cut = min(cut, pos)
        m_stop = RE_STOP_MARKERS_CI.search(raw_block)
        if m_stop:
            cut = min(cut, m_stop.start())
        block_text = raw_block[:cut]
        options = parse_options(block_text)
        if len(options) != 4:
            # Try TF parsing if there are đúng/sai cues (robust detection)
            tf_statements: List[str] = []
            tf_possible = has_tf_cue(block_text) or has_tf_cue(raw_block)
            if tf_possible:
                # Collect lines starting with a./b./c./d.
                for ln in raw_block.splitlines():
                    m = RE_TF_LINE.match(ln)
                    if m:
                        tf_statements.append(m.group(2).strip())
                if tf_statements:
                    # Extract solution for potential boolean answers
                    solution_text, _ = extract_solution(lines, s, e)
                    answers: List[bool] = []
                    if solution_text:
                        lower = solution_text.lower()
                        # map letter to bool
                        found_map = {m.group(1).lower(): (m.group(2).lower() == 'đúng' or m.group(2).lower() == 'dung')
                                     for m in RE_TF_ANS.finditer(lower)}
                        for idx in range(len(tf_statements)):
                            key = chr(ord('a') + idx)
                            if key in found_map:
                                answers.append(found_map[key])
                    item_tf: Dict[str, Any] = {
                        "id": gen_item_id(source_id.split("-")[-1], f"TF:{lines[s].strip()}"),
                        "type": "tf",
                        "stem": RE_CAU_HEAD.sub("", lines[s]).strip() or lines[s].strip(),
                        "statements": tf_statements,
                        "measures": detect_measure(raw_block),
                        "requires": [],
                        "rationalized_by": [],
                        "grounded_in": [],
                        "solution": solution_text,
                        "source_ref": {
                            "source_id": source_id,
                            "path": str(md_path.as_posix()),
                            "line_start": s + 1,
                            "line_end": e,
                        },
                    }
                    if answers:
                        item_tf["answers"] = answers
                    items.append(item_tf)
            # If not TF statements found
            if not tf_statements:
                # If TF cue exists but parsing failed, do NOT fallback to short to avoid misclassification
                if tf_possible:
                    continue
                # Else, try short-answer by extracting a final answer, but gate it
                solution_text, _ = extract_solution(lines, s, e)
                stem_line = RE_CAU_HEAD.sub("", lines[s]).strip() or lines[s].strip()
                stem_norm = norm_cmp(stem_line)
                sol_has_marker = bool(RE_FINAL_MARK.search(solution_text))
                has_directive = any(cue in stem_norm for cue in SHORT_STEM_CUES)
                allow_short = has_directive or sol_has_marker
                ans_text = ""
                # Prefer explicit markers
                m = RE_FINAL_MARK.search(solution_text)
                if m:
                    ans_text = m.group(2).strip()
                if not ans_text:
                    # Try to find an interval expression in solution or raw block tail
                    m2 = None
                    for src_txt in (solution_text, raw_block):
                        if not src_txt:
                            continue
                        m2 = RE_INTERVAL_ANS.search(src_txt)
                        if m2:
                            ans_text = m2.group(1).strip()
                            break
                if not ans_text:
                    # Numeric assignment like x = 3
                    m3 = None
                    for src_txt in (solution_text, raw_block):
                        if not src_txt:
                            continue
                        for m in RE_NUM_ASSIGN.finditer(src_txt):
                            m3 = m
                        if m3:
                            ans_text = f"{m3.group(1)} = {m3.group(2)}"
                            break
                if not ans_text:
                    # Set literal like {1;2;3}
                    m4 = None
                    for src_txt in (solution_text, raw_block):
                        if not src_txt:
                            continue
                        m4 = RE_SET_BRACE.search(src_txt)
                        if m4:
                            ans_text = m4.group(1).strip()
                            break
                if not ans_text:
                    # Membership like x ∈ A
                    m5 = None
                    for src_txt in (solution_text, raw_block):
                        if not src_txt:
                            continue
                        m5 = RE_IN_MEMBERSHIP.search(src_txt)
                        if m5:
                            ans_text = f"{m5.group(1)} ∈ {m5.group(2)}"
                            break
                if allow_short and is_plausible_final_answer(ans_text):
                    item_short: Dict[str, Any] = {
                        "id": gen_item_id(source_id.split("-")[-1], f"SHORT:{stem_line}"),
                        "type": "short",
                        "stem": stem_line,
                        "final_answer": ans_text,
                        "measures": detect_measure(raw_block),
                        "requires": [],
                        "rationalized_by": [],
                        "grounded_in": [],
                        "solution": solution_text,
                        "source_ref": {
                            "source_id": source_id,
                            "path": str(md_path.as_posix()),
                            "line_start": s + 1,
                            "line_end": e,
                        },
                    }
                    items.append(item_short)
            # Not MC; move to next block
            continue

        # Stem without options: take block head up to first option capture
        text_for_stem = block_text.replace("\n", " ")
        opt_caps = list(RE_OPTION_CAP.finditer(text_for_stem))
        if opt_caps:
            stem = text_for_stem[: opt_caps[0].start()].strip()
            # Remove 'Câu n.' prefix if present
            stem = RE_CAU_HEAD.sub("", stem).strip()
        else:
            # Fallback to first non-empty line sans 'Câu n.'
            stem_line = lines[s]
            stem = RE_CAU_HEAD.sub("", stem_line).strip()
            if not stem:
                for k in range(s + 1, min(s + 5, e)):
                    if lines[k].strip():
                        stem = lines[k].strip()
                        break
        # Clean any trailing markers from options
        cleaned_opts: List[str] = []
        for opt in options:
            opt_cut = len(opt)
            for mark in STOP_MARKERS:
                pos2 = opt.find(mark)
                if pos2 != -1:
                    opt_cut = min(opt_cut, pos2)
            m2 = RE_STOP_MARKERS_CI.search(opt)
            if m2:
                opt_cut = min(opt_cut, m2.start())
            cleaned_opts.append(opt[:opt_cut].strip())

        # Extract solution
        solution_text, _ = extract_solution(lines, s, e)

        # Guess answer index from solution, then raw block as fallback
        ans_idx = guess_answer_from_solution(solution_text)
        if ans_idx < 0:
            ans_idx = guess_answer_from_raw_block(raw_block)
        # Use richer context to detect measures (stem + block_text)
        measure_ctx = f"{stem} {block_text}".strip()

        item: Dict[str, Any] = {
            "id": gen_item_id(source_id.split("-")[-1], f"{stem}"),
            "type": "mc",
            "stem": stem,
            "options": cleaned_opts,
            "answer_index": ans_idx if ans_idx >= 0 else None,
            "measures": detect_measure(measure_ctx),
            "requires": [],
            "rationalized_by": [],
            "grounded_in": [],
            "solution": solution_text,
            "source_ref": {
                "source_id": source_id,
                "path": str(md_path.as_posix()),
                "line_start": s + 1,
                "line_end": e,
            },
        }
        items.append(item)

    return items


def main():
    ap = argparse.ArgumentParser(description="Parse Markdown sources into JSONL items.")
    ap.add_argument("--sources", nargs="+", help="Paths to Markdown sources")
    ap.add_argument("--source-ids", nargs="+", help="Source IDs corresponding to each source")
    ap.add_argument("--output-dir", default="bank/g10/sets/import", help="Output directory for JSONL files")
    args = ap.parse_args()

    if not args.sources:
        # Default to the two known sources
        args.sources = [
            "bank/source/chuyen-de-menh-de-va-tap-hop-toan-10.md",
            "bank/source/phan-dang-va-bai-tap-menh-de-va-tap-hop.md",
        ]
    if not args.source_ids:
        args.source_ids = ["G10-SET-SOURCE-001", "G10-SET-SOURCE-002"]

    if len(args.sources) != len(args.source_ids):
        print("--sources and --source-ids must have same length", file=sys.stderr)
        sys.exit(1)

    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    total = 0
    for src, sid in zip(args.sources, args.source_ids):
        p = Path(src)
        if not p.exists():
            print(f"WARN: source not found: {p}", file=sys.stderr)
            continue
        items = parse_file(p, sid)
        total += len(items)
        out_file = out_dir / (p.stem + ".items.jsonl")
        with out_file.open("w", encoding="utf-8") as f:
            for it in items:
                f.write(json.dumps(it, ensure_ascii=False) + "\n")
        print(f"Wrote {len(items)} items -> {out_file}")

    print(f"Done. Total items: {total}")


if __name__ == "__main__":
    main()
