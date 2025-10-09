// === GLOBAL VARIABLES ===
let examManifest; // Biến lưu trữ toàn bộ manifest - MUST BE GLOBAL
let timerInterval;
let currentExamData;
let studentAnswers = {}; // Lưu trữ câu trả lời của học sinh
let examMode = 'static'; // 'static' | 'interactive'
let answersMap = {}; // Lưu toàn bộ answers.json để chấm điểm
let currentExamKey = ''; // Khóa lưu bài làm theo từng đề (dựa theo path)

// === HELPER FUNCTIONS ===
/**
 * Format và tô đậm các chữ cái A, B, C, D trong câu hỏi và đáp án
 * CHỈ xử lý các đáp án có dạng "A. ", "B. ", "C. ", "D. "
 */
function formatOptionLetters(text) {
    if (!text) return '';

    // Tô đậm và đổi màu các chữ cái A, B, C, D
    let formattedText = text
        // Xử lý dạng "<br>A. " hoặc "A. " (có thẻ <br> hoặc khoảng trắng)
        .replace(/(<br>|\s|^)([A-D])\.\s/g, '$1<span class="option-letter">$2.</span> ')
        // Xử lý dạng "<br>a. " hoặc "a. " (có thẻ <br> hoặc khoảng trắng)
        .replace(/(<br>|\s|^)([a-d])\.\s/g, '$1<span class="option-letter">$2.</span> ')
        // Xử lý dạng "<br>a) " hoặc "a) " (có thẻ <br> hoặc khoảng trắng)
        .replace(/(<br>|\s|^)([a-d]\)\s)/g, '$1<span class="option-letter">$2</span> ');

    return formattedText;
}

// Prefer in-question expected for MC; fallback to answers text
function getExpectedMCIndex(question, answerText) {
    if (typeof question.correct_index === 'number') return question.correct_index;
    const letter = extractCorrectMC(answerText);
    if (letter) return indexFromLetter(letter);
    return null;
}

// Prefer in-question expected for TF; return array aligned with statements order
function getExpectedTFArray(question, answerText) {
    const parsed = getTFParsed(question); // know number of items
    const len = parsed.items.length || 0;
    // New schema
    if (Array.isArray(question.correct_values)) {
        const arr = question.correct_values.slice(0, len);
        while (arr.length < len) arr.push(null);
        return arr;
    }
    // Fallback: parse from answers text (map by a,b,c,d)
    const map = extractCorrectTF(answerText || '');
    const out = new Array(len).fill(null);
    for (let i = 0; i < len; i++) {
        const key = String.fromCharCode(97 + i);
        if (typeof map[key] !== 'undefined') out[i] = map[key];
    }
    return out;
}

// === ROUTER (hash-based) ===
function parseHash() {
    const h = (location.hash || '#/classes').slice(1);
    const [path, queryStr] = h.split('?');
    const segments = path.split('/').filter(Boolean);
    const params = {};
    if (queryStr) {
        queryStr.split('&').forEach(kv => {
            const [k, v] = kv.split('=');
            params[decodeURIComponent(k)] = decodeURIComponent(v || '');
        });
    }
    return { segments, params };
}

function navigateTo(hash) {
    if (location.hash === hash) {
        renderRoute();
        return;
    }
    location.hash = hash;
}

async function renderRoute() {
    const { segments, params } = parseHash();
    const classSelectionScreen = document.getElementById('class-selection-screen');
    const examSelectionScreen = document.getElementById('exam-selection-screen');
    const examScreen = document.getElementById('exam-screen');
    const resultsScreen = document.getElementById('results-screen');

    [classSelectionScreen, examSelectionScreen, examScreen, resultsScreen].forEach(el => el && el.classList.add('hidden'));

    if (segments.length === 0 || segments[0] === 'classes') {
        classSelectionScreen && classSelectionScreen.classList.remove('hidden');
        return;
    }

    if (segments[0] === 'exams' && segments[1]) {
        const selectedGrade = segments[1];
        try { populateExamMenu(selectedGrade); } catch (e) { console.warn('populateExamMenu failed:', e); }
        examSelectionScreen && examSelectionScreen.classList.remove('hidden');
        return;
    }

    if (segments[0] === 'exam') {
        const path = params.path || '';
        const mode = params.mode || 'static';
        const modeSel = document.getElementById('exam-mode-select');
        if (modeSel) modeSel.value = mode;
        if (path) {
            await startExam({ title: '(đang tải)', path, type: 'exam' });
        }
        examScreen && examScreen.classList.remove('hidden');
        return;
    }

    if (segments[0] === 'results') {
        resultsScreen && resultsScreen.classList.remove('hidden');
        return;
    }

    classSelectionScreen && classSelectionScreen.classList.remove('hidden');
}

/**
 * Format câu hỏi để in đậm các đáp án A, B, C, D
 */
function formatQuestionText(text) {
    if (!text) return '';
    // Thêm vào bước chuyển đổi ký tự xuống dòng \n thành thẻ <br>
    // để đảm bảo câu hỏi được hiển thị nhất quán trên mọi màn hình.
    let formattedText = formatOptionLetters(text).replace(/\n/g, '<br>');
    return formattedText;
}

/**
 * Format đáp án mẫu - TÔ ĐẬM VÀ ĐỔI MÀU CHỮ CÁI A, B, C, D
 */
function formatAnswerText(text) {
    if (!text) return 'Chưa có đáp án.';

    let formattedText = formatOptionLetters(text)
        .replace(/Lời giải:/g, '<strong>Lời giải:</strong>')
        .replace(/Đáp án đúng:/g, '<strong>Đáp án đúng:</strong>')
        .replace(/Đáp án:/g, '<strong>Đáp án:</strong>')
        .replace(/Phân tích:/g, '<strong>Phân tích:</strong>')
        .replace(/\n/g, '<br>');

    return formattedText;
}

