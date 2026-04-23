/**
 * Backend Server for Hoc Lieu Toan
 * Features: AI Tutor API, Leaderboard, User Data Sync
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fetch = require('node-fetch');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

dotenv.config();

// ============================================
// MIDDLEWARE
// ============================================
app.use(helmet());
app.use(cors({
  origin: true, // Allow all origins for easier local testing/development
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 AI requests per minute
  message: { error: 'AI rate limit exceeded. Please wait a moment.' }
});

// ============================================
// CONFIGURATION
// ============================================
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = 'llama-3.3-70b-versatile';

const PROJECT_ROOT = path.resolve(__dirname, '..');
const BANK_DIR = path.join(PROJECT_ROOT, 'BankOnTap');
const BANK_EXAM_PATH = path.join(BANK_DIR, 'exam.json');
const BANK_ANSWERS_PATH = path.join(BANK_DIR, 'answers.json');
const BANK_SECTIONS_DIR = path.join(BANK_DIR, 'sections');
const BANK_ERRORS_DIR = path.join(BANK_DIR, 'errors');

if (!GROQ_API_KEY) {
  console.warn('Missing GROQ_API_KEY. AI endpoints will not work until you set it in environment variables (e.g. in a local .env file).');
}

// In-memory storage (replace with database in production)
const leaderboardData = new Map();
const userStats = new Map();

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function readJsonSafe(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  if (!raw || !raw.trim()) {
    throw new Error(`File is empty: ${filePath}`);
  }
  return JSON.parse(raw);
}

function writeJsonPretty(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function detectMainSection(question) {
  const section = String(question.section || '');
  if (/Chương II\.\s*Bất phương trình/i.test(section)) {
    return {
      key: 'section-1-bat-phuong-trinh',
      title: 'Section 1 - Bất phương trình bậc hai',
      subtitle: 'Đại số 10 - Tam thức bậc hai - BPT'
    };
  }
  if (/Chương IV\.\s*Vectơ/i.test(section)) {
    return {
      key: 'section-2-vecto-toa-do',
      title: 'Section 2 - Vectơ và tọa độ',
      subtitle: 'Hình học 10 - Vectơ trong mặt phẳng tọa độ'
    };
  }
  if (/Chương III\.\s*Phương trình/i.test(section)) {
    return {
      key: 'section-3-phuong-trinh',
      title: 'Section 3 - Phương trình quy về bậc hai',
      subtitle: 'Đại số 10 - Chương III'
    };
  }
  return null;
}

function normalizeNumberString(s) {
  return Number(String(s).replace(',', '.'));
}

function parseTruthValue(v) {
  if (v === true || v === false) return v;
  const s = String(v ?? '').trim().toLowerCase();
  if (!s) return null;
  if (/^(đúng|dung|true|1)$/.test(s)) return true;
  if (/^(sai|false|0)$/.test(s)) return false;
  if (/đáp án\s*đúng\s*:\s*đúng/i.test(s)) return true;
  if (/đáp án\s*đúng\s*:\s*sai/i.test(s)) return false;
  return null;
}

function isBinaryTrueFalseOptions(options) {
  if (!Array.isArray(options)) return false;
  const normalized = options.map((o) => String(o ?? '').trim().toLowerCase()).filter(Boolean);
  return normalized.length === 2
    && normalized.some((o) => o === 'đúng' || o === 'dung')
    && normalized.some((o) => o === 'sai');
}

function tryExtractTruthValueFromCombinedAnswer(answerText, letter) {
  if (!answerText) return null;
  const re = new RegExp(`(?:^|\\n|\\r|[.;])\\s*${letter}\\)?\\s*[:\\-]?\\s*(đúng|sai)`, 'i');
  const m = String(answerText).match(re);
  return m ? parseTruthValue(m[1]) : null;
}

function extractCorrectIndexFromAnswerText(answerText, optionCount) {
  if (!answerText) return null;

  const letterMatch = answerText.match(/Đáp án\s*đúng\s*:\s*([A-D])/i);
  if (letterMatch) {
    const idx = letterMatch[1].toUpperCase().charCodeAt(0) - 65;
    if (idx >= 0 && idx < optionCount) return idx;
  }

  if (/Đáp án\s*đúng\s*:\s*Đúng/i.test(answerText)) return 0;
  if (/Đáp án\s*đúng\s*:\s*Sai/i.test(answerText)) return 1;
  if (/^Đúng\b/i.test(answerText.trim())) return 0;
  if (/^Sai\b/i.test(answerText.trim())) return 1;

  return null;
}

function extractFinalAnswerFromText(answerText) {
  if (!answerText) return null;

  const trimmed = answerText.trim();
  if (/^[+-]?\d+(?:[.,]\d+)?$/.test(trimmed)) {
    const n = normalizeNumberString(trimmed);
    return Number.isFinite(n) ? n : null;
  }

  const strongPatterns = [
    /Kết quả\s*:\s*([+-]?\d+(?:[.,]\d+)?)/i,
    /Đáp án\s*:\s*([+-]?\d+(?:[.,]\d+)?)/i,
    /Tính\s+[^.]*?\b=\s*([+-]?\d+(?:[.,]\d+)?)/i,
    /(?:Tổng|Tích|Hiệu|Thương)\s+là\s*([+-]?\d+(?:[.,]\d+)?)/i,
    /tìm\s+x\s*=\s*([+-]?\d+(?:[.,]\d+)?)/i,
    /\bx\s*=\s*\$?\s*([+-]?\d+(?:[.,]\d+)?)/i
  ];
  for (const r of strongPatterns) {
    const m = trimmed.match(r);
    if (m) {
      const n = normalizeNumberString(m[1]);
      if (Number.isFinite(n)) return n;
    }
  }

  const endingMatch = trimmed.match(/([+-]?\d+(?:[.,]\d+)?)(?=\s*(?:[a-zA-ZÀ-ỹ%]+)?\s*\.?\s*$)/);
  if (endingMatch) {
    const n = normalizeNumberString(endingMatch[1]);
    if (Number.isFinite(n)) return n;
  }

  return null;
}

function extractJxgSpecs(stem) {
  const specs = [];
  if (!stem) return specs;
  const re = /data-jxg=(['"])(.*?)\1/g;
  let m;
  while ((m = re.exec(stem)) !== null) {
    specs.push(m[2]);
  }
  return specs;
}

function isLikelyValidJxgSpec(spec) {
  if (!spec || !String(spec).trim()) return false;
  const s = String(spec).trim();
  if (s.startsWith('{') && s.endsWith('}')) return true;
  if (s.includes('=')) return true;
  return false;
}

function hasVisualCue(stem) {
  if (!stem) return false;
  return /(hình\s+bên|hình\s+sau|như\s+hình|hình\s+vẽ|đồ\s*thị|biểu\s*đồ)/i.test(String(stem));
}

function hasInlineFigure(stem) {
  if (!stem) return false;
  const s = String(stem);
  return /<img\b/i.test(s) || /<table\b/i.test(s) || /!\[[^\]]*\]\([^\)]+\)/i.test(s);
}

function extractImageRefs(stem) {
  const refs = [];
  if (!stem) return refs;
  const s = String(stem);

  const mdRe = /!\[[^\]]*\]\(([^\)]+)\)/g;
  let m;
  while ((m = mdRe.exec(s)) !== null) {
    if (m[1]) refs.push(m[1].trim());
  }

  const htmlRe = /<img[^>]*src=(['"])(.*?)\1/gi;
  while ((m = htmlRe.exec(s)) !== null) {
    if (m[2]) refs.push(m[2].trim());
  }

  return refs;
}

function canonicalTFOptionLabel(v) {
  const t = String(v ?? '').trim();
  if (/^đúng$/i.test(t) || /^dung$/i.test(t) || /^true$/i.test(t) || /^1$/.test(t)) return 'Đúng';
  if (/^sai$/i.test(t) || /^false$/i.test(t) || /^0$/.test(t)) return 'Sai';
  return t;
}

function buildIssueMarkdown(title, lines) {
  return `# ${title}\n\n${lines.join('\n')}\n`;
}

function prepareBankOnTapData() {
  ensureDir(BANK_SECTIONS_DIR);
  ensureDir(BANK_ERRORS_DIR);

  const exam = readJsonSafe(BANK_EXAM_PATH);
  const answers = readJsonSafe(BANK_ANSWERS_PATH);

  if (!Array.isArray(exam.questions)) {
    throw new Error('BankOnTap/exam.json không có mảng questions hợp lệ.');
  }

  const sectionBuckets = new Map();
  const unresolved = [];
  const invalidDiagrams = [];
  const missingDiagrams = [];
  const tfFormatIssues = [];
  const tfStats = {
    total: 0,
    binary: 0,
    statement: 0,
    convertedFromMultipleChoice: 0,
    convertedFromOptions: 0,
    missingStatements: 0,
    missingAnswers: 0
  };

  exam.questions.forEach((q, idx) => {
    const qid = String(q.q_id || `q_${idx + 1}`);
    const answerText = answers[qid];
    if (!Array.isArray(q.options)) q.options = [];
    const stemText = String(q.stem || '');
    const mainSection = detectMainSection(q);
    q.main_section = mainSection ? mainSection.key : null;

    if (!mainSection) {
      return;
    }

    if (!sectionBuckets.has(mainSection.key)) {
      sectionBuckets.set(mainSection.key, {
        key: mainSection.key,
        title: mainSection.title,
        subtitle: mainSection.subtitle,
        questions: []
      });
    }
    sectionBuckets.get(mainSection.key).questions.push(q);

    const specs = extractJxgSpecs(stemText);
    const visualCue = hasVisualCue(stemText);
    const hasFigure = hasInlineFigure(stemText);
    const imageRefs = extractImageRefs(stemText);

    imageRefs.forEach((imgRef) => {
      if (/^https?:\/\//i.test(imgRef) || /^data:/i.test(imgRef)) return;
      const cleanRef = imgRef.replace(/^\.\//, '').replace(/^\//, '');
      const absPath = path.resolve(BANK_DIR, cleanRef);
      if (!fs.existsSync(absPath)) {
        missingDiagrams.push({
          q_id: qid,
          issue: `Tham chiếu ảnh không tồn tại: ${imgRef}`,
          stemPreview: stemText.replace(/\s+/g, ' ').slice(0, 180)
        });
      }
    });

    if (visualCue && specs.length === 0 && !hasFigure) {
      missingDiagrams.push({
        q_id: qid,
        issue: 'Có mô tả cần hình/đồ thị nhưng chưa có data-jxg hoặc ảnh minh họa.',
        stemPreview: stemText.replace(/\s+/g, ' ').slice(0, 180)
      });
    }

    for (const spec of specs) {
      if (!isLikelyValidJxgSpec(spec)) {
        invalidDiagrams.push({
          q_id: qid,
          issue: 'data-jxg không đúng định dạng parser hiện tại (cần JSON hoặc key=value;...)',
          spec
        });
      }
    }

    const normalizedOptions = q.options.map((o) => String(o ?? '').trim()).filter(Boolean);
    if (q.type === 'multiple_choice' && isBinaryTrueFalseOptions(normalizedOptions)) {
      q.type = 'true_false';
      q.options = normalizedOptions.map(canonicalTFOptionLabel);
      q.tf_parts = [];
      tfStats.convertedFromMultipleChoice += 1;
      tfFormatIssues.push({
        q_id: qid,
        issue: 'multiple_choice có options Đúng/Sai; đã chuẩn hóa về type=true_false.'
      });
    }

    if (q.type === 'multiple_choice') {
      const hasIndex = Number.isInteger(q.correct_index);
      if (!hasIndex) {
        const optionCount = Array.isArray(q.options) ? q.options.length : 0;
        const detectedIndex = extractCorrectIndexFromAnswerText(String(answerText || ''), optionCount);
        if (Number.isInteger(detectedIndex)) {
          q.correct_index = detectedIndex;
        } else {
          unresolved.push({
            q_id: qid,
            type: q.type,
            reason: answerText ? 'Không suy ra được correct_index từ answers.json' : 'Thiếu lời giải tương ứng trong answers.json'
          });
        }
      }
      return;
    }

    if (q.type === 'true_false') {
      tfStats.total += 1;

      const originalHasTfParts = Array.isArray(q.tf_parts) && q.tf_parts.length > 0;
      if (isBinaryTrueFalseOptions(normalizedOptions)) {
        q.options = normalizedOptions.map(canonicalTFOptionLabel);
        q.tf_parts = [];
        tfStats.binary += 1;

        if (originalHasTfParts) {
          tfFormatIssues.push({
            q_id: qid,
            issue: 'true_false dạng nhị phân nhưng vẫn chứa tf_parts; đã chuẩn hóa về options Đúng/Sai.'
          });
        }

        const hasIndex = Number.isInteger(q.correct_index);
        if (!hasIndex) {
          const detectedIndex = extractCorrectIndexFromAnswerText(String(answerText || ''), normalizedOptions.length);
          if (Number.isInteger(detectedIndex)) {
            q.correct_index = detectedIndex;
          } else {
            unresolved.push({
              q_id: qid,
              type: q.type,
              reason: answerText ? 'Không suy ra được correct_index từ answers.json' : 'Thiếu lời giải tương ứng trong answers.json'
            });
          }
        }
        return;
      }

      if (!Array.isArray(q.tf_parts) || q.tf_parts.length === 0) {
        if (normalizedOptions.length > 0) {
          tfStats.convertedFromOptions += 1;
          tfFormatIssues.push({
            q_id: qid,
            issue: 'true_false nhiều mệnh đề lưu ở options; đã chuyển sang tf_parts chuẩn.'
          });
        }
        q.tf_parts = normalizedOptions.map((statement, partIdx) => ({
          key: String.fromCharCode(97 + partIdx),
          statement,
          answer: null
        }));
      } else {
        q.tf_parts = q.tf_parts
          .map((part, partIdx) => {
            if (typeof part === 'string') {
              return {
                key: String.fromCharCode(97 + partIdx),
                statement: part,
                answer: null
              };
            }
            return {
              key: part && part.key ? String(part.key) : String.fromCharCode(97 + partIdx),
              statement: part && part.statement ? String(part.statement) : '',
              answer: parseTruthValue(part ? part.answer : null)
            };
          })
          .filter((part) => part.statement);
      }

      q.options = [];
      q.correct_index = null;

      if (!q.tf_parts.length) {
        tfStats.missingStatements += 1;
        tfFormatIssues.push({
          q_id: qid,
          issue: 'true_false không có mệnh đề hợp lệ sau chuẩn hóa.'
        });
        unresolved.push({
          q_id: qid,
          type: q.type,
          reason: 'Không có mệnh đề Đ/S hợp lệ để chấm.'
        });
        return;
      }

      tfStats.statement += 1;

      let missingTfAnswer = false;
      q.tf_parts = q.tf_parts.map((part, partIdx) => {
        const letter = String.fromCharCode(97 + partIdx);
        let ans = parseTruthValue(part.answer);
        if (ans === null) {
          ans = parseTruthValue(answers[`${qid}_${letter}`]);
        }
        if (ans === null) {
          ans = tryExtractTruthValueFromCombinedAnswer(String(answerText || ''), letter);
        }
        if (ans === null) missingTfAnswer = true;
        return {
          ...part,
          key: part.key || letter,
          answer: ans
        };
      });

      if (missingTfAnswer) {
        tfStats.missingAnswers += 1;
        unresolved.push({
          q_id: qid,
          type: q.type,
          reason: answerText ? 'Chưa suy ra đủ đáp án Đ/S cho từng mệnh đề (a,b,c,...)' : 'Thiếu lời giải tương ứng trong answers.json'
        });
      }
      return;
    }

    if (q.type === 'short_answer') {
      q.correct_index = null;
      const current = q.final_answer;
      const normalizedCurrent = (current === null || current === undefined) ? '' : String(current).trim();
      const parsedCurrent = normalizedCurrent ? Number(normalizedCurrent.replace(',', '.')) : NaN;
      const hasFinal = Number.isFinite(parsedCurrent);
      if (!hasFinal) {
        const detected = extractFinalAnswerFromText(String(answerText || ''));
        if (Number.isFinite(detected)) {
          q.final_answer = detected;
        } else {
          unresolved.push({
            q_id: qid,
            type: q.type,
            reason: answerText ? 'Không trích xuất được final_answer số từ answers.json' : 'Thiếu lời giải tương ứng trong answers.json'
          });
        }
      }
    }
  });

  const totalQuestions = Array.from(sectionBuckets.values()).reduce((sum, bucket) => sum + bucket.questions.length, 0);
  const baseDuration = Number(exam.duration) || 1800;

  const sectionsManifest = {
    version: 1,
    title: 'Ngân hàng câu hỏi ôn tập (theo section)',
    progressStorageKey: 'bankOnTapProgressV1',
    generatedAt: new Date().toISOString(),
    totalQuestions,
    totalDuration: baseDuration,
    sections: []
  };

  for (const bucket of sectionBuckets.values()) {
    const ratio = totalQuestions > 0 ? bucket.questions.length / totalQuestions : 0;
    const sectionDuration = Math.max(300, Math.round(baseDuration * ratio));
    const fileName = `${bucket.key}.json`;
    const outPath = path.join(BANK_SECTIONS_DIR, fileName);
    writeJsonPretty(outPath, {
      duration: sectionDuration,
      section_key: bucket.key,
      section_title: bucket.title,
      section_subtitle: bucket.subtitle,
      questions: bucket.questions
    });

    sectionsManifest.sections.push({
      key: bucket.key,
      title: bucket.title,
      subtitle: bucket.subtitle,
      path: `sections/${fileName}`,
      questionCount: bucket.questions.length,
      duration: sectionDuration
    });
  }

  const activeSectionFileNames = new Set(sectionsManifest.sections.map((it) => path.basename(it.path)));
  for (const name of fs.readdirSync(BANK_SECTIONS_DIR)) {
    if (name === 'sections-manifest.json') continue;
    if (!/^section-.*\.json$/i.test(name)) continue;
    if (activeSectionFileNames.has(name)) continue;
    fs.unlinkSync(path.join(BANK_SECTIONS_DIR, name));
  }

  writeJsonPretty(path.join(BANK_SECTIONS_DIR, 'sections-manifest.json'), sectionsManifest);
  writeJsonPretty(BANK_EXAM_PATH, exam);

  const unresolvedMdLines = [
    `- Tổng số câu chưa điền được đáp án tự động: **${unresolved.length}**`,
    ''
  ];
  unresolved.forEach((it) => {
    unresolvedMdLines.push(`- [ ] \`${it.q_id}\` (${it.type}): ${it.reason}`);
  });
  fs.writeFileSync(
    path.join(BANK_ERRORS_DIR, 'unresolved-answers.md'),
    buildIssueMarkdown('Danh sách câu chưa fill đáp án', unresolvedMdLines),
    'utf8'
  );

  const diagramMdLines = [
    `- Tổng số câu có spec đồ thị nghi ngờ lỗi: **${invalidDiagrams.length}**`,
    ''
  ];
  invalidDiagrams.forEach((it) => {
    diagramMdLines.push(`- [ ] \`${it.q_id}\`: ${it.issue}`);
    diagramMdLines.push(`  - Spec hiện tại: \`${it.spec}\``);
  });
  fs.writeFileSync(
    path.join(BANK_ERRORS_DIR, 'invalid-diagrams.md'),
    buildIssueMarkdown('Danh sách câu có data-jxg nghi ngờ lỗi', diagramMdLines),
    'utf8'
  );

  const missingDiagramMdLines = [
    `- Tổng số câu cần hình/đồ thị nhưng chưa có dữ liệu vẽ: **${missingDiagrams.length}**`,
    ''
  ];
  missingDiagrams.forEach((it) => {
    missingDiagramMdLines.push(`- [ ] \`${it.q_id}\`: ${it.issue}`);
    missingDiagramMdLines.push(`  - Preview: ${it.stemPreview}`);
  });
  fs.writeFileSync(
    path.join(BANK_ERRORS_DIR, 'missing-diagrams.md'),
    buildIssueMarkdown('Danh sách câu thiếu hình vẽ/đồ thị', missingDiagramMdLines),
    'utf8'
  );

  const tfFormatMdLines = [
    `- Tổng số câu true_false: **${tfStats.total}**`,
    `- Dạng nhị phân (Đúng/Sai): **${tfStats.binary}**`,
    `- Dạng nhiều mệnh đề (tf_parts): **${tfStats.statement}**`,
    `- Đã chuẩn hóa multiple_choice Đ/S -> true_false: **${tfStats.convertedFromMultipleChoice}**`,
    `- Đã chuyển từ options -> tf_parts: **${tfStats.convertedFromOptions}**`,
    `- Thiếu mệnh đề hợp lệ: **${tfStats.missingStatements}**`,
    `- Thiếu đáp án Đ/S cho từng mệnh đề: **${tfStats.missingAnswers}**`,
    `- Tổng cảnh báo format true_false: **${tfFormatIssues.length}**`,
    ''
  ];
  tfFormatIssues.forEach((it) => {
    tfFormatMdLines.push(`- [ ] \`${it.q_id}\`: ${it.issue}`);
  });
  fs.writeFileSync(
    path.join(BANK_ERRORS_DIR, 'true-false-format.md'),
    buildIssueMarkdown('Báo cáo chuẩn hóa true_false', tfFormatMdLines),
    'utf8'
  );

  return {
    totalQuestions,
    sections: sectionsManifest.sections,
    unresolvedCount: unresolved.length,
    invalidDiagramCount: invalidDiagrams.length,
    missingDiagramCount: missingDiagrams.length,
    trueFalseFormatIssueCount: tfFormatIssues.length,
    unresolved,
    invalidDiagrams,
    missingDiagrams,
    tfStats,
    tfFormatIssues
  };
}

// ============================================
// AI TUTOR ENDPOINT
// ============================================
const SYSTEM_PROMPT = `Bạn là một gia sư Toán học thông minh và thân thiện, chuyên hỗ trợ học sinh Việt Nam từ lớp 9 đến lớp 12. 

Nhiệm vụ của bạn:
1. Giải thích các bài toán một cách chi tiết, dễ hiểu
2. Hướng dẫn từng bước cách giải
3. Chỉ ra các lỗi sai thường gặp
4. Đưa ra mẹo và phương pháp ghi nhớ
5. Khuyến khích và động viên học sinh

Quy tắc:
- Sử dụng tiếng Việt
- Giải thích rõ ràng, có cấu trúc
- Sử dụng ký hiệu toán học khi cần (có thể dùng LaTeX với $..$ cho inline và $$...$$ cho block)
- Đưa ra ví dụ minh họa khi phù hợp
- Luôn kiểm tra lại đáp án
- Trả lời ngắn gọn nhưng đầy đủ`;

app.post('/api/ai/chat', aiLimiter, async (req, res) => {
  try {
    if (!GROQ_API_KEY) {
      return res.status(500).json({ error: 'AI service is not configured on server (missing GROQ_API_KEY).' });
    }

    const { messages, context } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }

    // Build conversation with system prompt
    const conversation = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.slice(-10) // Keep last 10 messages for context
    ];

    // Add context if provided (e.g., current question being discussed)
    if (context) {
      conversation[0].content += `\n\nContext hiện tại:\n${context}`;
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: conversation,
        temperature: 0.7,
        max_tokens: 2048,
        stream: false
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Groq API Error:', error);
      return res.status(response.status).json({ error: 'AI service error' });
    }

    const data = await response.json();
    res.json({
      message: data.choices[0].message.content,
      usage: data.usage
    });

  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Streaming endpoint for real-time responses
app.post('/api/ai/chat/stream', aiLimiter, async (req, res) => {
  try {
    if (!GROQ_API_KEY) {
      res.write(`data: ${JSON.stringify({ error: 'AI service is not configured on server (missing GROQ_API_KEY).' })}\n\n`);
      res.end();
      return;
    }

    const { messages, context } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }

    const conversation = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.slice(-10)
    ];

    if (context) {
      conversation[0].content += `\n\nContext hiện tại:\n${context}`;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: conversation,
        temperature: 0.7,
        max_tokens: 2048,
        stream: true
      })
    });

    if (!response.ok) {
      res.write(`data: ${JSON.stringify({ error: 'AI service error' })}\n\n`);
      res.end();
      return;
    }

    // Stream the response
    response.body.on('data', (chunk) => {
      const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            res.write('data: [DONE]\n\n');
          } else {
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              if (content) {
                res.write(`data: ${JSON.stringify({ content })}\n\n`);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    });

    response.body.on('end', () => {
      res.end();
    });

  } catch (error) {
    console.error('AI Stream Error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Internal server error' })}\n\n`);
    res.end();
  }
});

// ============================================
// LEADERBOARD ENDPOINTS
// ============================================
app.get('/api/leaderboard', apiLimiter, (req, res) => {
  const { grade, period = 'weekly' } = req.query;
  
  // Get leaderboard data
  let entries = Array.from(leaderboardData.values());
  
  // Filter by grade if specified
  if (grade) {
    entries = entries.filter(e => e.grade === grade);
  }
  
  // Filter by period
  const now = Date.now();
  const periodMs = {
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000,
    alltime: Infinity
  };
  
  const cutoff = now - (periodMs[period] || periodMs.weekly);
  entries = entries.filter(e => new Date(e.lastActivity).getTime() > cutoff);
  
  // Sort by score
  entries.sort((a, b) => b.totalScore - a.totalScore);
  
  // Return top 100
  res.json({
    period,
    grade: grade || 'all',
    entries: entries.slice(0, 100).map((e, i) => ({
      rank: i + 1,
      userId: e.userId,
      displayName: e.displayName,
      avatar: e.avatar,
      totalScore: e.totalScore,
      examsCompleted: e.examsCompleted,
      streak: e.streak
    }))
  });
});

app.post('/api/leaderboard/update', apiLimiter, (req, res) => {
  const { userId, displayName, avatar, grade, score, examsCompleted, streak } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  
  const existing = leaderboardData.get(userId) || {
    userId,
    displayName: displayName || 'Anonymous',
    avatar: avatar || null,
    grade: grade || 'unknown',
    totalScore: 0,
    examsCompleted: 0,
    streak: 0,
    lastActivity: new Date().toISOString()
  };
  
  // Update stats
  if (score !== undefined) existing.totalScore += score;
  if (examsCompleted !== undefined) existing.examsCompleted += examsCompleted;
  if (streak !== undefined) existing.streak = Math.max(existing.streak, streak);
  if (displayName) existing.displayName = displayName;
  if (avatar) existing.avatar = avatar;
  if (grade) existing.grade = grade;
  existing.lastActivity = new Date().toISOString();
  
  leaderboardData.set(userId, existing);
  
  res.json({ success: true, data: existing });
});

// ============================================
// USER STATS SYNC ENDPOINTS
// ============================================
app.get('/api/user/:userId/stats', apiLimiter, (req, res) => {
  const { userId } = req.params;
  const stats = userStats.get(userId);
  
  if (!stats) {
    return res.status(404).json({ error: 'User stats not found' });
  }
  
  res.json(stats);
});

app.post('/api/user/:userId/stats', apiLimiter, (req, res) => {
  const { userId } = req.params;
  const { statistics, bookmarks, achievements, goals } = req.body;
  
  const existing = userStats.get(userId) || {};
  
  const updated = {
    ...existing,
    userId,
    statistics: statistics || existing.statistics,
    bookmarks: bookmarks || existing.bookmarks,
    achievements: achievements || existing.achievements,
    goals: goals || existing.goals,
    lastSync: new Date().toISOString()
  };
  
  userStats.set(userId, updated);
  
  res.json({ success: true, lastSync: updated.lastSync });
});

// ============================================
// REPORT ENDPOINT
// ============================================
const reports = [];

app.post('/api/report', apiLimiter, (req, res) => {
  const { questionId, examPath, reason, details, userId } = req.body;
  
  const report = {
    id: `report_${Date.now()}`,
    questionId,
    examPath,
    reason,
    details,
    userId,
    createdAt: new Date().toISOString(),
    status: 'pending'
  };
  
  reports.push(report);
  console.log('New report:', report);
  
  res.json({ success: true, reportId: report.id });
});

// ============================================
// BANKONTAP AUTHORING ENDPOINTS
// ============================================
app.post('/api/bankontap/prepare', apiLimiter, (req, res) => {
  try {
    const result = prepareBankOnTapData();
    res.json({ success: true, result });
  } catch (error) {
    console.error('BankOnTap prepare error:', error);
    res.status(500).json({ success: false, error: error.message || 'Prepare failed' });
  }
});

app.get('/api/bankontap/md-files', apiLimiter, (req, res) => {
  try {
    ensureDir(BANK_ERRORS_DIR);
    const files = fs.readdirSync(BANK_ERRORS_DIR)
      .filter((name) => name.toLowerCase().endsWith('.md'))
      .sort();
    res.json({ success: true, files });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || 'Cannot list md files' });
  }
});

app.get('/api/bankontap/md-file', apiLimiter, (req, res) => {
  try {
    const name = String(req.query.name || '');
    if (!name || name.includes('/') || name.includes('\\') || !name.toLowerCase().endsWith('.md')) {
      return res.status(400).json({ success: false, error: 'Tên file không hợp lệ.' });
    }
    const target = path.join(BANK_ERRORS_DIR, name);
    if (!fs.existsSync(target)) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy file.' });
    }
    const content = fs.readFileSync(target, 'utf8');
    res.json({ success: true, name, content });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || 'Cannot read md file' });
  }
});

app.post('/api/bankontap/md-file', apiLimiter, (req, res) => {
  try {
    const name = String(req.body.name || '');
    const content = String(req.body.content || '');
    if (!name || name.includes('/') || name.includes('\\') || !name.toLowerCase().endsWith('.md')) {
      return res.status(400).json({ success: false, error: 'Tên file không hợp lệ.' });
    }
    ensureDir(BANK_ERRORS_DIR);
    const target = path.join(BANK_ERRORS_DIR, name);
    fs.writeFileSync(target, content, 'utf8');
    res.json({ success: true, name });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || 'Cannot save md file' });
  }
});

// ============================================
// ON THI TUYEN SINH G9 — QUESTION EDITOR
// ============================================
const G9_CHUNKS_PATH = path.join(PROJECT_ROOT, 'data', 'grade9', 'on-thi-tuyen-sinh', 'ON_TAP_LOP_9_chunks.json');
const G9_SCAN_PATH = path.join(PROJECT_ROOT, 'data', 'grade9', 'on-thi-tuyen-sinh', '__scan_report.json');

function readG9() {
  const raw = JSON.parse(fs.readFileSync(G9_CHUNKS_PATH, 'utf8'));
  return raw;
}

function writeG9WithBackup(data) {
  // Snapshot backup (rotating: keep max 10 most recent)
  const dir = path.dirname(G9_CHUNKS_PATH);
  const stamp = Date.now();
  const bak = path.join(dir, `ON_TAP_LOP_9_chunks.json.bak-${stamp}`);
  try { fs.copyFileSync(G9_CHUNKS_PATH, bak); } catch (_) {}
  // Cleanup old backups (keep latest 10)
  try {
    const baks = fs.readdirSync(dir)
      .filter(n => n.startsWith('ON_TAP_LOP_9_chunks.json.bak-'))
      .map(n => ({ n, t: parseInt(n.split('bak-')[1], 10) || 0 }))
      .sort((a, b) => b.t - a.t);
    baks.slice(10).forEach(b => { try { fs.unlinkSync(path.join(dir, b.n)); } catch (_) {} });
  } catch (_) {}
  fs.writeFileSync(G9_CHUNKS_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// GET all questions (lightweight list + optional flagged-only)
app.get('/api/g9/questions', (req, res) => {
  try {
    const data = readG9();
    const flaggedOnly = String(req.query.flagged || '') === '1';
    let scan = null;
    if (fs.existsSync(G9_SCAN_PATH)) {
      try { scan = JSON.parse(fs.readFileSync(G9_SCAN_PATH, 'utf8')); } catch (_) {}
    }
    const issueMap = new Map();
    if (scan && Array.isArray(scan.issues)) scan.issues.forEach(i => issueMap.set(i.chunk_id, i.problems));
    const list = data.chunks.map(c => ({
      chunk_id: c.chunk_id,
      type: c.type,
      section: c.section,
      subsection: c.subsection,
      index: c.index,
      prompt_preview: (c.prompt || '').slice(0, 120),
      problems: issueMap.get(c.chunk_id) || []
    }));
    const filtered = flaggedOnly ? list.filter(q => q.problems.length > 0) : list;
    res.json({
      total: data.chunks.length,
      flagged_total: list.filter(q => q.problems.length > 0).length,
      scan_histogram: (scan && scan.issue_histogram) || {},
      questions: filtered
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET a single question
app.get('/api/g9/question/:id', (req, res) => {
  try {
    const data = readG9();
    const q = data.chunks.find(c => c.chunk_id === req.params.id);
    if (!q) return res.status(404).json({ error: 'not_found' });
    res.json({ question: q });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST update question (full replace of one chunk by id)
app.post('/api/g9/question/:id', (req, res) => {
  try {
    const id = req.params.id;
    const patch = req.body && req.body.question;
    if (!patch || typeof patch !== 'object') return res.status(400).json({ error: 'missing_question_in_body' });
    const data = readG9();
    const idx = data.chunks.findIndex(c => c.chunk_id === id);
    if (idx < 0) return res.status(404).json({ error: 'not_found' });
    // Preserve chunk_id and type (for data integrity)
    const original = data.chunks[idx];
    const merged = { ...original, ...patch, chunk_id: original.chunk_id };
    // Basic validation
    if (merged.type === 'multiple_choice') {
      if (!Array.isArray(merged.options)) merged.options = [];
      if (merged.correct_index !== null && merged.correct_index !== undefined) {
        merged.correct_index = Number(merged.correct_index);
      }
    }
    if (merged.type === 'essay' && !Array.isArray(merged.subparts)) {
      merged.subparts = [];
    }
    data.chunks[idx] = merged;
    writeG9WithBackup(data);
    res.json({ success: true, question: merged });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST re-run scan on current chunks file
app.post('/api/g9/scan', (req, res) => {
  try {
    const { spawnSync } = require('child_process');
    const script = path.join(PROJECT_ROOT, 'scripts', 'scan-questions.js');
    const r = spawnSync(process.execPath, [script], { encoding: 'utf8' });
    if (r.status !== 0) return res.status(500).json({ error: r.stderr || 'scan_failed' });
    const report = JSON.parse(fs.readFileSync(G9_SCAN_PATH, 'utf8'));
    res.json({ success: true, report: { total_chunks: report.total_chunks, total_flagged: report.total_flagged, issue_histogram: report.issue_histogram } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Serve editor HTML and a friendly index
app.get(['/editor', '/on-thi-tuyen-sinh-g9-editor', '/on-thi-tuyen-sinh-g9-editor.html'], (req, res) => {
  res.sendFile(path.join(PROJECT_ROOT, 'on-thi-tuyen-sinh-g9-editor.html'));
});
app.get('/', (req, res) => {
  res.send('<h3>Hoc Lieu Toan backend</h3><ul><li><a href="/editor">G9 Question Editor</a></li><li><a href="/api/health">Health</a></li></ul>');
});

// ============================================
// HEALTH CHECK
// ============================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ============================================
// ERROR HANDLING
// ============================================
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📚 API endpoints:`);
  console.log(`   POST /api/ai/chat - AI Tutor chat`);
  console.log(`   POST /api/ai/chat/stream - AI Tutor streaming`);
  console.log(`   GET  /api/leaderboard - Get leaderboard`);
  console.log(`   POST /api/leaderboard/update - Update leaderboard`);
  console.log(`   GET  /api/user/:id/stats - Get user stats`);
  console.log(`   POST /api/user/:id/stats - Sync user stats`);
  console.log(`   POST /api/report - Report question`);
});

module.exports = app;
