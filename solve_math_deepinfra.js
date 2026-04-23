const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Tự động nạp biến môi trường từ các file .env thường gặp (không cần package).
// Chỉ set nếu biến chưa có trong process.env → biến ở terminal vẫn ưu tiên.
(function loadDotenv() {
    const candidates = [
        process.env.DEEPINFRA_ENV_FILE,
        './.env',
        './server/.env',
    ].filter(Boolean);
    for (const file of candidates) {
        try {
            if (!fs.existsSync(file)) continue;
            const text = fs.readFileSync(file, 'utf-8');
            for (const rawLine of text.split(/\r?\n/)) {
                const line = rawLine.trim();
                if (!line || line.startsWith('#')) continue;
                const eq = line.indexOf('=');
                if (eq < 0) continue;
                const key = line.slice(0, eq).trim();
                let val = line.slice(eq + 1).trim();
                if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                    val = val.slice(1, -1);
                }
                if (!(key in process.env)) process.env[key] = val;
            }
        } catch (_) { /* silent */ }
    }
})();

// Cấu hình
const API_TOKEN = process.env.DEEPINFRA_API_TOKEN || process.env.DEEPINFRA_API_KEY || '';
const MODEL = process.env.DEEPINFRA_MODEL || 'deepseek-ai/DeepSeek-V3.2';
const INPUT_FILE = process.env.DEEPINFRA_INPUT_FILE || './data/grade9/on-thi-tuyen-sinh/ON_TAP_LOP_9_chunks.json';
const OUTPUT_FILE = process.env.DEEPINFRA_OUTPUT_FILE || './data/grade9/on-thi-tuyen-sinh/answers_progress.json';
const EXTERNAL_ANSWERS_FILE = process.env.DEEPINFRA_ANSWERS_FILE || './data/grade9/on-thi-tuyen-sinh/answers.json';
const MAX_RETRIES = Number.parseInt(process.env.DEEPINFRA_MAX_RETRIES || '3', 10);
const MAX_AUDIT_RETRIES = Number.parseInt(process.env.DEEPINFRA_MAX_AUDIT_RETRIES || '2', 10);
const REQUEST_DELAY_MS = Number.parseInt(process.env.DEEPINFRA_REQUEST_DELAY_MS || '1500', 10);
// Số request chạy song song. Mặc định 1 (tuần tự). Đặt 5-8 để nhanh hơn rất nhiều.
const CONCURRENCY = Math.max(1, Number.parseInt(process.env.DEEPINFRA_CONCURRENCY || '1', 10));
// Bumped 3500 → 6000 vì essay 6-8 subparts hay bị cắt ở mức 3500.
const MAX_TOKENS = Number.parseInt(process.env.DEEPINFRA_MAX_TOKENS || '6000', 10);
// Tắt cross-check với answers.json để giảm retry vô ích khi file đó không đáng tin.
const DISABLE_ANSWERS_CROSSCHECK = process.env.DEEPINFRA_DISABLE_ANSWERS_CROSSCHECK === '1';
const DEBUG_MODE = process.env.DEEPINFRA_DEBUG === '1';
const FORCE_REFRESH = process.env.DEEPINFRA_FORCE_REFRESH === '1';
const FORCE_REFRESH_IDS = new Set(String(process.env.DEEPINFRA_FORCE_IDS || '').split(',').map(item => item.trim()).filter(Boolean));
const REUSE_SUSPECTED_CACHE = process.env.DEEPINFRA_REUSE_SUSPECTED_CACHE === '1';
// Giới hạn số câu xử lý trong một lượt chạy (0 hoặc không đặt => không giới hạn).
const LIMIT = Number.parseInt(process.env.DEEPINFRA_LIMIT || '0', 10) || 0;
const ONLY_IDS = new Set(String(process.env.DEEPINFRA_ONLY_IDS || '').split(',').map(item => item.trim()).filter(Boolean));
const ONLY_TYPES = new Set(String(process.env.DEEPINFRA_ONLY_TYPES || '').split(',').map(item => item.trim()).filter(Boolean));
const ONLY_SECTIONS_RAW = String(process.env.DEEPINFRA_ONLY_SECTIONS || '').split(',').map(item => item.trim()).filter(Boolean);
const CACHE_VERSION = '3';
const PROMPT_VERSION = '2026-04-17-v3';
const fetchFn = globalThis.fetch;

