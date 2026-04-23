const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const texPath = path.join(repoRoot, 'data', 'grade9', 'on-thi-tuyen-sinh', 'ON_TAP_LOP_9_FINAL_PRO.tex');
const manifestPath = path.join(repoRoot, 'data', 'grade9', 'on-thi-tuyen-sinh', 'sections-manifest.json');
const outDir = path.join(repoRoot, 'data', 'grade9', 'on-thi-tuyen-sinh', 'theory');

function normalizeWhitespace(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, '  ')
    .replace(/[ \u00A0]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripPageMarkers(text) {
  return text.replace(/^%\s*Page\s+\d+.*$/gm, '').replace(/^%.*$/gm, '');
}

function convertListBlocks(text) {
  return text
    .replace(/\\begin\{itemize\}/g, '')
    .replace(/\\end\{itemize\}/g, '')
    .replace(/\\begin\{enumerate\}/g, '')
    .replace(/\\end\{enumerate\}/g, '')
    .replace(/^\s*\\item\s+/gm, '- ');
}

function convertHeadings(text) {
  return text
    .replace(/\\subsubsection\{([^}]*)\}/g, '\n## $1\n')
    .replace(/\\paragraph\{([^}]*)\}/g, '\n### $1\n');
}

function convertBareHeadings(text) {
  return text
    .replace(/^\s*Đạng\s+/gm, 'Dạng ')
    .replace(/^\s*(Dạng\s+\d+\*?\.?\s+.+)$/gm, '\n## $1\n');
}

function inferMissingHeadings(text) {
  return text.replace(
    /\nBước 1: Từ một phương trình của hệ, biểu diễn một ẩn theo ẩn kia rồi thế vào phương trình còn lại của hệ để được phương trình chỉ còn chứa một ẩn\./,
    '\n## Dạng 4. Giải hệ phương trình bằng phương pháp thế\n\nBước 1: Từ một phương trình của hệ, biểu diễn một ẩn theo ẩn kia rồi thế vào phương trình còn lại của hệ để được phương trình chỉ còn chứa một ẩn.'
  );
}

function cleanupLatexContainers(text) {
  return text
    .replace(/\\begin\{align\*\}/g, '')
    .replace(/\\end\{align\*\}/g, '')
    .replace(/\\begin\{center\}/g, '')
    .replace(/\\end\{center\}/g, '')
    .replace(/\\hspace\{[^}]*\}/g, ' ')
    .replace(/\\medskip/g, '\n')
    .replace(/\\smallskip/g, '\n')
    .replace(/\\bigskip/g, '\n');
}

function convertDashBullets(text) {
  return text
    .replace(/\s+--\s+/g, '\n- ')
    .replace(/^\*Phương pháp giải:/gm, '**Phương pháp giải:**')
    .replace(/^Giải:/gm, '**Ví dụ giải:**')
    .replace(/^Ví dụ\s+/gm, '### Ví dụ ')
    .replace(/(?:^|\s)Bước\s+(\d+)[\.:]/gm, '\n- **Bước $1:**');
}

function normalizeCategoryHeadings(text) {
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    const match = trimmed.match(/^\-\s+([^:]+)$/);
    if (!match || /\*\*/.test(trimmed)) continue;

    let j = i + 1;
    while (j < lines.length && !lines[j].trim()) j++;
    if (j < lines.length && lines[j].trim().startsWith('## Dạng')) {
      lines[i] = `## ${match[1].trim()}`;
    }
  }

  return lines.join('\n');
}

function mergeAdjacentInlineMath(text) {
  let out = text;
  let prev;
  do {
    prev = out;
    out = out.replace(/\$([^$\n]+)\$\s+\$([^$\n]+)\$/g, (_, a, b) => `$${a} ${b}$`);
  } while (out !== prev);
  return out;
}

function normalizeMathSpacing(text) {
  return text
    .replace(/\s+\\forall/g, ' \\forall')
    .replace(/\s+\\in/g, ' \\in');
}

function restoreInlineMathSpacing(text) {
  return text
    .replace(/([\p{L}\p{N}\)])\$/gu, '$1 $')
    .replace(/\$([\p{L}\p{N}\(])/gu, '$ $1')
    .replace(/[ \t]{2,}/g, ' ');
}

