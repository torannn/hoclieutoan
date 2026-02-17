import json
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

ROOT = Path(__file__).resolve().parent
EXAM_PATH = ROOT / "exam.json"
ANSWERS_PATH = ROOT / "answers.json"
SECTIONS_DIR = ROOT / "sections"
MANIFEST_PATH = SECTIONS_DIR / "sections-manifest.json"

PART_ORDER = ["a", "b", "c", "d"]

PATTERN_WITH_UNDERSCORE = re.compile(r"^(?P<base>.+)_(?P<part>[abcd])(?P<suffix>_p\d+)$", re.IGNORECASE)
PATTERN_SUFFIX_LETTER = re.compile(r"^(?P<base>.+?)(?P<part>[abcd])(?P<suffix>_p\d+)$", re.IGNORECASE)


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, data) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def backup_file(path: Path, ts: str) -> Optional[Path]:
    if not path.exists():
        return None
    bak = path.with_suffix(path.suffix + f".{ts}.bak")
    bak.write_bytes(path.read_bytes())
    return bak


def normalize_text(s: str) -> str:
    return re.sub(r"\s+", " ", str(s or "").strip().lower())


def parse_split_qid(qid: str) -> Optional[Tuple[str, str, str]]:
    m = PATTERN_WITH_UNDERSCORE.match(qid)
    if m:
        return m.group("base"), m.group("part").lower(), m.group("suffix")

    m = PATTERN_SUFFIX_LETTER.match(qid)
    if m and m.group("base") and m.group("base")[-1].isdigit():
        return m.group("base"), m.group("part").lower(), m.group("suffix")

    return None


def is_binary_tf_options(options) -> bool:
    normalized = [normalize_text(x) for x in (options or [])]
    return len(normalized) == 2 and "đúng" in normalized and "sai" in normalized


def extract_intro(stem: str) -> str:
    text = str(stem or "")
    markers = [
        "Khẳng định sau đúng hay sai:",
        "Xét tính đúng sai của khẳng định sau:",
    ]
    for marker in markers:
        idx = text.lower().find(marker.lower())
        if idx >= 0:
            return text[: idx + len(marker)].strip()

    # Fallback: remove trailing a)/b)/c)/d) clause on first stem if present.
    m = re.search(r"(?is)^(.*?)(?:\n\s*\n\s*[abcd]\)\s+).*$", text)
    if m:
        return m.group(1).strip()

    return text.strip()


def extract_statement(stem: str, part: str) -> str:
    text = str(stem or "").strip()

    patterns = [
        r"(?is)Khẳng định sau đúng hay sai:\s*(.*)$",
        r"(?is)Xét tính đúng sai của khẳng định sau:\s*(.*)$",
    ]

    payload = ""
    for pat in patterns:
        m = re.search(pat, text)
        if m:
            payload = m.group(1).strip()
            break

    if not payload:
        m = re.search(rf"(?is)\b{re.escape(part)}\)\s*(.*)$", text)
        if m:
            payload = m.group(1).strip()

    if not payload:
        payload = text

    payload = re.sub(rf"(?is)^\s*{re.escape(part)}\)\s*", "", payload).strip()
    return payload


def bool_from_correct_index(v) -> Optional[bool]:
    if v == 0:
        return True
    if v == 1:
        return False
    return None


def combine_answers(parts: List[Tuple[str, str]]) -> str:
    blocks = []
    for part, text in parts:
        clean = str(text or "").strip()
        if not clean:
            clean = "Chưa có lời giải chi tiết."
        blocks.append(f"- **Khẳng định {part}:** {clean}")
    return "\n\n".join(blocks)


def sync_sections_from_exam(exam_obj: dict, ts: str) -> Dict[str, int]:
    manifest = load_json(MANIFEST_PATH)
    sections = manifest.get("sections") or []
    if not isinstance(sections, list) or not sections:
        raise ValueError("sections-manifest.json missing sections[]")

    questions = exam_obj.get("questions") if isinstance(exam_obj, dict) else exam_obj
    if not isinstance(questions, list):
        raise ValueError("exam.json must be object.questions[] or list")

    by_key: Dict[str, List[dict]] = {}
    for q in questions:
        if isinstance(q, dict) and q.get("main_section"):
            by_key.setdefault(q["main_section"], []).append(q)

    section_counts: Dict[str, int] = {}

    for sec in sections:
        key = sec.get("key")
        rel = sec.get("path")
        if not key or not rel:
            continue

        section_path = ROOT / rel
        if not section_path.exists():
            continue

        sec_data = load_json(section_path)
        if not isinstance(sec_data, dict) or not isinstance(sec_data.get("questions"), list):
            raise ValueError(f"Invalid section format: {section_path}")

        backup_file(section_path, ts)
        sec_questions = by_key.get(key, [])
        sec_data["questions"] = sec_questions
        sec["questionCount"] = len(sec_questions)
        section_counts[key] = len(sec_questions)
        save_json(section_path, sec_data)

    backup_file(MANIFEST_PATH, ts)
    manifest["generatedAt"] = datetime.now().isoformat(timespec="milliseconds")
    manifest["totalQuestions"] = sum(int(s.get("questionCount") or 0) for s in sections)
    save_json(MANIFEST_PATH, manifest)

    # Validate JSON integrity
    load_json(MANIFEST_PATH)
    for sec in sections:
        rel = sec.get("path")
        if rel:
            p = ROOT / rel
            if p.exists():
                load_json(p)

    return section_counts