// Tập từ khóa hay gặp của LaTeX — loại khỏi audit để tránh false positive
const LATEX_TOKEN_STOP = new Set([
    'begin', 'end', 'cases', 'align', 'aligned', 'array', 'matrix', 'pmatrix',
    'frac', 'dfrac', 'tfrac', 'sqrt', 'text', 'mathbb', 'mathcal', 'mathrm',
    'left', 'right', 'big', 'bigg', 'quad', 'qquad', 'cdot', 'times', 'div',
    'sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'log', 'ln', 'exp',
    'sum', 'prod', 'int', 'lim', 'infty', 'pm', 'mp', 'neq', 'leq', 'geq',
    'rightarrow', 'leftarrow', 'Rightarrow', 'Leftarrow', 'mapsto',
    'dots', 'ldots', 'cdots', 'overline', 'underline', 'widehat', 'hat',
    'alpha', 'beta', 'gamma', 'delta', 'theta', 'lambda', 'mu', 'pi', 'sigma', 'phi', 'omega',
    'circ', 'deg', 'parallel', 'perp', 'angle', 'triangle'
]);

// Hàm chờ
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Tính năng bóc tách JSON ra khỏi câu trả lời của AI
function extractJSON(content) {
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = content.match(jsonRegex);
    let rawStr = match ? match[1] : content;

    // Xử lý các lỗi cơ bản khi AI sinh chuỗi
    rawStr = rawStr.trim();
    if (!rawStr.startsWith('{') && !rawStr.startsWith('[')) {
        // Cố tìm kiếm dấu ngoặc đầu tiên nếu bị lẫn chữ
        const startIndex = rawStr.indexOf('{');
        const endIndex = rawStr.lastIndexOf('}');
        if (startIndex !== -1 && endIndex !== -1) {
            rawStr = rawStr.substring(startIndex, endIndex + 1);
        }
    }
    return JSON.parse(rawStr);
}

function normalizeAuditText(text) {
    return String(text || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

// Loại bỏ các đoạn math LaTeX để không lấy LaTeX token làm "từ khóa" của đề
function stripMathAndLatex(text) {
    return String(text || '')
        // math display / inline
        .replace(/\$\$[\s\S]*?\$\$/g, ' ')
        .replace(/\\\[[\s\S]*?\\\]/g, ' ')
        .replace(/\$[^$\n]*\$/g, ' ')
        .replace(/\\\([\s\S]*?\\\)/g, ' ')
        // Lệnh LaTeX kiểu \begin{...}, \frac, \sqrt...
        .replace(/\\[a-zA-Z]+\*?\s*(\{[^{}]*\})?/g, ' ');
}

function extractAuditKeywords(text, limit = 12) {
    const stopWords = new Set(['giai', 'cac', 'sau', 'cho', 'voi', 'mot', 'hai', 'ba', 'bon', 'nhung', 'hay', 'the', 'va', 'cua', 'trong', 'neu', 'khi', 'roi', 'theo', 'dang', 'bai', 'toan', 'phuong', 'trinh', 'he', 'bat', 'minh', 'tinh', 'gia', 'tri', 'tren', 'duoi', 'vao', 'duoc', 'nay', 'nao']);
    const tokens = normalizeAuditText(stripMathAndLatex(text))
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(token => token.length >= 3 && !stopWords.has(token) && !LATEX_TOKEN_STOP.has(token));
    return [...new Set(tokens)].slice(0, limit);
}

// Chuyển các ký tự xuống dòng/tab bị escape "\\n", "\\t" thành ký tự thật.
// Chỉ áp dụng cho các chuỗi ở ngoài math block để LaTeX kiểu \neq, \tau không bị phá.
function unescapeEscapedControlChars(value) {
    if (typeof value !== 'string') return value;
    // Bảo vệ math trước khi thay thế
    const mathBlocks = [];
    let protectedText = value
        .replace(/\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^$\n]*\$|\\\([\s\S]*?\\\)/g, (match) => {
            mathBlocks.push(match);
            return `__MATHBLK_${mathBlocks.length - 1}__`;
        });
    protectedText = protectedText
        .replace(/\\r\\n/g, '\n')
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '    ');
    // Phục hồi math
    protectedText = protectedText.replace(/__MATHBLK_(\d+)__/g, (_, idx) => mathBlocks[Number.parseInt(idx, 10)] || '');
    return protectedText;
}

function deepUnescape(value) {
    if (typeof value === 'string') return unescapeEscapedControlChars(value);
    if (Array.isArray(value)) return value.map(deepUnescape);
    if (value && typeof value === 'object') {
        const out = {};
        for (const key of Object.keys(value)) out[key] = deepUnescape(value[key]);
        return out;
    }
    return value;
}