function convertEquationLineGroups(text) {
  const lines = text.split('\n');
  const out = [];

  function isEquationLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (trimmed.startsWith('## ') || trimmed.startsWith('### ') || trimmed.startsWith('- ') || trimmed.startsWith('> ')) return false;
    if (trimmed === '\\[' || trimmed === '\\]') return false;
    if (/^(Vậy|Do đó|Suy ra|Ta có|Nếu|Khi|Gọi|Áp dụng|Trong|Vì|Mặt khác|Hay)\b/.test(trimmed)) return false;
    if (/^[a-z]\)/.test(trimmed)) return false;
    if (/\*\*/.test(trimmed)) return false;
    return /\\\\\s*$/.test(trimmed) || (/^(?:[$\\\-\(a-zA-Z0-9])/u.test(trimmed) && /(?:\\geq|\\leq|\\Rightarrow|\\Leftrightarrow|=|<|>)/.test(trimmed));
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!isEquationLine(line)) {
      out.push(line);
      continue;
    }

    const group = [line.trim()];
    let j = i + 1;
    while (j < lines.length && isEquationLine(lines[j])) {
      group.push(lines[j].trim());
      j++;
    }

    if (group.length >= 2 || /\\\\\s*$/.test(group[0])) {
      out.push('\\[');
      out.push(...group);
      out.push('\\]');
    } else {
      out.push(...group);
    }
    i = j - 1;
  }

  return out.join('\n');
}

function insertStructuralBreaks(text) {
  return text
    .replace(/\s+(##\s+Dạng)/g, '\n$1')
    .replace(/\s+(###\s+Ví dụ)/g, '\n$1')
    .replace(/\s+(\*\*Ví dụ giải:\*\*)/g, '\n$1')
    .replace(/\s+(\*\*Phương pháp giải:\*\*)/g, '\n$1')
    .replace(/\$\s*\\bullet\s*\$/g, '\n- ')
    .replace(/(^|\n)-\s+([^\n:]{1,80})\n(?=##\s+Dạng)/g, '$1## $2\n');
}

function splitExampleContent(text) {
  return text
    .replace(/(###\s+Ví dụ\s+\d+\.)\s+(?=\S)/g, '$1\n')
    .replace(/([:?.!;])\s+([a-z]\))/g, '$1\n$2')
    .replace(/(\$[^$\n]*?[.;]\$)\s+([a-z]\))/g, '$1\n$2')
    .replace(/(^|\n)([a-z]\))\s+(?=\S)/g, '$1$2\n');
}

function cleanupDisplayMathArtifacts(text) {
  return text
    .replace(/\\\[\s*\\\[/g, '\\[')
    .replace(/\\\]\s*\\\]/g, '\\]')
    .replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, (_, inner) => {
      const cleaned = inner.trim();
      return `\\[\n${cleaned}\n\\]`;
    });
}

function promoteLooseCategoryLines(text) {
  return text.replace(/^\-\s+(.+)$/gm, (full, label, offset, source) => {
    const before = source.slice(0, offset);
    const after = source.slice(offset + full.length);
    const prevHeading = /##\s+Các dạng toán trọng tâm\s*$/.test(before.trimEnd().split('\n').slice(-1)[0] || '');
    const nextHeading = /^\n##\s+Dạng/m.test(after);
    return prevHeading && nextHeading ? `## ${label.trim()}` : full;
  });
}

function balanceDisplayMathBlocks(text) {
  const lines = text.split('\n');
  const out = [];
  let open = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '\\[') {
      if (!open) {
        out.push('\\[');
        open = true;
      }
      continue;
    }
    if (trimmed === '\\]') {
      if (open) {
        out.push('\\]');
        open = false;
      }
      continue;
    }
    out.push(line);
  }

  if (open) out.push('\\]');
  return out.join('\n');
}

function finalizeLooseCategoryHeadings(text) {
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].trim().match(/^\-\s+([^:]+)$/);
    if (!match) continue;

    let j = i + 1;
    while (j < lines.length && !lines[j].trim()) j++;
    if (j < lines.length && /^##\s+Dạng\b/.test(lines[j].trim())) {
      lines[i] = `## ${match[1].trim()}`;
    }
  }

  return lines.join('\n');
}