/**
 * Phân chia danh sách câu hỏi thành các phần (sections) dựa trên thuộc tính 'section' trong dữ liệu.
 * @param {object} examData - Đối tượng dữ liệu bài kiểm tra đã được tải.
 * @returns {Array} - Một mảng các đối tượng section.
 */
function partitionIntoSections(examData) {
    if (!examData || !examData.questions) {
        return [];
    }

    const sectionsMap = new Map();
    const romanNumerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

    examData.questions.forEach(question => {
        // Mặc định là 'Phần chung' nếu không có section được chỉ định
        const sectionTitle = question.section || 'Phần chung';
        const sectionType = question.type || 'multiple_choice'; // 'multiple_choice' hoặc 'short'

        if (!sectionsMap.has(sectionTitle)) {
            sectionsMap.set(sectionTitle, {
                title: sectionTitle,
                roman: romanNumerals[sectionsMap.size],
                type: sectionType,
                items: []
            });
        }
        sectionsMap.get(sectionTitle).items.push(question);
    });

    return Array.from(sectionsMap.values());
}

// === Helpers for interactive rendering ===
function parseMultipleChoiceContent(questionText) {
    if (!questionText) return { stem: '', options: [] };
    const parts = questionText.replace(/\n/g, '<br>').split(/<br>/g);
    const options = [];
    const stemParts = [];
    let seenOption = false;
    const optRe = /^\s*([A-Da-d])[\.|\)]\s*(.*)$/;
    for (const raw of parts) {
        const line = raw.trim();
        const m = line.match(optRe);
        if (m) {
            seenOption = true;
            options.push({ key: m[1].toUpperCase(), text: m[2] || '' });
        } else if (!seenOption) {
            stemParts.push(raw);
        }
    }
    return { stem: stemParts.join('<br>').trim(), options };
}

function parseTrueFalseContent(questionText) {
    if (!questionText) return { stem: '', items: [] };
    const parts = questionText.replace(/\n/g, '<br>').split(/<br>/g);
    const items = [];
    const stemParts = [];
    let seen = false;
    const tfRe = /^\s*([a-dA-D])\)\s*(.*)$/;
    for (const raw of parts) {
        const line = raw.trim();
        const m = line.match(tfRe);
        if (m) {
            seen = true;
            items.push({ key: m[1].toLowerCase(), text: m[2] || '' });
        } else if (!seen) {
            stemParts.push(raw);
        }
    }
    return { stem: stemParts.join('<br>').trim(), items };
}

// Prefer structured fields if present; fallback to parsing from question_text
function letterFromIndex(i) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return (i >= 0 && i < alphabet.length) ? alphabet[i] : '?';
}

function indexFromLetter(ch) {
    if (!ch) return -1;
    const u = String(ch).toUpperCase();
    const code = u.charCodeAt(0) - 65;
    return (code >= 0 && code < 26) ? code : -1;
}

function getMCParsed(question) {
    if (Array.isArray(question.options) && question.options.length) {
        // New schema: array of strings or {text}
        const opts = question.options.map((o, i) => {
            if (typeof o === 'string') return { key: letterFromIndex(i), text: o };
            const txt = o && o.text ? o.text : '';
            const k = o && o.key ? String(o.key).toUpperCase() : letterFromIndex(i);
            return { key: k, text: txt };
        });
        return { stem: (question.stem || '').replace(/\n/g, '<br>'), options: opts };
    }
    // Old schema: parse from question_text
    return parseMultipleChoiceContent(question.question_text || '');
}

function getTFParsed(question) {
    // New schema: statements as an ARRAY (auto letters)
    if (Array.isArray(question.statements) && question.statements.length) {
        const items = question.statements.map((text, i) => ({ key: String.fromCharCode(97 + i), text: text || '' }));
        return { stem: (question.stem || '').replace(/\n/g, '<br>'), items };
    }
    // Old schema: object with a,b,c,d keys
    if (question.statements && typeof question.statements === 'object') {
        const items = ['a','b','c','d'].filter(k => k in question.statements)
            .map(k => ({ key: k, text: question.statements[k] || '' }));
        return { stem: (question.stem || '').replace(/\n/g, '<br>'), items };
    }
    return parseTrueFalseContent(question.question_text || '');
}

function getExpectedShortSpec(question, answerText) {
    // Prefer explicit final_answer in question, else extract from model answer text
    if (question && typeof question.final_answer !== 'undefined' && question.final_answer !== null) {
        const raw = String(question.final_answer).trim();
        if (raw.length) {
            const hasComma = raw.includes(',');
            const hasDot = raw.includes('.');
            const decimals = (hasComma || hasDot) ? (raw.split(hasComma ? ',' : '.')[1] || '').length : 0;
            const value = parseFloat(raw.replace(',', '.'));
            if (!isNaN(value)) return { value, decimals };
        }
    }
    return extractCorrectShortNumeric(answerText);
}

function getStemText(question, parentType) {
    const qType = question.type || parentType;
    const qt = question.question_text || '';
    
    // In interactive mode, just return the stem
    if (examMode === 'interactive') {
        if (qType === 'multiple_choice') { const parsed = getMCParsed(question); return parsed.stem || qt; }
        if (qType === 'true_false') { const parsed = getTFParsed(question); return parsed.stem || qt; }
        return question.stem || qt;
    }
    
    // In static mode, include options/statements in the output
    let output = question.stem || qt;
    
    // Add multiple choice options if available
    if (qType === 'multiple_choice') {
        const parsed = getMCParsed(question);
        if (parsed.options && parsed.options.length > 0) {
            output += '<div class="mt-2 ml-4 space-y-1">';
            parsed.options.forEach((opt, idx) => {
                output += `<div><span class="font-semibold">${letterFromIndex(idx)}.</span> ${opt.text || ''}</div>`;
            });
            output += '</div>';
        }
    }
    // Add true/false statements if available
    else if (qType === 'true_false') {
        const parsed = getTFParsed(question);
        if (parsed.items && parsed.items.length > 0) {
            output += '<div class="mt-2 ml-4 space-y-1">';
            parsed.items.forEach((item, idx) => {
                output += `<div><span class="font-semibold">${String.fromCharCode(97 + idx)})</span> ${item.text || ''}</div>`;
            });
            output += '</div>';
        }
    }
    
    return output;
}