function getChunkId(chunk) {
    return chunk.q_id || chunk.chunk_id || chunk.id || `chunk_${Date.now()}`;
}

function stableStringify(value) {
    if (Array.isArray(value)) {
        return `[${value.map(stableStringify).join(',')}]`;
    }
    if (value && typeof value === 'object') {
        return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value);
}

function hashText(text) {
    return crypto.createHash('sha1').update(String(text || ''), 'utf8').digest('hex');
}

function buildChunkSignature(chunk) {
    return hashText(stableStringify({
        type: chunk.type || '',
        prompt: chunk.prompt || chunk.stem || '',
        subparts: Array.isArray(chunk.subparts) ? chunk.subparts.map(part => ({
            label: part && part.label ? part.label : '',
            text: part && part.text ? part.text : ''
        })) : [],
        options: Array.isArray(chunk.options) ? chunk.options : [],
        statements: Array.isArray(chunk.statements) ? chunk.statements : [],
        section: chunk.section || '',
        subsection: chunk.subsection || '',
        group: chunk.group || ''
    }));
}

function buildRunSignature() {
    return hashText(stableStringify({
        model: MODEL,
        inputFile: INPUT_FILE,
        outputFile: OUTPUT_FILE,
        cacheVersion: CACHE_VERSION,
        promptVersion: PROMPT_VERSION,
        maxAuditRetries: MAX_AUDIT_RETRIES
    }));
}

function isValidProgressEntry(entry, chunk) {
    if (!entry || typeof entry !== 'object') return false;
    if (FORCE_REFRESH) return false;

    const chunkId = getChunkId(chunk);
    if (FORCE_REFRESH_IDS.has(chunkId)) return false;

    const expectedSignature = buildChunkSignature(chunk);
    if (entry.chunk_signature !== expectedSignature) return false;
    if (entry.cache_version !== CACHE_VERSION) return false;
    if (entry.prompt_version !== PROMPT_VERSION) return false;
    if (entry.model !== MODEL) return false;

    if (!REUSE_SUSPECTED_CACHE && entry.audit && entry.audit.suspected) return false;

    if (chunk.type === 'multiple_choice') {
        return Number.isInteger(entry.correct_index) && typeof entry.detailed_explanation === 'string';
    }
    if (chunk.type === 'true_false') {
        return Array.isArray(entry.correct_values) && entry.correct_values.every(value => typeof value === 'boolean');
    }
    return !!(entry.detailed_explanation || entry.final_answer);
}

function createProgressMeta(extra = {}) {
    return {
        cache_version: CACHE_VERSION,
        prompt_version: PROMPT_VERSION,
        model: MODEL,
        input_file: INPUT_FILE,
        output_file: OUTPUT_FILE,
        run_signature: buildRunSignature(),
        updated_at: new Date().toISOString(),
        ...extra
    };
}

function buildChunkSourceText(chunk) {
    const parts = [chunk.prompt || chunk.stem || ''];
    if (Array.isArray(chunk.subparts) && chunk.subparts.length) {
        chunk.subparts.forEach(part => parts.push(`${part.label || ''} ${part.text || ''}`.trim()));
    }
    if (Array.isArray(chunk.options) && chunk.options.length) {
        chunk.options.forEach(option => parts.push(option || ''));
    }
    if (Array.isArray(chunk.statements) && chunk.statements.length) {
        chunk.statements.forEach(statement => parts.push(statement || ''));
    }
    return parts.join(' ');
}