def main() -> None:
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")

    exam_obj = load_json(EXAM_PATH)
    answers_obj = load_json(ANSWERS_PATH)

    questions = exam_obj.get("questions") if isinstance(exam_obj, dict) else exam_obj
    if not isinstance(questions, list):
        raise ValueError("exam.json must be object.questions[] or list")
    if not isinstance(answers_obj, dict):
        raise ValueError("answers.json must be object")

    groups: Dict[Tuple[str, str], List[Tuple[int, dict, str]]] = {}
    for idx, q in enumerate(questions):
        if not isinstance(q, dict):
            continue
        if q.get("type") != "true_false":
            continue
        if q.get("tf_parts"):
            continue
        if not is_binary_tf_options(q.get("options")):
            continue

        qid = str(q.get("q_id") or "")
        parsed = parse_split_qid(qid)
        if not parsed:
            continue

        base, part, suffix = parsed
        groups.setdefault((base, suffix), []).append((idx, q, part))

    merge_groups: List[Tuple[Tuple[str, str], List[Tuple[int, dict, str]]]] = []
    for key, items in groups.items():
        parts = sorted({p for _, _, p in items})
        if parts == PART_ORDER:
            merge_groups.append((key, items))

    if not merge_groups:
        print("No split true_false groups found to normalize.")
        return

    backup_file(EXAM_PATH, ts)
    backup_file(ANSWERS_PATH, ts)

    remove_indexes = set()
    insertions: List[Tuple[int, dict]] = []
    report_rows = []

    for (base, suffix), items in sorted(merge_groups, key=lambda x: min(i for i, _, _ in x[1])):
        ordered = sorted(items, key=lambda t: PART_ORDER.index(t[2]))
        first_idx = ordered[0][0]
        first_q = ordered[0][1]

        intro = extract_intro(first_q.get("stem") or "")
        tf_parts = []
        answer_parts = []
        old_qids = []

        for _, q, part in ordered:
            qid = str(q.get("q_id") or "")
            old_qids.append(qid)
            statement = extract_statement(q.get("stem") or "", part)
            ans_bool = bool_from_correct_index(q.get("correct_index"))
            tf_parts.append({"key": part, "statement": statement, "answer": ans_bool})
            answer_parts.append((part, answers_obj.get(qid, "")))

        combined_qid = f"{base}_combined{suffix}"
        combined_q = {
            "q_id": combined_qid,
            "section": first_q.get("section", ""),
            "type": "true_false",
            "stem": intro,
            "options": [],
            "correct_index": None,
            "main_section": first_q.get("main_section"),
            "tf_parts": tf_parts,
        }

        for idx, _, _ in ordered:
            remove_indexes.add(idx)

        insertions.append((first_idx, combined_q))

        combined_answer = combine_answers(answer_parts)
        answers_obj[combined_qid] = combined_answer
        for _, q, _ in ordered:
            qid = str(q.get("q_id") or "")
            if qid in answers_obj:
                del answers_obj[qid]

        report_rows.append((combined_qid, old_qids))

    new_questions = [q for idx, q in enumerate(questions) if idx not in remove_indexes]

    # Insert combined items while preserving relative order
    shift = 0
    for idx, q in sorted(insertions, key=lambda x: x[0]):
        new_questions.insert(idx - shift, q)
        shift += 1

    if isinstance(exam_obj, dict):
        exam_obj["questions"] = new_questions
    else:
        exam_obj = new_questions

    save_json(EXAM_PATH, exam_obj)
    save_json(ANSWERS_PATH, answers_obj)

    section_counts = sync_sections_from_exam(exam_obj, ts)

    # Final validation
    load_json(EXAM_PATH)
    load_json(ANSWERS_PATH)

    print("---NORMALIZE TRUE_FALSE REPORT---")
    print(f"Merged groups: {len(report_rows)}")
    for combined_qid, old_qids in report_rows:
        print(f"{combined_qid} <- {', '.join(old_qids)}")
    print("Section counts after sync:")
    for k, v in sorted(section_counts.items()):
        print(f"- {k}: {v}")


if __name__ == "__main__":
    main()