/**
 * Render input elements based on question type (interactive mode only)
 */
function renderInputElement(question, parentType) {
    if (examMode !== 'interactive') return '';
    const qId = question.q_id;
    const qType = question.type || parentType;

    if (qType === 'multiple_choice') {
        const parsed = getMCParsed(question);
        if (!parsed.options.length) return '';
        return `
            <div class="answer-input-container mt-3 space-y-2">
                ${parsed.options.map(opt => `
                    <label class=\"flex items-start gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer\"> 
                        <input type=\"radio\" name=\"${qId}\" value=\"${opt.key}\" class=\"w-4 h-4 mt-1 text-blue-600\" onchange=\"saveAnswer('${qId}', '${opt.key}')\" />
                        <div class=\"leading-relaxed\"><span class=\"option-letter\">${opt.key}. </span>${opt.text}</div>
                    </label>
                `).join('')}
            </div>`;
    } else if (qType === 'true_false') {
        const parsed = getTFParsed(question);
        if (!parsed.items.length) return '';
        return `
            <div class="answer-input-container mt-3 space-y-2">
                ${parsed.items.map(it => `
                    <div class=\"flex items-start justify-between gap-4 p-2 bg-gray-50 rounded\">
                        <div class=\"flex-1\"><span class=\"font-semibold\">${it.key})</span> ${it.text}</div>
                        <div class=\"flex items-center gap-4 flex-shrink-0\">
                            <label class=\"flex items-center gap-1 cursor-pointer\">
                                <input type=\"radio\" name=\"${qId}_${it.key}\" value=\"true\" class=\"w-4 h-4 text-green-600\" onchange=\"saveTrueFalseAnswer('${qId}', '${it.key}', true)\" />
                                <span class=\"text-green-700\">Đúng</span>
                            </label>
                            <label class=\"flex items-center gap-1 cursor-pointer\">
                                <input type=\"radio\" name=\"${qId}_${it.key}\" value=\"false\" class=\"w-4 h-4 text-red-600\" onchange=\"saveTrueFalseAnswer('${qId}', '${it.key}', false)\" />
                                <span class=\"text-red-700\">Sai</span>
                            </label>
                        </div>
                    </div>
                `).join('')}
            </div>`;
    } else if (qType === 'short') {
        return `
            <div class="answer-input-container mt-3">
                <input type="text" id="${qId}" inputmode="decimal" 
                       class="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" 
                       placeholder="Nhập đáp án (chỉ số, dùng dấu phẩy hoặc chấm)" 
                       oninput="saveAnswer('${qId}', this.value)" />
            </div>`;
    }
    return '';
}

/**
 * Save student answer
 */
window.saveAnswer = function(qId, answer) {
    studentAnswers[qId] = answer;
    console.log('Saved answer for', qId, ':', answer);
    saveAnswersToStorage();
};

/**
 * Save true/false answer
 */
window.saveTrueFalseAnswer = function(qId, option, value) {
    // If option is a number (index), store as an array for the new schema
    if (typeof option === 'number') {
        if (!Array.isArray(studentAnswers[qId])) studentAnswers[qId] = [];
        studentAnswers[qId][option] = value;
    } else {
        // Back-compat: letter keys a/b/c/d
        if (!studentAnswers[qId] || typeof studentAnswers[qId] !== 'object') studentAnswers[qId] = {};
        studentAnswers[qId][option] = value;
    }
    console.log('Saved true/false answer for', qId, option, ':', value);
    saveAnswersToStorage();
};

// === Lưu/khôi phục bài làm ===
function getExamStorageKey() {
    return currentExamKey ? `quiz_answers:${currentExamKey}` : '';
}

function saveAnswersToStorage() {
    try {
        const key = getExamStorageKey();
        if (!key) return;
        localStorage.setItem(key, JSON.stringify(studentAnswers));
    } catch (e) {
        console.warn('Không thể lưu bài làm:', e);
    }
}

function loadAnswersFromStorage() {
    try {
        const key = getExamStorageKey();
        if (!key) return {};
        const raw = localStorage.getItem(key);
        if (!raw) return {};
        const data = JSON.parse(raw);
        return (data && typeof data === 'object') ? data : {};
    } catch (e) {
        console.warn('Không thể khôi phục bài làm:', e);
        return {};
    }
}

function applySavedAnswersToUI() {
    // Áp dụng radio MC
    Object.entries(studentAnswers).forEach(([qId, val]) => {
        if (typeof val === 'number') {
            let sel = `input[type="radio"][name="${qId}"][value="${String(val)}"]`;
            let el = document.querySelector(sel);
            if (el) el.checked = true;
        } else if (typeof val === 'string') {
            // Back-compat: old MC saved as letter 'A'-'D'. Try letter -> index.
            let sel = `input[type="radio"][name="${qId}"][value="${val}"]`;
            let el = document.querySelector(sel);
            if (!el) {
                const idx = indexFromLetter(val);
                if (idx >= 0) {
                    sel = `input[type="radio"][name="${qId}"][value="${String(idx)}"]`;
                    el = document.querySelector(sel);
                }
            }
            if (el) el.checked = true;
        } else if (typeof val === 'object' && val) {
            // Đúng/Sai
            Object.entries(val).forEach(([opt, boolVal]) => {
                let sel = `input[type="radio"][name="${qId}_${opt}"][value="${boolVal ? 'true' : 'false'}"]`;
                let el = document.querySelector(sel);
                if (!el) {
                    const idx = indexFromLetter(opt);
                    if (idx >= 0) {
                        sel = `input[type="radio"][name="${qId}_${idx}"][value="${boolVal ? 'true' : 'false'}"]`;
                        el = document.querySelector(sel);
                    }
                }
                if (el) el.checked = true;
            });
        }
        // Tự luận
        const ta = document.getElementById(qId);
        if (ta && typeof val === 'string') ta.value = val;
    });
}