function buildPrompt(chunk, previousIssues = []) {
    const currentId = getChunkId(chunk);
    const lines = [
        'Bạn sẽ nhận một bài toán toán học ở dạng có cấu trúc. Hãy sử dụng toàn bộ dữ kiện được cung cấp.',
        'BẮT BUỘC trả về một JSON object hợp lệ, không có text thừa ngoài JSON.',
        '',
        `[Mã câu] ${currentId}`,
        `[Loại câu] ${chunk.type || 'unknown'}`,
        `[Chủ đề] ${chunk.section || ''}`,
        `[Phân mục] ${chunk.subsection || ''}`,
        `[Nhóm] ${chunk.group || ''}`,
        '',
        '[Đề bài]',
        chunk.prompt || chunk.stem || ''
    ];

    if (Array.isArray(chunk.subparts) && chunk.subparts.length) {
        lines.push('', '[Các ý của bài toán]');
        chunk.subparts.forEach(part => {
            lines.push(`${part.label || '-'} ${part.text || ''}`.trim());
        });
    }

    if (chunk.type === 'multiple_choice') {
        lines.push('', '[Các lựa chọn]');
        (chunk.options || []).forEach((opt, idx) => {
            lines.push(`[${idx}] ${opt}`);
        });
    }

    if (chunk.type === 'true_false') {
        lines.push('', '[Các phát biểu]');
        (chunk.statements || []).forEach((stmt, idx) => {
            lines.push(`[${idx}] ${stmt}`);
        });
    }

    if (previousIssues.length) {
        lines.push('', '[Cảnh báo từ lần thử trước]');
        previousIssues.forEach((issue, idx) => {
            lines.push(`${idx + 1}. ${issue}`);
        });
    }

    if (chunk.type === 'multiple_choice') {
        lines.push('', '[Yêu cầu xuất JSON]');
        lines.push('{');
        lines.push('  "detailed_explanation": "Lời giải chi tiết, bám đúng dữ kiện của đề",');
        lines.push('  "correct_index": 0');
        lines.push('}');
        lines.push(`correct_index phải là số nguyên từ 0 đến ${(chunk.options || []).length - 1}.`);
        lines.push('Nếu bài có nhiều ý phụ thì phải phân tích đủ các ý trước khi kết luận đáp án.');
    } else if (chunk.type === 'true_false') {
        lines.push('', '[Yêu cầu xuất JSON]');
        lines.push('{');
        lines.push('  "detailed_explanation": "Lời giải đánh giá từng phát biểu là đúng hay sai",');
        lines.push('  "correct_values": [true, false]');
        lines.push('}');
        lines.push(`correct_values phải có đúng ${(chunk.statements || []).length} phần tử boolean.`);
    } else {
        const hasSubparts = Array.isArray(chunk.subparts) && chunk.subparts.length > 0;
        lines.push('', '[Yêu cầu xuất JSON]');
        if (hasSubparts) {
            const labels = chunk.subparts.map(part => (part && part.label) ? part.label : '');
            lines.push('{');
            lines.push('  "subpart_solutions": [');
            labels.forEach((lbl, idx) => {
                lines.push(`    { "label": "${lbl}", "explanation": "Lời giải chi tiết ý ${lbl}", "final_answer": "Đáp số ngắn gọn ý ${lbl}" }${idx === labels.length - 1 ? '' : ','}`);
            });
            lines.push('  ],');
            lines.push('  "detailed_explanation": "Bản gộp đầy đủ lời giải tất cả các ý, mỗi ý bắt đầu bằng nhãn như a), b)... ở đầu dòng",');
            lines.push('  "final_answer": "Tổng hợp đáp số cuối cùng của cả bài, liệt kê theo từng ý"');
            lines.push('}');
            lines.push(`subpart_solutions PHẢI có đủ ${labels.length} phần tử theo đúng thứ tự ${labels.join(', ')}.`);
            lines.push('Mỗi phần tử subpart_solutions phải giải trọn vẹn ý tương ứng và KHÔNG được nói là thiếu dữ liệu.');
            lines.push('Trường detailed_explanation là bản gộp để tương thích ngược — mỗi ý bắt đầu trên một dòng mới với nhãn gốc ở đầu.');
        } else {
            lines.push('{');
            lines.push('  "detailed_explanation": "Lời giải chi tiết từng bước",');
            lines.push('  "final_answer": "Kết quả cuối cùng ngắn gọn"');
            lines.push('}');
        }
        lines.push('Chỉ được nói đề thiếu dữ kiện nếu trong toàn bộ thông tin trên thật sự không có biểu thức hoặc dữ kiện cụ thể.');
        lines.push('Dùng ký tự xuống dòng THỰC (newline) giữa các bước, KHÔNG dùng chuỗi "\\n" dạng literal trong giá trị JSON.');
        lines.push('Công thức toán phải bọc trong $...$ hoặc $$...$$ để MathJax render được.');
        lines.push('QUAN TRỌNG: mỗi bước biến đổi / tính toán phải nằm trên MỘT DÒNG RIÊNG (phân cách bằng newline). Tuyệt đối KHÔNG viết các biểu thức liền kề dạng "$A$$B$$C$" trong cùng một dòng.');
        lines.push('Nếu có chuỗi biến đổi tương đương thì nối bằng " ⇔ " hoặc "\\\\Leftrightarrow" trong CÙNG một công thức, không tách thành nhiều $...$ liền nhau.');
        lines.push('Ví dụ tốt:\n  Giải bất phương trình $3x - 6 > 0$.\n  $3x > 6$\n  $x > 2$\n  Vậy tập nghiệm là $x > 2$.');
    }

    return lines.join('\n');
}

