// Scan dữ liệu ON_TAP_LOP_9 tìm câu lỗi / nghi vấn
// Chạy: node scripts/scan-questions.js
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'grade9', 'on-thi-tuyen-sinh', 'ON_TAP_LOP_9_chunks.json');
const OUT = path.join(__dirname, '..', 'data', 'grade9', 'on-thi-tuyen-sinh', '__scan_report.json');

const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const chunks = raw.chunks;

function countDollars(s) {
  if (!s) return 0;
  // Đếm $ không phải \$ (escape)
  let count = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '$' && (i === 0 || s[i - 1] !== '\\')) count++;
  }
  return count;
}

function hasUnbalancedBraces(s) {
  if (!s) return false;
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const prev = i > 0 ? s[i - 1] : '';
    if (prev === '\\') continue; // skip \{ \}
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth < 0) return true;
    }
  }
  return depth !== 0;
}

const issues = [];
const idSeen = new Map();
const duplicateIds = [];

for (const c of chunks) {
  const problems = [];

  // 1) Duplicate id
  if (idSeen.has(c.chunk_id)) {
    duplicateIds.push(c.chunk_id);
    problems.push('duplicate_chunk_id');
  } else {
    idSeen.set(c.chunk_id, c);
  }

  // 2) Prompt missing
  if (!c.prompt || !c.prompt.trim()) problems.push('empty_prompt');
  else if (c.prompt.trim().length < 5) problems.push('very_short_prompt');

  // 3) MC checks
  if (c.type === 'multiple_choice') {
    const opts = Array.isArray(c.options) ? c.options : [];
    if (opts.length === 0) problems.push('mc_no_options');
    else if (opts.length < 2) problems.push('mc_too_few_options');
    else if (opts.length !== 4) problems.push('mc_options_not_4');
    const emptyOpts = opts.filter(o => !o || !String(o).trim()).length;
    if (emptyOpts > 0) problems.push(`mc_${emptyOpts}_empty_option`);
    const ci = c.correct_index;
    if (ci === undefined || ci === null) problems.push('mc_missing_correct_index');
    else if (typeof ci !== 'number' || !Number.isInteger(ci)) problems.push('mc_correct_index_not_integer');
    else if (ci < 0 || ci >= opts.length) problems.push('mc_correct_index_out_of_range');
  }

  // 4) Essay checks
  if (c.type === 'essay') {
    const sp = Array.isArray(c.subparts) ? c.subparts : [];
    if (sp.length === 0) {
      // Essay without subparts may be intentional for single-part; flag as warn
      if (!c.prompt || c.prompt.length < 15) problems.push('essay_no_subparts_and_short_prompt');
    } else {
      const emptySP = sp.filter(s => !s.text || !String(s.text).trim()).length;
      if (emptySP > 0) problems.push(`essay_${emptySP}_empty_subpart`);
      const noLabel = sp.filter(s => !s.label).length;
      if (noLabel > 0) problems.push(`essay_${noLabel}_subpart_without_label`);
    }
    if (!c.detailed_explanation || c.detailed_explanation.trim().length < 10) {
      problems.push('essay_missing_or_short_explanation');
    }
  }

  // 5) LaTeX balance
  const textPool = [c.prompt || ''];
  if (Array.isArray(c.options)) c.options.forEach(o => textPool.push(o || ''));
  if (Array.isArray(c.subparts)) c.subparts.forEach(s => textPool.push((s && s.text) || ''));
  const fullText = textPool.join(' ');
  const dollars = countDollars(fullText);
  if (dollars % 2 !== 0) problems.push('latex_unbalanced_dollar');
  if (hasUnbalancedBraces(fullText)) problems.push('latex_unbalanced_braces');

  // 6) detailed_explanation missing (cả MC và essay)
  if (!c.detailed_explanation || !c.detailed_explanation.trim()) {
    if (!problems.includes('essay_missing_or_short_explanation'))
      problems.push('no_detailed_explanation');
  }

  if (problems.length > 0) {
    issues.push({
      chunk_id: c.chunk_id,
      type: c.type,
      section: c.section,
      index: c.index,
      problems,
      preview: (c.prompt || '').slice(0, 120)
    });
  }
}

// Aggregate
const byProblem = {};
issues.forEach(i => i.problems.forEach(p => { byProblem[p] = (byProblem[p] || 0) + 1; }));

const report = {
  total_chunks: chunks.length,
  total_flagged: issues.length,
  duplicate_ids: duplicateIds,
  issue_histogram: byProblem,
  issues
};

fs.writeFileSync(OUT, JSON.stringify(report, null, 2), 'utf8');
console.log('Tổng số câu:', chunks.length);
console.log('Số câu có dấu hiệu lỗi:', issues.length);
console.log('Phân loại lỗi:');
Object.entries(byProblem).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log('  ', k, '→', v));
console.log('Báo cáo đầy đủ đã ghi:', OUT);