/**
 * Extract correct answers from model answer text
 */
function extractCorrectMC(answerText) {
    if (!answerText) return null;
    const m = answerText.match(/Đáp án đúng:\s*([A-D])/i);
    return m ? m[1].toUpperCase() : null;
}

function extractCorrectTF(answerText) {
    const map = {};
    const text = answerText || '';
    const lines = text.split(/\n/);
    const re = /^\s*([a-dA-D])\)\s*(Đúng|Sai)/;
    for (const line of lines) {
        const m = line.match(re);
        if (m) map[m[1].toLowerCase()] = (m[2] === 'Đúng');
    }
    return map;
}

// Parse expected numeric value for short-answer questions from model_answer
function extractCorrectShortNumeric(answerText) {
    if (!answerText) return null;
    // Find all numeric tokens; take the LAST as the final answer in the text
    const matches = answerText.match(/-?\d+(?:[\.,]\d+)?/g);
    if (!matches || !matches.length) return null;
    const raw = matches[matches.length - 1];
    const hasComma = raw.includes(',');
    const hasDot = raw.includes('.');
    const decimals = (hasComma || hasDot) ? (raw.split(hasComma ? ',' : '.')[1] || '').length : 0;
    const value = parseFloat(raw.replace(',', '.'));
    if (isNaN(value)) return null;
    return { value, decimals };
}

function normalizeNumberInput(str) {
    if (typeof str !== 'string') return NaN;
    const cleaned = str.trim().replace(',', '.');
    const num = parseFloat(cleaned);
    return num;
}

/**
 * Get student answer display HTML
 */
function getStudentAnswerDisplay(question) {
    const qId = question.q_id;
    const answer = studentAnswers[qId];
    const ansText = answersMap[qId] || question.model_answer || '';
    // Infer type if missing (use answers content)
    const qType = (question.type) ? question.type : (function(){
        if (extractCorrectMC(ansText)) return 'multiple_choice';
        const tf = extractCorrectTF(ansText);
        if (Object.keys(tf).length) return 'true_false';
        return 'short';
    })();
    
    if (!answer) {
        return '<div class="mt-3 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded"><span class="text-yellow-700 font-semibold">Bạn chưa trả lời câu này</span></div>';
    }
    
    if (qType === 'multiple_choice') {
        // Normalize user answer -> index
        const userIdx = (typeof answer === 'number') ? answer : indexFromLetter(answer);
        const userLetter = (userIdx >= 0) ? letterFromIndex(userIdx) : String(answer || '');
        let verdict = '';
        if (examMode === 'interactive') {
            const expectedIdx = getExpectedMCIndex(question, ansText);
            if (expectedIdx !== null && expectedIdx >= 0) {
                const isCorrect = (userIdx === expectedIdx);
                const expLetter = letterFromIndex(expectedIdx);
                verdict = `<div class="mt-2 ${isCorrect ? 'text-green-700' : 'text-red-700'} font-semibold">Đánh giá: ${isCorrect ? 'Đúng' : 'Sai'}${isCorrect ? '' : ` (Đáp án đúng: ${expLetter})`}</div>`;
            }
        }
        return `<div class="mt-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                    <div class="text-blue-700 font-semibold">Câu trả lời của bạn: ${userLetter}</div>
                    ${verdict}
                </div>`;
    } else if (qType === 'true_false') {
        // Build list display and verdict summary
        const parsed = getTFParsed(question);
        const expectedArr = getExpectedTFArray(question, ansText);
        let correctCount = 0, total = parsed.items.length;
        const rows = parsed.items.map((it, idx) => {
            const userVal = (answer && (typeof answer[idx] !== 'undefined' ? answer[idx] : answer[it.key]));
            let part = `${it.key}) `;
            if (typeof userVal === 'boolean') {
                const color = userVal ? 'text-green-600' : 'text-red-600';
                part += `<span class="${color} font-semibold">${userVal ? 'Đúng' : 'Sai'}</span>`;
            } else {
                part += `<span class="text-yellow-600">Chưa trả lời</span>`;
            }
            if (examMode === 'interactive' && typeof expectedArr[idx] === 'boolean') {
                if (typeof userVal === 'boolean' && userVal === expectedArr[idx]) correctCount++;
            }
            return part;
        }).join(', ');
        const summary = (examMode === 'interactive' && total > 0)
            ? `<div class="mt-2 text-blue-700">Đúng ${correctCount} / ${total}</div>`
            : '';
        return `<div class="mt-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                    <div class="text-blue-700 font-semibold">Câu trả lời của bạn:</div>
                    <div class="mt-1">${rows}</div>
                    ${summary}
                </div>`;
    } else if (qType === 'short') {
        // Build verdict if interactive and expected numeric present
        let verdict = '';
        if (examMode === 'interactive') {
            const expected = getExpectedShortSpec(question, ansText);
            if (expected) {
                const stuNum = normalizeNumberInput(String(answer));
                const expStr = expected.value.toFixed(expected.decimals);
                const expVN = expStr.replace('.', ',');
                if (!isNaN(stuNum)) {
                    const stuStr = stuNum.toFixed(expected.decimals);
                    const isCorrect = (stuStr === expStr);
                    verdict = `<div class="mt-2 ${isCorrect ? 'text-green-700' : 'text-red-700'} font-semibold">Đánh giá: ${isCorrect ? 'Đúng' : 'Sai'}${isCorrect ? '' : ` (Đáp án đúng: ${expVN})`}</div>`;
                } else {
                    verdict = `<div class="mt-2 text-red-700 font-semibold">Đánh giá: Sai (Đáp án đúng: ${expVN})</div>`;
                }
            }
        }
        return `<div class="mt-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                    <div><span class="text-blue-700 font-semibold">Câu trả lời của bạn: </span>
                    <span class="text-gray-800">${answer}</span></div>
                    ${verdict}
                </div>`;
    }
    return '';
}