function compressLines(text) {
  const lines = text.split('\n').map(line => line.trimRight());
  const out = [];
  for (const line of lines) {
    const cleaned = line.replace(/[ \t]{2,}/g, ' ').trimEnd();
    if (!cleaned && out[out.length - 1] === '') continue;
    out.push(cleaned);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function latexToMarkdown(text) {
  let out = text;
  out = stripPageMarkers(out);
  out = inferMissingHeadings(out);
  out = convertHeadings(out);
  out = convertBareHeadings(out);
  out = convertListBlocks(out);
  out = cleanupLatexContainers(out);
  out = convertDashBullets(out);
  out = normalizeCategoryHeadings(out);
  out = mergeAdjacentInlineMath(out);
  out = normalizeMathSpacing(out);
  out = restoreInlineMathSpacing(out);
  out = convertEquationLineGroups(out);
  out = insertStructuralBreaks(out);
  out = splitExampleContent(out);
  out = cleanupDisplayMathArtifacts(out);
  out = promoteLooseCategoryLines(out);
  out = balanceDisplayMathBlocks(out);
  out = out.replace(/##\s+Các dạng toán trọng tâm\s*##/g, '## Các dạng toán trọng tâm\n\n##');
  out = out.replace(/(\*\*Phương pháp giải:\*\*)\s*/g, '$1\n');
  out = out.replace(/(\*\*Ví dụ giải:\*\*)\s*/g, '$1\n');
  out = out.replace(/(###\s+Ví dụ[^\n]*)\s*/g, '$1\n');
  out = out.replace(/\n{2,}\\\[/g, '\n\\[');
  out = out.replace(/\\\]\n{2,}/g, '\\]\n');
  out = out.replace(/(^|\n)-\s+([^\n:]+)\n(?=##\s+Dạng)/g, '$1## $2\n');
  out = out.replace(/^\s+/gm, '');
  out = finalizeLooseCategoryHeadings(out);
  out = normalizeWhitespace(out);
  out = compressLines(out);
  return out;
}

function extractTheorySection(sectionBlock) {
  const startMarker = /\\subsection\{I\. CÁC DẠNG TOÁN (?:TRỌNG TÂM|TRONG TÂM)\}/;
  const endMarker = /\\subsection\{II\. BÀI TẬP TỰ LUYỆN\}/;
  const start = sectionBlock.search(startMarker);
  if (start === -1) return '';
  const sliced = sectionBlock.slice(start);
  const end = sliced.search(endMarker);
  return end === -1 ? sliced : sliced.slice(0, end);
}

function parseSections(tex) {
  const matches = [...tex.matchAll(/\\section\{([^}]*)\}/g)];
  return matches.map((m, idx) => {
    const title = m[1].trim();
    const start = m.index + m[0].length;
    const end = idx + 1 < matches.length ? matches[idx + 1].index : tex.length;
    const content = tex.slice(start, end);
    return { title, content };
  });
}

function main() {
  const tex = fs.readFileSync(texPath, 'utf8');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const sections = parseSections(tex);
  fs.mkdirSync(outDir, { recursive: true });

  let written = 0;
  for (const topic of manifest.topics) {
    const source = sections.find(s => s.title === topic.section);
    if (!source) {
      console.log(`[skip] Không tìm thấy section cho ${topic.id}`);
      continue;
    }
    const theoryRaw = extractTheorySection(source.content);
    if (!theoryRaw.trim()) {
      console.log(`[skip] Không tìm thấy phần lý thuyết cho ${topic.id}`);
      continue;
    }

    const md = [
      `# ${topic.title}`,
      '',
      `> ${topic.label}`,
      '',
      latexToMarkdown(theoryRaw)
        .replace(/^\\subsection\{I\. CÁC DẠNG TOÁN (?:TRỌNG TÂM|TRONG TÂM)\}$/m, '## Các dạng toán trọng tâm')
        .replace(/^I\. CÁC DẠNG TOÁN (?:TRỌNG TÂM|TRONG TÂM)$/m, '## Các dạng toán trọng tâm')
    ].join('\n').replace(/\n{3,}/g, '\n\n');

    const outPath = path.join(outDir, `${topic.id}.md`);
    fs.writeFileSync(outPath, md, 'utf8');
    written++;
    console.log(`[ok] ${topic.id} -> ${path.relative(repoRoot, outPath)}`);
  }

  console.log(`Hoàn tất. Đã ghi ${written} file lý thuyết.`);
}

main();