function auditAIOutput(chunk, aiOutput, externalAnswer) {
    const explanation = aiOutput && aiOutput.detailed_explanation ? aiOutput.detailed_explanation : '';
    const finalAnswer = aiOutput && aiOutput.final_answer ? aiOutput.final_answer : '';
    const subpartSolutions = Array.isArray(aiOutput && aiOutput.subpart_solutions) ? aiOutput.subpart_solutions : [];
    const subpartJoined = subpartSolutions
        .map(item => `${(item && item.label) || ''} ${(item && item.explanation) || ''} ${(item && item.final_answer) || ''}`)
        .join('\n');
    const responseText = `${explanation}\n${finalAnswer}\n${subpartJoined}`;
    const normalizedResponse = normalizeAuditText(responseText);
    const sourceText = buildChunkSourceText(chunk);
    const questionKeywords = extractAuditKeywords(sourceText);
    const matchedKeywords = questionKeywords.filter(keyword => normalizedResponse.includes(keyword));
    const genericPatterns = [
        'vui long cung cap',
        'khong co du lieu cu the',
        'khong co phuong trinh cu the',
        'de bai chua day du',
        'khong the giai chi tiet',
        'vi du minh hoa',
        'phuong phap tong quat'
    ];
    const subpartLabels = (chunk.subparts || []).map(part => String(part.label || '').trim()).filter(Boolean);

    // Ưu tiên: coverage dựa trên subpart_solutions do AI trả ra
    const solvedLabels = new Set(
        subpartSolutions
            .map(item => String((item && item.label) || '').trim())
            .filter(Boolean)
    );
    const coveredSubparts = subpartLabels.filter(label => {
        if (solvedLabels.has(label)) return true;
        const normalizedLabel = normalizeAuditText(label).replace(/[^a-z0-9]/g, '');
        if (!normalizedLabel) return false;
        return normalizedResponse.includes(normalizedLabel) || normalizedResponse.includes(`y ${normalizedLabel}`) || normalizedResponse.includes(`phan ${normalizedLabel}`);
    });

    const issues = [];
    const hasConcreteQuestion = !!((chunk.subparts && chunk.subparts.length) || (chunk.options && chunk.options.length) || (chunk.statements && chunk.statements.length) || questionKeywords.length >= 3);
    if (hasConcreteQuestion && genericPatterns.some(pattern => normalizedResponse.includes(pattern))) {
        issues.push('Phản hồi có dấu hiệu coi đề là thiếu dữ kiện dù câu hỏi đã có nội dung cụ thể.');
    }
    if (subpartLabels.length > 1 && coveredSubparts.length < subpartLabels.length) {
        const missing = subpartLabels.filter(l => !coveredSubparts.includes(l));
        issues.push(`Thiếu lời giải cho ý: ${missing.join(', ')}.`);
    }
    // Nếu có subparts mà không có mảng subpart_solutions thì cũng coi là vấn đề
    if (subpartLabels.length > 0 && subpartSolutions.length === 0) {
        issues.push('Thiếu mảng subpart_solutions dù đề có nhiều ý.');
    }
    if (questionKeywords.length >= 4 && matchedKeywords.length < 2) {
        issues.push('Độ khớp từ khóa giữa đề và phản hồi đang thấp.');
    }

    if (chunk.type === 'multiple_choice') {
        if (!Number.isInteger(aiOutput && aiOutput.correct_index)) {
            issues.push('correct_index không phải số nguyên hợp lệ.');
        } else if (aiOutput.correct_index < 0 || aiOutput.correct_index >= (chunk.options || []).length) {
            issues.push('correct_index nằm ngoài phạm vi lựa chọn.');
        } else if (!DISABLE_ANSWERS_CROSSCHECK && Number.isInteger(externalAnswer) && externalAnswer !== aiOutput.correct_index) {
            issues.push(`AI chọn đáp án ${aiOutput.correct_index} nhưng answers.json ghi ${externalAnswer}.`);
        }
    } else if (chunk.type === 'true_false') {
        if (!Array.isArray(aiOutput && aiOutput.correct_values)) {
            issues.push('correct_values không phải mảng boolean.');
        } else {
            if (aiOutput.correct_values.length !== (chunk.statements || []).length) {
                issues.push('correct_values không khớp số lượng phát biểu.');
            }
            if (aiOutput.correct_values.some(value => typeof value !== 'boolean')) {
                issues.push('correct_values chứa phần tử không phải boolean.');
            }
        }
    } else if (!explanation && !finalAnswer && subpartSolutions.length === 0) {
        issues.push('Thiếu cả detailed_explanation và final_answer.');
    }

    return {
        ok: issues.length === 0,
        suspected: issues.length > 0,
        issues,
        questionKeywords,
        matchedKeywords,
        subpartLabels,
        coveredSubparts,
        hasSubpartSolutions: subpartSolutions.length > 0,
        responseLength: String(responseText || '').trim().length
    };
}