/**
 * Populate the exam menu with available exams and tools for the selected grade
 * @param {string} grade - The grade level (9, 10, 11, 12)
 */
function populateExamMenu(grade) {
    console.log('populateExamMenu called with grade:', grade);
    const examMenu = document.getElementById('exam-menu');
    console.log('examMenu element:', examMenu);

    if (!examMenu) {
        console.error('exam-menu element not found!');
        return;
    }

    examMenu.innerHTML = '';
    const gradeKey = `grade${grade}`;
    console.log('Looking for grade data with key:', gradeKey);

    const gradeData = examManifest.grades[gradeKey];
    console.log('Grade data found:', gradeData);

    const allItems = [
        ...(gradeData.exams || []),
        ...(gradeData.tools || [])
    ];

    document.getElementById('exam-selection-title').textContent = `Học liệu Lớp ${grade}`;

    if (allItems.length > 0) {
        allItems.forEach(item => {
            const button = document.createElement('button');
            button.className = 'w-full sm:w-3/4 bg-blue-500 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-600';
            button.textContent = item.title;
            button.addEventListener('click', () => {
                if (item.type === 'tool' && item.url) {
                    window.location.href = item.url;
                } else if (item.type === 'exam') {
                    const modeSel = document.getElementById('exam-mode-select');
                    const mode = modeSel ? modeSel.value : 'static';
                    const pathParam = encodeURIComponent(item.path);
                    navigateTo(`#/exam?path=${pathParam}&mode=${encodeURIComponent(mode)}`);
                }
            });
            examMenu.appendChild(button);
        });
    } else {
        examMenu.innerHTML = `<p class="text-gray-500">Chưa có học liệu nào cho lớp này.</p>`;
    }
}

// hàm khởi động phần đề bài
async function startExam(examInfo) {
    const examTitleHeader = document.getElementById('exam-title-header');
    const examQuestionsContainer = document.getElementById('exam-questions-container');
    const examSelectionScreen = document.getElementById('exam-selection-screen');
    const examScreen = document.getElementById('exam-screen');

    examTitleHeader.textContent = `Đang tải: ${examInfo.title}...`;

    try {
        const basePath = examInfo.path.endsWith('/') ? examInfo.path : examInfo.path + '/';
        currentExamKey = examInfo.path || basePath;
        const ts = `?t=${Date.now()}`;
        const examUrl = basePath + 'exam.json' + ts;
        const answersUrl = basePath + 'answers.json' + ts;

        const fetchOpts = { cache: 'no-store' };
        const [examRes, answersRes] = await Promise.all([
            fetch(examUrl, fetchOpts),
            fetch(answersUrl, fetchOpts)
        ]);

        if (!examRes.ok) throw new Error(`Không thể tải exam.json (${examRes.status})`);
        if (!answersRes.ok) throw new Error(`Không thể tải answers.json (${answersRes.status})`);

        const examContent = await examRes.json();
        const answersContent = await answersRes.json();

        examContent.questions.forEach(q => {
            if (q.is_group && q.sub_questions) {
                q.sub_questions.forEach(sub_q => {
                    sub_q.model_answer = answersContent[sub_q.q_id] || "Chưa có đáp án.";
                });
            } else {
                q.model_answer = answersContent[q.q_id] || "Chưa có đáp án.";
            }
        });

        // Save current data and answers map
        currentExamData = examContent;
        answersMap = answersContent;

        // Capture selected mode (static or interactive)
        const modeSel = document.getElementById('exam-mode-select');
        examMode = modeSel ? modeSel.value : 'static';

        examTitleHeader.textContent = examInfo.title;

        let examHTML = '';
        const sections = partitionIntoSections(currentExamData);
        let questionCounter = 1;

        sections.forEach(sec => {
            examHTML += `<h2 class="text-xl font-bold text-blue-700 mt-6 mb-3">${sec.title}</h2>`;

            sec.items.forEach((item) => {
                if (item.is_group && item.sub_questions) {
                    // Nếu là nhóm, duyệt qua các câu hỏi con
                    item.sub_questions.forEach(subItem => {
                        const label = `Câu ${questionCounter}:`;
                        const stem = getStemText(subItem, item.type);
                        const formattedQuestion = formatQuestionText(stem);
                        const inputHTML = renderInputElement(subItem, item.type);
                        examHTML += `
                            <div class="question-container">
                                <div class="question-content">
                                    <span class="question-label">${label}</span>
                                    <div class="question-text">${formattedQuestion}</div>
                                </div>
                                ${inputHTML}
                            </div>`;
                        questionCounter++;
                    });
                } else {
                    // Câu hỏi đơn lẻ
                    const label = `Câu ${questionCounter}:`;
                    const stem = getStemText(item);
                    const formattedQuestion = formatQuestionText(stem);
                    const inputHTML = renderInputElement(item);
                    examHTML += `
                        <div class="question-container">
                            <div class="question-content">
                                <span class="question-label">${label}</span>
                                <div class="question-text">${formattedQuestion}</div>
                            </div>
                            ${inputHTML}
                        </div>`;
                    questionCounter++;
                }
            });
        });

        examQuestionsContainer.innerHTML = examHTML;
        if (window.MathJax) MathJax.typeset();

        // Load saved answers and apply to UI (interactive mode)
        studentAnswers = loadAnswersFromStorage();
        applySavedAnswersToUI();
        window.scrollTo(0, 0);

    } catch (error) {
        console.error(error);
        alert('Đã có lỗi xảy ra khi tải đề thi. Vui lòng thử lại.');
        examTitleHeader.textContent = 'Lỗi';
    }
}

// === MAIN CODE ===
console.log('Script loaded, adding DOMContentLoaded listener');
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM fully loaded, initializing...');
    // === Lấy các phần tử HTML ===
    console.log('Getting DOM elements...');
    const classSelectionScreen = document.getElementById('class-selection-screen');
    console.log('classSelectionScreen:', classSelectionScreen);
    const examSelectionScreen = document.getElementById('exam-selection-screen');
    const examScreen = document.getElementById('exam-screen');
    const resultsScreen = document.getElementById('results-screen');
    const classMenu = document.getElementById('class-menu');
    const examMenu = document.getElementById('exam-menu');
    const backToClassSelectionBtn = document.getElementById('back-to-class-selection');
    const examTitleHeader = document.getElementById('exam-title-header');
    const timerDisplay = document.getElementById('timer');
    const examQuestionsContainer = document.getElementById('exam-questions-container');
    const submitExamBtn = document.getElementById('submit-exam-btn');
    const resultsContainer = document.getElementById('results-container');
    const questionCheckboxContainer = document.getElementById('question-checkbox-container');
    const userQueryInput = document.getElementById('user-query-text');
    const getAIExplanationBtn = document.getElementById('get-ai-explanation-btn');
    const aiExplanationArea = document.getElementById('ai-explanation-area');
    const restartBtn = document.getElementById('restart-btn');

    // --- Tải dữ liệu manifest ---
    console.log('Starting to load manifest...');
    try {
        // Use a root-relative path
        const manifestUrl = 'data/exams-manifest.json';
        console.log('Fetching manifest from:', manifestUrl);

        // Try with CORS mode and proper headers
        const options = {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        console.log('Sending fetch request with options:', options);
        const response = await fetch(manifestUrl, options);

        console.log('Response status:', response.status, response.statusText);
        console.log('Response headers:', [...response.headers.entries()]);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response body:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        }

        const responseText = await response.text();
        console.log('Raw response text:', responseText);

        try {
            examManifest = JSON.parse(responseText);
        } catch (e) {
            console.error('Failed to parse JSON:', e);
            throw new Error('Invalid JSON in response');
        }
        console.log('Manifest loaded successfully');

        // Validate manifest structure
        if (!examManifest || !examManifest.grades) {
            throw new Error('Manifest is missing required grades data');
        }

        // Log available grades for debugging
        console.log('Available grades in manifest:', Object.keys(examManifest.grades));
    } catch (error) {
        console.error(error);
        document.body.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Lỗi nghiêm trọng: Không thể tải dữ liệu học liệu. Vui lòng kiểm tra lại cấu trúc file.</p>';
        return;
    }

    // === Router boot ===
    window.addEventListener('hashchange', renderRoute);
    if (!location.hash) {
        navigateTo('#/classes');
    } else {
        renderRoute();
    }

    // === Gán sự kiện ===
    console.log('Setting up event listeners...');
    console.log('classMenu element:', classMenu);

    if (!classMenu) {
        console.error('classMenu element not found!');
        return;
    }

    classMenu.addEventListener('click', (e) => {
        console.log('Class menu clicked', e.target);
        const target = e.target.closest('button[data-grade]');
        if (target) {
            const selectedGrade = target.dataset.grade;
            console.log('Selected grade:', selectedGrade);
            navigateTo(`#/exams/${selectedGrade}`);
        }
    });

    if (!backToClassSelectionBtn) {
        console.error('backToClassSelectionBtn not found!');
    } else {
        backToClassSelectionBtn.addEventListener('click', () => {
            console.log('Back button clicked');
            navigateTo('#/classes');
        });
    }

    // SỬA LỖI: Thay ExamBtn bằng submitExamBtn
    submitExamBtn.addEventListener('click', () => {
        console.log('Submit button clicked');
        if (!currentExamData) { 
            console.warn('No currentExamData. Did the exam load correctly?');
            alert('Chưa có dữ liệu bài làm để chấm. Vui lòng chọn đề và làm bài trước.');
            return;
        }
    
        // Render results (show lời giải mẫu) by sections
        let resultsHTML = '';
        const checkboxItems = [];
        const resSections = partitionIntoSections(currentExamData);
        let autoScorePoints = 0;
        let autoMaxPoints = 0;
        
        let questionCounter = 1;
        
        resSections.forEach(sec => {
            resultsHTML += `<h2 class="text-xl font-bold text-blue-700 mt-6 mb-3">${sec.title}</h2>`;
            sec.items.forEach((item) => {
                if (item.is_group && item.sub_questions) {
                    // Xử lý nhóm câu hỏi
                    const formattedGroupTitle = formatQuestionText(item.group_title || '');
                    resultsHTML += `
                        <div class="question-container result-item">
                            <div class="question-content">
                                <div class="question-text">${formattedGroupTitle}</div>
                            </div>
                            <div class="sub-questions-container">`;
    
                    item.sub_questions.forEach((sub, subIdx) => {
                        const currentQuestionNumber = questionCounter;
                        checkboxItems.push({ id: sub.q_id, label: `Câu ${currentQuestionNumber}` });
                        
                        // Format câu hỏi và đáp án
                        const formattedSubQuestion = formatQuestionText(getStemText(sub, item.type));
                        const formattedAnswer = formatAnswerText(sub.model_answer || 'Chưa có đáp án.');
                        const studentAns = getStudentAnswerDisplay(sub);
                        
                        // Auto-grading (interactive mode)
                        if (examMode === 'interactive') {
                            const subType = sub.type || item.type;
                            if (subType === 'multiple_choice') {
                                const expectedIdx = getExpectedMCIndex(sub, answersMap[sub.q_id] || sub.model_answer);
                                if (expectedIdx !== null && expectedIdx >= 0) {
                                    autoMaxPoints += 1;
                                    const stu = studentAnswers[sub.q_id];
                                    const stuIdx = (typeof stu === 'number') ? stu : indexFromLetter(stu);
                                    if (stuIdx === expectedIdx) autoScorePoints += 1;
                                }
                            } else if (subType === 'true_false') {
                                const expectedArr = getExpectedTFArray(sub, answersMap[sub.q_id] || sub.model_answer);
                                for (let i = 0; i < expectedArr.length; i++) {
                                    autoMaxPoints += 1;
                                    const st = studentAnswers[sub.q_id];
                                    const u = Array.isArray(st) ? st[i] : (st ? st[String.fromCharCode(97 + i)] : undefined);
                                    if (typeof expectedArr[i] === 'boolean' && typeof u === 'boolean' && u === expectedArr[i]) autoScorePoints += 1;
                                }
                            } else if (subType === 'short') {
                                const expected = getExpectedShortSpec(sub, answersMap[sub.q_id] || sub.model_answer);
                                if (expected) {
                                    autoMaxPoints += 1;
                                    const raw = studentAnswers[sub.q_id];
                                    const stuNum = normalizeNumberInput(raw);
                                    if (!isNaN(stuNum)) {
                                        const stuStr = stuNum.toFixed(expected.decimals);
                                        const expStr = expected.value.toFixed(expected.decimals);
                                        if (stuStr === expStr) autoScorePoints += 1;
                                    }
                                }
                            }
                            // short: không chấm tự động
                        }
                        
                        resultsHTML += `
                            <div class="sub-question-result">
                                <div class="question-content">
                                    <span class="question-label">Câu ${currentQuestionNumber}:</span>
                                    <div class="question-text">${formattedSubQuestion}</div>
                                </div>
                                ${studentAns}
                                <div class="model-answer-container">
                                    <span class="answer-label"><strong>Lời giải mẫu:</strong></span>
                                    <div class="answer-text">${formattedAnswer}</div>
                                </div>
                            </div>`;
                        questionCounter++;
                    });
                    resultsHTML += `</div></div>`;
    
                } else {
                    // Xử lý câu hỏi đơn
                    checkboxItems.push({ id: item.q_id, label: `Câu ${questionCounter}` });
                    
                    // Format câu hỏi và đáp án
                    const formattedQuestion = formatQuestionText(getStemText(item));
                    const formattedAnswer = formatAnswerText(item.model_answer || 'Chưa có đáp án.');
                    const studentAns = getStudentAnswerDisplay(item);
                    
                    // Auto-grading (interactive mode)
                    if (examMode === 'interactive') {
                        const itemType = item.type;
                        if (itemType === 'multiple_choice') {
                            const expectedIdx = getExpectedMCIndex(item, answersMap[item.q_id] || item.model_answer);
                            if (expectedIdx !== null && expectedIdx >= 0) {
                                autoMaxPoints += 1;
                                const stu = studentAnswers[item.q_id];
                                const stuIdx = (typeof stu === 'number') ? stu : indexFromLetter(stu);
                                if (stuIdx === expectedIdx) autoScorePoints += 1;
                            }
                        } else if (itemType === 'true_false') {
                            const expectedArr = getExpectedTFArray(item, answersMap[item.q_id] || item.model_answer);
                            for (let i = 0; i < expectedArr.length; i++) {
                                autoMaxPoints += 1;
                                const st = studentAnswers[item.q_id];
                                const u = Array.isArray(st) ? st[i] : (st ? st[String.fromCharCode(97 + i)] : undefined);
                                if (typeof expectedArr[i] === 'boolean' && typeof u === 'boolean' && u === expectedArr[i]) autoScorePoints += 1;
                            }
                        } else if (itemType === 'short') {
                            const expected = getExpectedShortSpec(item, answersMap[item.q_id] || item.model_answer);
                            if (expected) {
                                autoMaxPoints += 1;
                                const raw = studentAnswers[item.q_id];
                                const stuNum = normalizeNumberInput(raw);
                                if (!isNaN(stuNum)) {
                                    const stuStr = stuNum.toFixed(expected.decimals);
                                    const expStr = expected.value.toFixed(expected.decimals);
                                    if (stuStr === expStr) autoScorePoints += 1;
                                }
                            }
                        }
                    }
                    
                    resultsHTML += `
                        <div class="question-container result-item">
                            <div class="question-content">
                                <span class="question-label">Câu ${questionCounter}:</span>
                                <div class="question-text">${formattedQuestion}</div>
                            </div>
                            ${studentAns}
                            <div class="model-answer-container">
                                <div class="answer-text">${formattedAnswer}</div>
                            </div>
                        </div>`;
                    questionCounter++;
                }
            });
        });
    
        // Prepend auto-grading summary (interactive mode)
        if (examMode === 'interactive') {
            const percent = autoMaxPoints > 0 ? Math.round(100 * autoScorePoints / autoMaxPoints) : 0;
            const summaryHTML = `
                <div class="bg-blue-50 border-l-4 border-blue-400 rounded p-4 mb-6">
                    <div class="font-bold text-blue-800">Kết quả chấm tự động</div>
                    <div class="text-blue-700 mt-1">Điểm: ${autoScorePoints} / ${autoMaxPoints} (${percent}%)</div>
                    <div class="text-gray-600 text-sm">Gồm phần trắc nghiệm, đúng/sai và tự luận dạng số (chấp nhận dấu phẩy thập phân, so sánh theo số chữ số thập phân trong đáp án mẫu).</div>
                </div>`;
            resultsHTML = summaryHTML + resultsHTML;
        }

        // Inject results
        if (resultsContainer) {
            resultsContainer.innerHTML = resultsHTML || '<p class="text-gray-500">Chưa có dữ liệu kết quả để hiển thị.</p>';
            // Re-typeset MathJax for LaTeX in answers
            if (window.MathJax && typeof MathJax.typeset === 'function') {
                try { MathJax.typeset(); } catch (e) { console.warn('MathJax typeset error:', e); }
            }
        }
    
        // Populate checkbox list for AI questions
        if (questionCheckboxContainer) {
            questionCheckboxContainer.innerHTML = checkboxItems.map(item => `
                <div class="question-checkbox-item">
                    <input type="checkbox" id="cb_${item.id}" value="${item.id}" />
                    <label for="cb_${item.id}">${item.label}</label>
                </div>
            `).join('');
        }
    
        // Điều hướng sang trang kết quả (router sẽ hiển thị results screen)
        navigateTo('#/results');
        window.scrollTo(0, 0);
    });

    restartBtn.addEventListener('click', () => {
        console.log('Restart button clicked');
        // Clear previous results and selections
        if (resultsContainer) resultsContainer.innerHTML = '';
        if (questionCheckboxContainer) questionCheckboxContainer.innerHTML = '';
        const aiArea = document.getElementById('ai-explanation-area');
        if (aiArea) {
            aiArea.classList.add('hidden');
            aiArea.textContent = '';
        }
        const queryTextEl = document.getElementById('user-query-text');
        if (queryTextEl) queryTextEl.value = '';

        // Reset state
        try {
            const key = getExamStorageKey();
            if (key) localStorage.removeItem(key);
        } catch (e) { console.warn('Không thể xóa bài làm đã lưu:', e); }
        currentExamData = null;
        studentAnswers = {};
        window.scrollTo(0, 0);
        navigateTo('#/classes');
    });

    // Đồng bộ đổi chế độ đề lên URL khi đang ở route exam
    const modeSel = document.getElementById('exam-mode-select');
    if (modeSel) {
        modeSel.addEventListener('change', () => {
            const { segments, params } = parseHash();
            if (segments[0] === 'exam' && params.path) {
                navigateTo(`#/exam?path=${encodeURIComponent(params.path)}&mode=${encodeURIComponent(modeSel.value)}`);
            }
        });
    }

    // === AI explanation button ===
    if (getAIExplanationBtn) {
        getAIExplanationBtn.addEventListener('click', () => {
            console.log('AI button clicked');
            const aiArea = document.getElementById('ai-explanation-area');
            const queryTextEl = document.getElementById('user-query-text');
            const selectedCbs = document.querySelectorAll('#question-checkbox-container input[type="checkbox"]:checked');

            const selected = Array.from(selectedCbs).map(cb => ({
                id: cb.value,
                label: (cb.nextElementSibling && cb.nextElementSibling.textContent) ? cb.nextElementSibling.textContent.trim() : cb.value
            }));

            const extra = queryTextEl ? queryTextEl.value.trim() : '';

            if (!selected.length) {
                alert('Vui lòng chọn ít nhất một câu hỏi để hỏi AI.');
                return;
            }

            // Placeholder response (you can replace with real API call)
            const summaryList = selected.map(s => `• ${s.label}`).join('\n');
            const promptEcho = extra ? `\n\nGhi chú của bạn: ${extra}` : '';
            const response = `Bạn đã yêu cầu AI giải thích các câu:\n${summaryList}${promptEcho}\n\n(Phản hồi mẫu) AI sẽ phân tích và giải thích chi tiết cho các câu đã chọn.`;

            if (aiArea) {
                aiArea.classList.remove('hidden');
                aiArea.textContent = response;
            }
        });
    }

    // 1. Timer countdown (nếu có chức năng hẹn giờ)
    function startTimer(duration) {
        let timer = duration, minutes, seconds;
        timerInterval = setInterval(function () {
            minutes = parseInt(timer / 60, 10);
            seconds = parseInt(timer % 60, 10);

            minutes = minutes < 10 ? "0" + minutes : minutes;
            seconds = seconds < 10 ? "0" + seconds : seconds;

            timerDisplay.textContent = minutes + ":" + seconds;

            if (--timer < 0) {
                clearInterval(timerInterval);
                // Tự động nộp bài khi hết giờ
                submitExamBtn.click();
            }
        }, 1000);
    }

    // 2. Xử lý input cho học sinh nhập đáp án (nếu có)
    function setupAnswerInputs() {
        // Thêm input cho học sinh nhập câu trả lời
        const answerInputs = document.querySelectorAll('.answer-input');
        answerInputs.forEach(input => {
            input.addEventListener('input', function (e) {
                // Lưu câu trả lời vào currentExamData
                const questionId = this.dataset.questionId;
                // ... logic xử lý
            });
        });
    }

    // 3. Keyboard shortcuts
    document.addEventListener('keydown', function (e) {
        // Ví dụ: Ctrl + Enter để nộp bài
        if (e.ctrlKey && e.key === 'Enter') {
            submitExamBtn.click();
        }
    });

    // 4. Xử lý resize window để responsive tốt hơn
    window.addEventListener('resize', function () {
        // Điều chỉnh layout nếu cần
    });

    // 5. Xử lý beforeunload để cảnh báo khi rời trang
    window.addEventListener('beforeunload', function (e) {
        if (currentExamData && examScreen && !examScreen.classList.contains('hidden')) {
            e.preventDefault();
            e.returnValue = 'Bạn có chắc muốn rời đi? Bài làm của bạn có thể bị mất.';
            return 'Bạn có chắc muốn rời đi? Bài làm của bạn có thể bị mất.';
        }
    });
});