async function solveChunk(chunk, externalAnswer) {
    let lastAudit = null;
    let lastOutput = null;

    for (let attempt = 0; attempt <= MAX_AUDIT_RETRIES; attempt++) {
        const prompt = buildPrompt(chunk, lastAudit ? lastAudit.issues : []);
        const rawOutput = await askAI(prompt);
        if (!rawOutput) {
            continue;
        }
        const aiOutput = deepUnescape(rawOutput);

        const audit = auditAIOutput(chunk, aiOutput, externalAnswer);
        lastAudit = audit;
        lastOutput = aiOutput;

        if (DEBUG_MODE) {
            console.log(`[DEBUG][${getChunkId(chunk)}] Audit:`, JSON.stringify(audit, null, 2));
        }

        if (audit.ok || attempt === MAX_AUDIT_RETRIES) {
            return {
                aiOutput,
                audit,
                attempts: attempt + 1,
                prompt
            };
        }

        console.log(`⚠️ Audit nghi ngờ lệch đề với [${getChunkId(chunk)}], thử lại lần ${attempt + 1}/${MAX_AUDIT_RETRIES + 1}`);
        await sleep(1000);
    }

    return {
        aiOutput: lastOutput,
        audit: lastAudit,
        attempts: MAX_AUDIT_RETRIES + 1,
        prompt: buildPrompt(chunk, lastAudit ? lastAudit.issues : [])
    };
}

// Hàm gọi DeepInfra AI
async function askAI(prompt, retries = 0) {
    try {
        if (!API_TOKEN) {
            throw new Error('Thiếu DEEPINFRA_API_TOKEN trong biến môi trường');
        }
        if (typeof fetchFn !== 'function') {
            throw new Error('Script này cần Node.js 18+ để dùng fetch');
        }

        const response = await fetchFn("https://api.deepinfra.com/v1/openai/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_TOKEN}`
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    {
                        role: "system",
                        content: "Bạn là một giáo viên toán trung học cơ sở xuất sắc (lớp 9). Hãy giải quyết chính xác theo đúng dữ kiện đã cho, giải tuần tự từng ý nếu bài có nhiều phần, và BẮT BUỘC phải xuất thông tin bằng định dạng JSON object hợp lệ, không có văn bản thừa ngoài JSON. Chỉ được nói đề thiếu dữ kiện khi thật sự không có dữ kiện toán học cụ thể trong toàn bộ prompt. Dùng ký tự xuống dòng thực sự (newline) trong giá trị chuỗi JSON, không dùng chuỗi literal \"\\n\"."
                    },
                    { role: "user", content: prompt }
                ],
                response_format: { "type": "json_object" },
                temperature: 0.2, // Temperature thấp để đảm bảo độ chính xác toán học
                max_tokens: MAX_TOKENS
            })
        });

        if (!response.ok) throw new Error(`API Error: ${response.status}`);

        const result = await response.json();
        const content = result.choices[0].message.content;

        // Cố gắng bóc tách JSON
        return extractJSON(content);
    } catch (e) {
        if (retries < MAX_RETRIES) {
            // Exponential backoff: 3s → 6s → 12s → 24s ...
            const backoffMs = 3000 * Math.pow(2, retries);
            console.log(`Lỗi API/JSON, thử lại... (${retries + 1}/${MAX_RETRIES}) — đợi ${Math.round(backoffMs / 1000)}s. Lý do: ${e.message}`);
            await sleep(backoffMs);
            return askAI(prompt, retries + 1);
        } else {
            console.error("Thử lại thất bại hoàn toàn:", e.message);
            return null;
        }
    }
}

function loadExternalAnswers() {
    try {
        if (!fs.existsSync(EXTERNAL_ANSWERS_FILE)) return {};
        const raw = JSON.parse(fs.readFileSync(EXTERNAL_ANSWERS_FILE, 'utf-8'));
        return (raw && typeof raw === 'object') ? raw : {};
    } catch (err) {
        console.warn(`⚠️ Không đọc được ${EXTERNAL_ANSWERS_FILE}:`, err.message);
        return {};
    }
}

function chunkPassesFilter(chunk) {
    const id = getChunkId(chunk);
    if (ONLY_IDS.size && !ONLY_IDS.has(id)) return false;
    if (ONLY_TYPES.size && !ONLY_TYPES.has(chunk.type || '')) return false;
    if (ONLY_SECTIONS_RAW.length) {
        const section = chunk.section || '';
        const matched = ONLY_SECTIONS_RAW.some(keyword => section.toLowerCase().includes(keyword.toLowerCase()));
        if (!matched) return false;
    }
    return true;
}

// Vòng lặp giải quyết chính
async function processQuestions() {
    // 1. Tải danh sách câu hỏi
    const inputData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
    const chunks = Array.isArray(inputData) ? inputData : (inputData.chunks || []);
    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });

    const externalAnswers = loadExternalAnswers();

    // 2. Tải tiến độ cũ
    let progress = {};
    if (fs.existsSync(OUTPUT_FILE)) {
        progress = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
    }

    if (!progress || typeof progress !== 'object' || Array.isArray(progress)) {
        progress = {};
    }

    const previousMeta = progress.__meta && typeof progress.__meta === 'object' ? progress.__meta : null;
    progress.__meta = createProgressMeta({
        previous_updated_at: previousMeta ? previousMeta.updated_at || null : null,
        force_refresh: FORCE_REFRESH,
        force_refresh_ids: [...FORCE_REFRESH_IDS],
        reuse_suspected_cache: REUSE_SUSPECTED_CACHE,
        limit: LIMIT || null,
        only_ids: [...ONLY_IDS],
        only_types: [...ONLY_TYPES],
        only_sections: ONLY_SECTIONS_RAW
    });

    // Xác định trước danh sách câu cần giải (đã lọc + bỏ qua cache hợp lệ).
    let reusedCount = 0;
    let invalidatedCount = 0;
    let skippedByFilter = 0;
    const workQueue = [];
    for (const chunk of chunks) {
        const currentId = getChunkId(chunk);
        if (!chunkPassesFilter(chunk)) { skippedByFilter += 1; continue; }
        if (isValidProgressEntry(progress[currentId], chunk)) { reusedCount += 1; continue; }
        if (progress[currentId]) invalidatedCount += 1;
        workQueue.push(chunk);
    }

    // Áp LIMIT
    const effectiveQueue = LIMIT ? workQueue.slice(0, LIMIT) : workQueue;

    console.log(`Đầu vào: ${chunks.length} câu, đã có cache: ${reusedCount}, cần giải: ${effectiveQueue.length}, bỏ vì filter: ${skippedByFilter}.`);
    if (LIMIT || ONLY_IDS.size || ONLY_TYPES.size || ONLY_SECTIONS_RAW.length) {
        console.log(`Bộ lọc: LIMIT=${LIMIT || '∞'}, types=${[...ONLY_TYPES].join(',') || 'all'}, ids=${[...ONLY_IDS].slice(0,5).join(',') || 'all'}, sections=${ONLY_SECTIONS_RAW.join(' | ') || 'all'}.`);
    }
    console.log(`Concurrency: ${CONCURRENCY} | Delay giữa request (trong 1 worker): ${REQUEST_DELAY_MS}ms | max_tokens: ${MAX_TOKENS}.`);

    // Worker pool đơn giản
    let cursor = 0;
    let solvedCount = 0;
    let failedCount = 0;
    const startedAt = Date.now();

    // Lưu file an toàn: không ghi đồng thời 2 chỗ.
    let savePromise = Promise.resolve();
    const saveProgress = (finalMeta) => {
        progress.__meta = createProgressMeta({
            previous_updated_at: previousMeta ? previousMeta.updated_at || null : null,
            force_refresh: FORCE_REFRESH,
            force_refresh_ids: [...FORCE_REFRESH_IDS],
            reuse_suspected_cache: REUSE_SUSPECTED_CACHE,
            limit: LIMIT || null,
            only_ids: [...ONLY_IDS],
            only_types: [...ONLY_TYPES],
            only_sections: ONLY_SECTIONS_RAW,
            reused_count: reusedCount,
            invalidated_count: invalidatedCount,
            solved_count: solvedCount,
            skipped_by_filter: skippedByFilter,
            concurrency: CONCURRENCY,
            ...(finalMeta || {})
        });
        const snapshot = JSON.stringify(progress, null, 2);
        savePromise = savePromise.then(() => fs.promises.writeFile(OUTPUT_FILE, snapshot, 'utf-8'));
        return savePromise;
    };

    const totalToSolve = effectiveQueue.length;
    const runWorker = async (workerIdx) => {
        while (true) {
            const idx = cursor++;
            if (idx >= totalToSolve) return;
            const chunk = effectiveQueue[idx];
            const currentId = getChunkId(chunk);
            const externalAnswer = (externalAnswers && typeof externalAnswers[currentId] !== 'undefined')
                ? externalAnswers[currentId] : undefined;

            const pos = idx + 1;
            const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
            console.log(`[W${workerIdx} ${pos}/${totalToSolve} • ${elapsed}s] ⏳ ${currentId} (${chunk.type})`);

            try {
                const solved = await solveChunk(chunk, externalAnswer);
                if (solved && solved.aiOutput) {
                    const aiOutput = solved.aiOutput;
                    progress[currentId] = {
                        id: currentId,
                        type: chunk.type || null,
                        detailed_explanation: aiOutput.detailed_explanation || null,
                        subpart_solutions: Array.isArray(aiOutput.subpart_solutions) ? aiOutput.subpart_solutions : null,
                        correct_index: Number.isInteger(aiOutput.correct_index) ? aiOutput.correct_index : null,
                        correct_values: Array.isArray(aiOutput.correct_values) ? aiOutput.correct_values : null,
                        final_answer: aiOutput.final_answer || null,
                        timestamp: new Date().toISOString(),
                        cache_version: CACHE_VERSION,
                        prompt_version: PROMPT_VERSION,
                        model: MODEL,
                        chunk_signature: buildChunkSignature(chunk),
                        external_answer: typeof externalAnswer !== 'undefined' ? externalAnswer : null,
                        audit: solved.audit,
                        attempts: solved.attempts,
                        debug: DEBUG_MODE ? { prompt: solved.prompt, model: MODEL } : undefined
                    };
                    solvedCount += 1;
                    await saveProgress();
                    const tag = solved.audit && solved.audit.suspected ? '⚠️' : '✅';
                    const now = ((Date.now() - startedAt) / 1000).toFixed(1);
                    console.log(`[W${workerIdx} ${pos}/${totalToSolve} • ${now}s] ${tag} ${currentId}${solved.audit && solved.audit.suspected ? ' · ' + solved.audit.issues.join(' | ') : ''}`);
                } else {
                    failedCount += 1;
                    console.log(`[W${workerIdx} ${pos}/${totalToSolve}] ❌ ${currentId}`);
                }
            } catch (err) {
                failedCount += 1;
                console.log(`[W${workerIdx} ${pos}/${totalToSolve}] 💥 ${currentId}: ${err.message}`);
            }

            // Nghỉ nhẹ trong CÙNG 1 worker để rải đều request
            if (REQUEST_DELAY_MS > 0) await sleep(REQUEST_DELAY_MS);
        }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => runWorker(i + 1)));
    await savePromise;

    progress.__meta = createProgressMeta({
        previous_updated_at: previousMeta ? previousMeta.updated_at || null : null,
        force_refresh: FORCE_REFRESH,
        force_refresh_ids: [...FORCE_REFRESH_IDS],
        reuse_suspected_cache: REUSE_SUSPECTED_CACHE,
        limit: LIMIT || null,
        only_ids: [...ONLY_IDS],
        only_types: [...ONLY_TYPES],
        only_sections: ONLY_SECTIONS_RAW,
        reused_count: reusedCount,
        invalidated_count: invalidatedCount,
        solved_count: solvedCount,
        skipped_by_filter: skippedByFilter,
        total_chunks: chunks.length
    });
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(progress, null, 2), 'utf-8');
    const totalSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
    const avg = solvedCount > 0 ? (Number(totalSeconds) / solvedCount).toFixed(1) : 'n/a';
    console.log(`Tóm tắt: solved=${solvedCount}, failed=${failedCount}, reused=${reusedCount}, invalidated=${invalidatedCount}, skippedByFilter=${skippedByFilter}, total=${chunks.length}`);
    console.log(`⏱  Tổng thời gian: ${totalSeconds}s | trung bình ${avg}s/câu | concurrency=${CONCURRENCY}`);
    console.log("HOÀN THÀNH!");
}

// Bắt đầu chạy
processQuestions();
