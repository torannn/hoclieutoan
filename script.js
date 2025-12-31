    // Debug flag - set to true for verbose logging
    const DEBUG = false;
    const debugLog = (...args) => { if (DEBUG) console.log(...args); };

    // Toast helpers
    const Toast = window.Swal ? Swal.mixin({ toast: true, position: 'top-end', timer: 1600, showConfirmButton: false, timerProgressBar: true }) : null;
    const toastSuccess = (msg)=>{ if(Toast) Toast.fire({ icon:'success', title: msg }); };
    const toastInfo = (msg)=>{ if(Toast) Toast.fire({ icon:'info', title: msg }); };
    const toastError = (msg)=>{ if(Toast) Toast.fire({ icon:'error', title: msg }); };
// === GLOBAL VARIABLES ===
let examManifest; // Biến lưu trữ toàn bộ manifest - MUST BE GLOBAL
window.examManifest = null; // Also expose on window for v3.html access
let timerInterval;
let currentExamData;
window.currentExamData = null; // Expose for features.js
let studentAnswers = {}; // Lưu trữ câu trả lời của học sinh
window.studentAnswers = studentAnswers; // Expose for features.js
let examMode = 'static'; // 'static' | 'interactive'
let answersMap = {}; // Lưu toàn bộ answers.json để chấm điểm
window.answersMap = answersMap; // Expose for features.js
let currentExamKey = ''; // Khóa lưu bài làm theo từng đề (dựa theo path)
let attemptStartAtMs = null;
let currentExamMeta = null;
let guestMode = false;
let questionIndexMap = [];
let currentQuestionIdx = 1;

// Global mode toggle initializer for exam selection (supports fancy checkbox markup)
window.initExamModeToggle = function(){
    try{
        const track = document.getElementById('exam-mode-toggle');
        const sel = document.getElementById('exam-mode-select');
        const lblStaticEl = document.getElementById('lbl-static');
        const lblInteractiveEl = document.getElementById('lbl-interactive');
        if(!track || !sel) return;
        const checkbox = track.querySelector('input.toggle-checkbox');
        const knob = track.querySelector('.toggle-button');
        const apply = ()=>{
            const mode = sel.value;
            if(checkbox) checkbox.checked = (mode === 'interactive');
            if(knob){ /* knob position handled by CSS via :checked */ }
            if(lblStaticEl && lblInteractiveEl){
                if(mode==='interactive'){
                    lblStaticEl.classList.remove('text-gray-700'); lblStaticEl.classList.add('text-gray-400');
                    lblInteractiveEl.classList.remove('text-gray-400'); lblInteractiveEl.classList.add('text-gray-700');
                }else{
                    lblStaticEl.classList.remove('text-gray-400'); lblStaticEl.classList.add('text-gray-700');
                    lblInteractiveEl.classList.remove('text-gray-700'); lblInteractiveEl.classList.add('text-gray-400');
                }
            }
        };
        apply();
        const canInteractive = ()=>{ const u = (window.Auth && Auth.getUser)? Auth.getUser(): null; return !!u && !guestMode; };
        const toggle = ()=>{
            if(sel.value==='static'){
                if(!canInteractive()){ if(window.Swal) Swal.fire({icon:'info', title:'Chỉ dành cho tài khoản đăng nhập', timer:1500, showConfirmButton:false}); return; }
                sel.value='interactive';
            }else{
                sel.value='static';
            }
            apply();
        };
        if(checkbox){ checkbox.onchange = ()=>{ if(checkbox.checked){ if(!canInteractive()){ checkbox.checked=false; if(window.Swal) Swal.fire({icon:'info', title:'Chỉ dành cho tài khoản đăng nhập', timer:1500, showConfirmButton:false}); return; } sel.value='interactive'; } else { sel.value='static'; } apply(); }; }
        track.addEventListener('click', (e)=>{ if(e.target===track) toggle(); });
        if(lblStaticEl) lblStaticEl.onclick = ()=>{ sel.value='static'; apply(); };
        if(lblInteractiveEl) lblInteractiveEl.onclick = ()=>{ if(!canInteractive()){ if(window.Swal) Swal.fire({icon:'info', title:'Chỉ dành cho tài khoản đăng nhập', timer:1500, showConfirmButton:false}); return; } sel.value='interactive'; apply(); };
    }catch(e){ console.warn('initExamModeToggle failed', e); }
};

// === HELPER FUNCTIONS ===
 

// Prefer in-question expected for MC; fallback to answers text
function getExpectedMCIndex(question, answerText) {
    if (typeof question.correct_index === 'number') return question.correct_index;
    const letter = extractCorrectMC(answerText);
    if (letter) return indexFromLetter(letter);
    return null;
}

// === Question Palette (Sidebar + Mobile Drawer) ===
function buildQuestionPalette(total){
    try{
        const grid = document.getElementById('question-palette-nodes');
        const gridM = document.getElementById('question-palette-nodes-mobile');
        const totEl = document.getElementById('qp-total');
        const totElM = document.getElementById('qp-total-mobile');
        if(totEl) totEl.textContent = String(total||0);
        if(totElM) totElM.textContent = String(total||0);
        const makeNodes = (container)=>{
            if(!container) return;
            container.innerHTML = Array.from({length: total}, (_,i)=>{
                const n = i+1;
                return `<button data-qp-idx="${n}" class="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 text-sm flex items-center justify-center hover:scale-105 transition"></button>`;
            }).join('');
            container.querySelectorAll('[data-qp-idx]').forEach(btn=>{
                btn.textContent = btn.getAttribute('data-qp-idx');
                btn.addEventListener('click', ()=>{
                    const idx = parseInt(btn.getAttribute('data-qp-idx'),10) || 1;
                    scrollToQuestion(idx);
                    const drawer = document.getElementById('palette-drawer');
                    if(drawer) drawer.classList.add('hidden');
                });
            });
        };
        makeNodes(grid); makeNodes(gridM);
    }catch(e){ console.warn('buildQuestionPalette failed', e); }
}

function isAnswered(qid){
    const v = studentAnswers[qid];
    if(v === undefined || v === null) return false;
    if(typeof v === 'string') return v.trim().length>0;
    if(typeof v === 'number') return true;
    if(Array.isArray(v)) return v.some(x=>x===true || x===false);
    if(typeof v === 'object') return Object.values(v).some(x=>x===true || x===false || (typeof x==='string' && x.trim()));
    return false;
}

function updateQuestionPalette(){
    try{
        const total = questionIndexMap.length;
        let answered = 0;
        questionIndexMap.forEach(m=>{ if(isAnswered(m.qid)) answered++; });
        const ansEl = document.getElementById('qp-answered');
        const ansElM = document.getElementById('qp-answered-mobile');
        if(ansEl) ansEl.textContent = String(answered);
        if(ansElM) ansElM.textContent = String(answered);
        const grid = document.getElementById('question-palette-nodes');
        const gridM = document.getElementById('question-palette-nodes-mobile');
        const apply = (container)=>{
            if(!container) return;
            container.querySelectorAll('[data-qp-idx]').forEach(btn=>{
                const idx = parseInt(btn.getAttribute('data-qp-idx'),10);
                const map = questionIndexMap.find(m=>m.idx===idx);
                const done = map ? isAnswered(map.qid) : false;
                btn.classList.remove('bg-slate-100','text-slate-600','bg-blue-600','text-white','ring-2','ring-blue-400');
                if(done){ btn.classList.add('bg-blue-600','text-white'); }
                else{ btn.classList.add('bg-slate-100','text-slate-600'); }
                if(currentQuestionIdx === idx){ btn.classList.add('ring-2','ring-blue-400'); }
            });
        };
        apply(grid); apply(gridM);
    }catch(e){ console.warn('updateQuestionPalette failed', e); }
}

function scrollToQuestion(idx){
    currentQuestionIdx = idx;
    try{
        const el = document.getElementById(`q-${idx}`);
        if(el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        updateQuestionPalette();
    }catch(e){ console.warn('scrollToQuestion failed', e); }
}

function setupQuestionObserver(){
    try{
        const items = Array.from(document.querySelectorAll('#exam-questions-container .question-container'));
        const io = new IntersectionObserver((entries)=>{
            entries.forEach(ent=>{
                if(ent.isIntersecting){
                    const id = ent.target.getAttribute('id');
                    if(id && id.startsWith('q-')){
                        currentQuestionIdx = parseInt(id.slice(2),10) || currentQuestionIdx;
                        updateQuestionPalette();
                    }
                }
            });
        }, { root: null, threshold: 0.3 });
        items.forEach(it=> io.observe(it));
    }catch(e){ console.warn('setupQuestionObserver failed', e); }
}

function setupPaletteMobile(){
    try{
        const fab = document.getElementById('palette-fab');
        const drawer = document.getElementById('palette-drawer');
        const closeBtn = document.getElementById('palette-drawer-close');
        const backdrop = document.getElementById('palette-drawer-backdrop');
        const open = ()=>{ if(drawer) drawer.classList.remove('hidden'); };
        const close = ()=>{ if(drawer) drawer.classList.add('hidden'); };
        if(fab) fab.onclick = open;
        if(closeBtn) closeBtn.onclick = close;
        if(backdrop) backdrop.onclick = close;
    }catch(e){ console.warn('setupPaletteMobile failed', e); }
}

/**
 * Build results question palette with color-coded buttons
 * Green = correct, Red = wrong, Gray = skipped
 * Also auto-bookmarks wrong/skipped questions
 */
function buildResultsQuestionPalette(checkboxItems) {
    const palette = document.getElementById('results-question-palette');
    if (!palette || !currentExamData) return;
    
    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;
    
    // Flatten all questions
    const allQuestions = [];
    const sections = partitionIntoSections(currentExamData);
    sections.forEach(sec => {
        sec.items.forEach(item => {
            if (item.is_group && item.sub_questions) {
                item.sub_questions.forEach(sub => allQuestions.push({ ...sub, parentType: item.type }));
            } else {
                allQuestions.push(item);
            }
        });
    });
    
    let html = '';
    allQuestions.forEach((q, idx) => {
        const qId = q.q_id;
        const userAnswer = studentAnswers[qId];
        const qType = q.type || q.parentType || 'multiple_choice';
        
        // Determine if correct, wrong, or skipped
        let status = 'skipped'; // default
        let isCorrect = false;
        let isSkipped = userAnswer === undefined || userAnswer === null;

        if (!isSkipped && qType !== 'essay') {
            if (qType === 'multiple_choice') {
                const expectedIdx = getExpectedMCIndex(q, answersMap[qId] || q.model_answer);
                const userIdx = typeof userAnswer === 'number' ? userAnswer : indexFromLetter(userAnswer);
                isCorrect = expectedIdx !== null && userIdx === expectedIdx;
            } else if (qType === 'true_false') {
                // For TF, check if all parts are correct
                const expectedArr = getExpectedTFArray(q, answersMap[qId] || q.model_answer);
                let allCorrect = true;
                for (let i = 0; i < expectedArr.length; i++) {
                    const u = Array.isArray(userAnswer) ? userAnswer[i] : (userAnswer ? userAnswer[String.fromCharCode(97 + i)] : undefined);
                    if (u === undefined || u !== expectedArr[i]) { allCorrect = false; break; }
                }
                isCorrect = allCorrect && expectedArr.length > 0;
            } else if (qType === 'short') {
                const expected = getExpectedShortSpec(q, answersMap[qId] || q.model_answer);
                if (expected) {
                    const stuNum = normalizeNumberInput(userAnswer);
                    if (!isNaN(stuNum)) {
                        const stuStr = stuNum.toFixed(expected.decimals);
                        const expStr = expected.value.toFixed(expected.decimals);
                        isCorrect = stuStr === expStr;
                    }
                }
            }
            status = isCorrect ? 'correct' : 'wrong';
        } else if (qType === 'essay') {
            // Essay: always treated as skipped in palette (no auto-grading)
            isSkipped = true;
            status = 'skipped';
        }
        
        // Count
        if (status === 'correct') correctCount++;
        else if (status === 'wrong') wrongCount++;
        else skippedCount++;
        
        // Auto-bookmark wrong and skipped questions
        if ((status === 'wrong' || status === 'skipped') && window.BookmarkManager) {
            try {
                const questionData = {
                    questionId: qId,
                    examPath: currentExamMeta?.path || '',
                    examTitle: currentExamMeta?.title || 'Đề kiểm tra',
                    questionIndex: idx,
                    questionText: q.stem || q.question || `Câu ${idx + 1}`,
                    options: (q.options || []).map((opt, i) => ({
                        label: String.fromCharCode(65 + i),
                        text: typeof opt === 'string' ? opt : opt.text || ''
                    })),
                    correctAnswer: q.correct_index !== undefined ? String.fromCharCode(65 + q.correct_index) : null,
                    userAnswer: userAnswer,
                    isCorrect: isCorrect,
                    isSkipped: isSkipped,
                    modelAnswer: answersMap[qId] || q.model_answer || '',
                    type: qType
                };
                BookmarkManager.add(questionData);
            } catch (e) { console.warn('Auto-bookmark failed:', e); }
        }
        
        // Color classes
        const colorClass = status === 'correct' ? 'bg-emerald-500 text-white' 
                         : status === 'wrong' ? 'bg-red-500 text-white' 
                         : 'bg-slate-400 text-white';
        
        html += `<button class="w-8 h-8 rounded-lg text-xs font-medium ${colorClass} hover:opacity-80 transition" 
                         data-q="${idx}" onclick="document.querySelector('.result-item:nth-child(${idx + 1}), #results-container > div:nth-child(${idx + 2})')?.scrollIntoView({behavior:'smooth', block:'center'})">${idx + 1}</button>`;
    });
    
    palette.innerHTML = html;
    
    // Update counts in UI
    try {
        const correctEl = document.getElementById('result-correct-count');
        const wrongEl = document.getElementById('result-wrong-count');
        const skippedEl = document.getElementById('result-skipped-count');
        if (correctEl) correctEl.textContent = correctCount;
        if (wrongEl) wrongEl.textContent = wrongCount;
        if (skippedEl) skippedEl.textContent = skippedCount;
    } catch (e) {}
    
    debugLog(`📊 Results: ${correctCount} correct, ${wrongCount} wrong, ${skippedCount} skipped`);
}

function buildAttemptRecord(autoScorePoints, autoMaxPoints) {
    const now = Date.now();
    const started = attemptStartAtMs || now;
    const spent = Math.max(0, Math.floor((now - started) / 1000));
    const details = [];
    const typeStats = { multiple_choice: { correct: 0, incorrect: 0 }, true_false: { correct: 0, incorrect: 0 }, short: { correct: 0, incorrect: 0 }, essay: { correct: 0, incorrect: 0 } };
    function pushItem(q, parentType) {
        const t = q.type || parentType || '';
        const ansText = answersMap[q.q_id] || q.model_answer || '';
        let correct = null;
        let user = studentAnswers[q.q_id];
        let expectedRepr = '';
        let userRepr = '';
        if (t === 'multiple_choice') {
            const expIdx = getExpectedMCIndex(q, ansText);
            const uIdx = (typeof user === 'number') ? user : indexFromLetter(user);
            const expLetter = (expIdx !== null && expIdx >= 0) ? letterFromIndex(expIdx) : '';
            const uLetter = (uIdx !== null && uIdx >= 0) ? letterFromIndex(uIdx) : '';
            expectedRepr = expLetter;
            userRepr = uLetter;
            if (expIdx !== null && expIdx >= 0 && uIdx !== null && uIdx >= 0) correct = (uIdx === expIdx);
            if (correct === true) typeStats.multiple_choice.correct++; else typeStats.multiple_choice.incorrect++;
        } else if (t === 'true_false') {
            const parsed = getTFParsed(q);
            const expArr = getExpectedTFArray(q, ansText);
            let total = parsed.items.length;
            let got = 0;
            const ur = [];
            for (let i = 0; i < total; i++) {
                const u = Array.isArray(user) ? user[i] : (user ? user[String.fromCharCode(97 + i)] : undefined);
                if (typeof expArr[i] === 'boolean' && typeof u === 'boolean' && u === expArr[i]) got++;
                ur.push(typeof u === 'boolean' ? (u ? 'Đ' : 'S') : '-');
            }
            correct = (got === total && total > 0);
            expectedRepr = expArr.map(v => (typeof v === 'boolean' ? (v ? 'Đ' : 'S') : '-')).join('');
            userRepr = ur.join('');
            if (correct === true) typeStats.true_false.correct++; else typeStats.true_false.incorrect++;
        } else if (t === 'short') {
            const exp = getExpectedShortSpec(q, ansText);
            let ok = null;
            if (exp) {
                const num = normalizeNumberInput(String(user || ''));
                if (!isNaN(num)) {
                    const s1 = num.toFixed(exp.decimals);
                    const s2 = exp.value.toFixed(exp.decimals);
                    ok = (s1 === s2);
                    expectedRepr = s2.replace('.', ',');
                    userRepr = s1.replace('.', ',');
                }
            }
            correct = ok === true;
            if (correct === true) typeStats.short.correct++; else typeStats.short.incorrect++;
        } else if (t === 'essay') {
            // Essay questions are not auto-graded; treat as null correctness
            correct = null;
            typeStats.essay.incorrect++;
        }
        details.push({ q_id: q.q_id, type: t, section: q.section || '', correct, user_answer: userRepr, expected: expectedRepr });
    }
    const questions = currentExamData && Array.isArray(currentExamData.questions) ? currentExamData.questions : [];
    for (const q of questions) {
        if (q && q.is_group && Array.isArray(q.sub_questions)) {
            for (const sub of q.sub_questions) pushItem(sub, q.type);
        } else if (q) {
            pushItem(q, null);
        }
    }
    const percent = autoMaxPoints > 0 ? Math.round(100 * autoScorePoints / autoMaxPoints) : 0;
    const attempt = {
        version: 1,
        startedAt: started,
        submittedAt: now,
        timeSpentSec: spent,
        mode: examMode,
        durationSec: currentExamData && currentExamData.duration ? currentExamData.duration : null,
        exam: currentExamMeta || { title: (currentExamData && currentExamData.title) || '', path: '', type: 'exam', mode: examMode },
        autoScore: { points: autoScorePoints, max: autoMaxPoints, percent },
        typeStats,
        items: details
    };
    return attempt;
}

async function loadJSONL(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Không thể tải ${url} (${res.status})`);
    const text = await res.text();
    const lines = text.split(/\r?\n/);
    const items = [];
    for (const ln of lines) {
        const t = ln.trim();
        if (!t) continue;
        try { items.push(JSON.parse(t)); } catch (e) {}
    }
    return items;
}

function isLogicItem(it) {
    const ms = Array.isArray(it.measures) ? it.measures : [];
    return ms.some(m => /^G10-SET-TASK-02/.test(String(m)));
}

function isSetsItem(it) {
    const ms = Array.isArray(it.measures) ? it.measures : [];
    return ms.some(m => /^G10-SET-TASK-01/.test(String(m)));
}

function hasCorrectness(it) {
    if (it.type === 'mc') {
        return Number.isInteger(it.answer_index) && Array.isArray(it.options) && it.answer_index >= 0 && it.answer_index < it.options.length;
    }
    if (it.type === 'tf') {
        return Array.isArray(it.statements) && it.statements.length > 0 && Array.isArray(it.answers) && it.answers.length === it.statements.length && it.answers.every(v => typeof v === 'boolean');
    }
    if (it.type === 'short') {
        if (typeof it.final_answer !== 'string') return false;
        return /-?\d+(?:[\.,]\d+)?/.test(it.final_answer);
    }
    return false;
}

function toExamQuestion(it, idPrefix) {
    const q = { q_id: `${idPrefix}-${Math.random().toString(36).slice(2, 10)}` };
    if (it.type === 'mc') {
        q.type = 'multiple_choice';
        q.stem = it.stem || '';
        q.options = Array.isArray(it.options) ? it.options.slice(0, 4) : [];
        q.correct_index = it.answer_index;
        q.section = 'Phần 1. Trắc nghiệm nhiều lựa chọn';
        if (Number.isInteger(it.answer_index)) {
            const letter = letterFromIndex(it.answer_index);
            q.model_answer = `Đáp án đúng: ${letter}`;
        } else {
            q.model_answer = 'Chưa có đáp án.';
        }
        return q;
    }
    if (it.type === 'tf') {
        q.type = 'true_false';
        q.stem = it.stem || '';
        q.statements = Array.isArray(it.statements) ? it.statements.slice() : [];
        q.correct_values = Array.isArray(it.answers) ? it.answers.slice(0, q.statements.length) : [];
        q.section = 'Phần 2. Trắc nghiệm đúng sai';
        if (Array.isArray(q.statements) && Array.isArray(q.correct_values) && q.correct_values.length === q.statements.length) {
            const parts = q.correct_values.map((v, i) => `${String.fromCharCode(97 + i)}) ${v ? 'Đúng' : 'Sai'}`);
            q.model_answer = parts.join('\n');
        } else {
            q.model_answer = 'Chưa có đáp án.';
        }
        return q;
    }
    if (it.type === 'short') {
        q.type = 'short';
        q.stem = it.stem || '';
        q.final_answer = it.final_answer;
        q.section = 'Phần 3. Tự luận trả lời ngắn';
        if (typeof it.final_answer === 'string' && it.final_answer.trim()) {
            q.model_answer = `Đáp số: ${it.final_answer}`;
        } else {
            q.model_answer = 'Chưa có đáp án.';
        }
        return q;
    }
    return null;
}

function shuffleInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

function pickWithCoverage(poolQuestions, n) {
    const mc = poolQuestions.filter(q => q && q.type === 'multiple_choice');
    const tf = poolQuestions.filter(q => q && q.type === 'true_false');
    const sh = poolQuestions.filter(q => q && q.type === 'short');
    shuffleInPlace(mc); shuffleInPlace(tf); shuffleInPlace(sh);
    const out = [];
    if (tf.length) out.push(tf[0]);
    if (sh.length) out.push(sh[0]);
    const combined = [...mc, ...tf.slice(1), ...sh.slice(1)];
    shuffleInPlace(combined);
    for (const q of combined) { if (out.length >= n) break; if (!out.includes(q)) out.push(q); }
    if (out.length < n) {
        const all = [...mc, ...tf, ...sh];
        shuffleInPlace(all);
        for (const q of all) { if (out.length >= n) break; if (!out.includes(q)) out.push(q); }
    }
    return out.slice(0, n);
}

async function startRandomExamForGrade(grade) {
    const examTitleHeader = document.getElementById('exam-title-header');
    const examQuestionsContainer = document.getElementById('exam-questions-container');
    const examScreen = document.getElementById('exam-screen');
    examTitleHeader.textContent = 'Đang tạo: Luyện đề ngẫu nhiên...';
    const urls = [
        'bank/g10/sets/import/chuyen-de-menh-de-va-tap-hop-toan-10.items.jsonl',
        'bank/g10/sets/import/phan-dang-va-bai-tap-menh-de-va-tap-hop.items.jsonl'
    ];
    const allItems = [];
    for (const u of urls) {
        try { const arr = await loadJSONL(u); allItems.push(...arr); } catch (e) { console.warn('Load failed', u, e); }
    }
    const logicPool = allItems.filter(it => (it && hasCorrectness(it) && isLogicItem(it)));
    const setsPool = allItems.filter(it => (it && hasCorrectness(it) && isSetsItem(it)));
    const logicQs = pickWithCoverage(logicPool.map(it => toExamQuestion(it, 'L')), 10);
    const setsQs = pickWithCoverage(setsPool.map(it => toExamQuestion(it, 'S')), 10);
    const questions = [...logicQs, ...setsQs].filter(Boolean);
    const sectionOrder = {
        'Phần 1. Trắc nghiệm nhiều lựa chọn': 1,
        'Phần 2. Trắc nghiệm đúng sai': 2,
        'Phần 3. Tự luận trả lời ngắn': 3,
    };
    questions.sort((a, b) => (sectionOrder[a.section] || 99) - (sectionOrder[b.section] || 99));
    const examContent = { title: `Luyện đề ngẫu nhiên Lớp ${grade}`, questions };
    const answersContent = {};
    for (const q of questions) {
        if (q && q.q_id) answersContent[q.q_id] = q.model_answer || '';
    }
    currentExamData = examContent;
    window.currentExamData = currentExamData; // Sync to window
    answersMap = answersContent;
    window.answersMap = answersMap; // Sync to window for features.js
    const modeSel = document.getElementById('exam-mode-select');
    examMode = modeSel ? modeSel.value : 'static';
    const finalTitle = examContent.title || 'Luyện đề ngẫu nhiên';
    examTitleHeader.textContent = finalTitle;
    currentExamMeta = { title: finalTitle, path: `random:grade:${grade}`, type: 'random', grade: String(grade), mode: examMode };
    attemptStartAtMs = Date.now();
    let examHTML = '';
    const sections = partitionIntoSections(currentExamData);
    let questionCounter = 1;
    sections.forEach(sec => {
        examHTML += `<h2 class="text-xl font-bold text-blue-700 mt-6 mb-3">${sec.title}</h2>`;
        sec.items.forEach((item) => {
            if (item.is_group && item.sub_questions) {
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
    if (window.MathJax) { MathJax.typesetPromise([examQuestionsContainer]).catch((err) => console.log('MathJax Typeset Error: ' + err.message)); }
    studentAnswers = loadAnswersFromStorage();
    window.studentAnswers = studentAnswers; // Sync to window
    applySavedAnswersToUI();
    window.scrollTo(0, 0);
    try { if (timerInterval) clearInterval(timerInterval); } catch (e) {}
    examScreen && examScreen.classList.remove('hidden');
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
    const h = (location.hash || '#/auth').slice(1);
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
    const historyScreen = document.getElementById('history-screen');
    const adminSummaryScreen = document.getElementById('admin-summary-screen');
    const authScreen = document.getElementById('auth-screen');
    const profileScreen = document.getElementById('profile-screen');
    const customizeScreen = document.getElementById('customize-screen');
    const dashboardScreen = document.getElementById('dashboard-screen');
    const siteHeader = document.getElementById('site-header');

    [classSelectionScreen, examSelectionScreen, examScreen, resultsScreen, historyScreen, adminSummaryScreen, authScreen, profileScreen, customizeScreen, dashboardScreen].forEach(el => el && el.classList.add('hidden'));
    if(siteHeader) siteHeader.classList.remove('hidden');

    const getUser = ()=> (window.Auth && Auth.getUser ? Auth.getUser() : null);
    const isLoggedIn = ()=> !!getUser();
    const isGuest = ()=> guestMode === true;
    // Redirect to auth if not logged in and not guest
    if ((!segments.length || segments[0] === 'classes' || segments[0] === 'exams' || segments[0] === 'exam') && !isLoggedIn() && !isGuest()){
        navigateTo('#/auth');
        return;
    }

    if (segments.length === 0 || segments[0] === 'classes') {
        classSelectionScreen && classSelectionScreen.classList.remove('hidden');
        return;
    }

    if (segments[0] === 'exams' && segments[1]) {
        const selectedGrade = segments[1];
        try { populateExamMenu(selectedGrade); } catch (e) { console.warn('populateExamMenu failed:', e); }
        // Enforce guest/static-only
        const modeSel = document.getElementById('exam-mode-select');
        if(modeSel){
            const u = getUser();
            const interactiveOpt = Array.from(modeSel.options || []).find(o=>o.value==='interactive');
            if(!u || isGuest()){
                if(interactiveOpt) interactiveOpt.disabled = true;
                modeSel.value = 'static';
            }else{
                if(interactiveOpt) interactiveOpt.disabled = false;
            }
        }
        examSelectionScreen && examSelectionScreen.classList.remove('hidden');
        return;
    }

    if (segments[0] === 'exam') {
        const path = params.path || '';
        let mode = params.mode || 'static';
        const modeSel = document.getElementById('exam-mode-select');
        if (modeSel) modeSel.value = mode;
        // Enforce guest/static-only
        const u = getUser();
        const guest = (guestMode === true);
        if((!u || guest) && mode === 'interactive'){
            mode = 'static';
            if (modeSel) modeSel.value = 'static';
        }
        // Hide global header during exam
        if(siteHeader) siteHeader.classList.add('hidden');
        const gradeParam = params.grade || '10';
        if (params.random === '1') {
            await startRandomExamForGrade(gradeParam);
        } else if (path) {
            let examTitle = '(đang tải)';
            try {
                const allGrades = examManifest && examManifest.grades ? Object.values(examManifest.grades) : [];
                for (const g of allGrades) {
                    const found = (g.exams || []).find(it => it.path === path);
                    if (found) { examTitle = found.title || examTitle; break; }
                }
            } catch (e) {}
            await startExam({ title: examTitle, path, type: 'exam' });
        }
        examScreen && examScreen.classList.remove('hidden');
        return;
    }

    if (segments[0] === 'results') {
        resultsScreen && resultsScreen.classList.remove('hidden');
        return;
    }

    if (segments[0] === 'history') {
        const fn = window.renderHistoryPage;
        try { if (typeof fn === 'function') await fn(); } catch (e) { console.warn('renderHistoryPage failed', e); }
        historyScreen && historyScreen.classList.remove('hidden');
        return;
    }

    if (segments[0] === 'admin') {
        const fn = window.renderAdminPage;
        try { if (typeof fn === 'function') await fn(); } catch (e) { console.warn('renderAdminPage failed', e); }
        adminSummaryScreen && adminSummaryScreen.classList.remove('hidden');
        return;
    }

    if (segments[0] === 'auth') {
        authScreen && authScreen.classList.remove('hidden');
        return;
    }

    if (segments[0] === 'profile') {
        const fn = window.renderProfilePage;
        try { if (typeof fn === 'function') await fn(); } catch (e) { console.warn('renderProfilePage failed', e); }
        profileScreen && profileScreen.classList.remove('hidden');
        return;
    }

    if (segments[0] === 'customize') {
        customizeScreen && customizeScreen.classList.remove('hidden');
        return;
    }

    if (segments[0] === 'dashboard') {
        dashboardScreen && dashboardScreen.classList.remove('hidden');
        // Initialize dashboard if available
        if (window.Dashboard && typeof Dashboard.init === 'function') {
            setTimeout(() => Dashboard.init('dashboard-content'), 100);
        }
        return;
    }

    classSelectionScreen && classSelectionScreen.classList.remove('hidden');
}

/**
 * Format câu hỏi để in đậm các đáp án A, B, C, D
 */
function formatQuestionText(text) {
    if (!text) return '';
    let formattedText = String(text).replace(/\n/g, '<br>');
    return formattedText;
}

/**
 * Format đáp án mẫu - TÔ ĐẬM VÀ ĐỔI MÀU CHỮ CÁI A, B, C, D
 */
function formatAnswerText(text) {
    if (!text) return 'Chưa có đáp án.';

    let formattedText = String(text)
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
        const items = ['a', 'b', 'c', 'd'].filter(k => k in question.statements)
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

function getStemText(question, parentType, forceFullText = false) {
    const qType = question.type || parentType;
    const qt = question.question_text || '';

    // In interactive mode, just return the stem unless forceFullText is true
    if (examMode === 'interactive' && !forceFullText) {
        if (qType === 'multiple_choice') { const parsed = getMCParsed(question); return parsed.stem || qt; }
        if (qType === 'true_false') { const parsed = getTFParsed(question); return parsed.stem || qt; }
        return question.stem || qt;
    }

    // In static mode or when forceFullText is true, include options/statements in the output
    let output = question.stem || qt;

    // Add multiple choice options if available
    if (qType === 'multiple_choice') {
        const parsed = getMCParsed(question);
        if (parsed.options && parsed.options.length > 0) {
            output += '<div class="mt-2 ml-4 space-y-1">';
            parsed.options.forEach((opt, idx) => {
                output += `<div><span class="option-letter">${letterFromIndex(idx)}.</span> ${opt.text || ''}</div>`;
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
                output += `<div><span class="option-letter">${String.fromCharCode(97 + idx)})</span> ${item.text || ''}</div>`;
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
                        <div class=\"flex-1\"><span class=\"option-letter\">${it.key})</span> ${it.text}</div>
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
    } else if (qType === 'essay') {
        return `
            <div class="answer-input-container mt-3">
                <textarea id="${qId}" rows="4"
                          class="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-y" 
                          placeholder="Ghi lại bài làm (tự luận, không chấm tự động)" 
                          oninput="saveAnswer('${qId}', this.value)"></textarea>
            </div>`;
    }
    return '';
}

/**
 * Save student answer
 */
window.saveAnswer = function (qId, answer) {
    studentAnswers[qId] = answer;
    debugLog('Saved answer for', qId, ':', answer);
    saveAnswersToStorage();
};

/**
 * Save true/false answer
 */
window.saveTrueFalseAnswer = function (qId, option, value) {
    // If option is a number (index), store as an array for the new schema
    if (typeof option === 'number') {
        if (!Array.isArray(studentAnswers[qId])) studentAnswers[qId] = [];
        studentAnswers[qId][option] = value;
    } else {
        // Back-compat: letter keys a/b/c/d
        if (!studentAnswers[qId] || typeof studentAnswers[qId] !== 'object') studentAnswers[qId] = {};
        studentAnswers[qId][option] = value;
    }
    debugLog('Saved true/false answer for', qId, option, ':', value);
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
            if (!el) {
                const letter = letterFromIndex(val);
                if (letter && letter !== '?') {
                    sel = `input[type="radio"][name="${qId}"][value="${letter}"]`;
                    el = document.querySelector(sel);
                }
            }
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
 * @param {object} question - Question or sub-question object
 * @param {string} [parentType] - Optional parent type for grouped questions
 */
function getStudentAnswerDisplay(question, parentType) {
    const qId = question.q_id;
    const answer = studentAnswers[qId];
    const ansText = answersMap[qId] || question.model_answer || '';
    // Determine question type: explicit type > parentType > inferred from answers
    const qType = (question.type || parentType) || (function () {
        if (extractCorrectMC(ansText)) return 'multiple_choice';
        const tf = extractCorrectTF(ansText);
        if (Object.keys(tf).length) return 'true_false';
        return 'short';
    })();

    if (!answer) {
        return '<div class="student-answer skipped"><i class="fa-solid fa-circle-minus mr-2 text-slate-400"></i>Bạn chưa trả lời câu này</div>';
    }

    if (qType === 'multiple_choice') {
        // Normalize user answer -> index
        const userIdx = (typeof answer === 'number') ? answer : indexFromLetter(answer);
        const userLetter = (userIdx >= 0) ? letterFromIndex(userIdx) : String(answer || '');
        let isCorrect = false;
        let verdict = '';
        if (examMode === 'interactive') {
            const expectedIdx = getExpectedMCIndex(question, ansText);
            if (expectedIdx !== null && expectedIdx >= 0) {
                isCorrect = (userIdx === expectedIdx);
                const expLetter = letterFromIndex(expectedIdx);
                verdict = isCorrect 
                    ? `<span class="ml-2 text-emerald-600"><i class="fa-solid fa-circle-check mr-1"></i>Đúng</span>`
                    : `<span class="ml-2 text-red-500"><i class="fa-solid fa-circle-xmark mr-1"></i>Sai (Đáp án: ${expLetter})</span>`;
            }
        }
        const statusClass = examMode === 'interactive' ? (isCorrect ? 'correct' : 'wrong') : '';
        return `<div class="student-answer ${statusClass}">
                    <div class="answer-row">
                        <span class="answer-label-tag"><i class="fa-solid fa-hand-pointer"></i> Bạn chọn</span>
                        <span class="answer-value">${userLetter}</span>
                        ${verdict}
                    </div>
                </div>`;
    } else if (qType === 'true_false') {
        // Build list display and verdict summary
        const parsed = getTFParsed(question);
        const expectedArr = getExpectedTFArray(question, ansText);
        let correctCount = 0, total = parsed.items.length;
        const rows = parsed.items.map((it, idx) => {
            const userVal = (answer && (typeof answer[idx] !== 'undefined' ? answer[idx] : answer[it.key]));
            let part = `<span class="font-medium">${it.key})</span> `;
            if (typeof userVal === 'boolean') {
                const color = userVal ? 'text-emerald-600' : 'text-red-500';
                part += `<span class="${color} font-semibold">${userVal ? 'Đ' : 'S'}</span>`;
            } else {
                part += `<span class="text-slate-400">-</span>`;
            }
            if (examMode === 'interactive' && typeof expectedArr[idx] === 'boolean') {
                if (typeof userVal === 'boolean' && userVal === expectedArr[idx]) correctCount++;
            }
            return part;
        }).join(' &nbsp;|&nbsp; ');
        const allCorrect = correctCount === total && total > 0;
        const statusClass = examMode === 'interactive' ? (allCorrect ? 'correct' : 'wrong') : '';
        const summary = (examMode === 'interactive' && total > 0)
            ? `<span class="answer-summary ${allCorrect ? 'text-emerald-600' : 'text-red-500'}"><i class="fa-solid fa-${allCorrect ? 'circle-check' : 'circle-xmark'} mr-1"></i>${correctCount}/${total}</span>`
            : '';
        return `<div class="student-answer ${statusClass}">
                    <div class="answer-row">
                        <span class="answer-label-tag"><i class="fa-solid fa-hand-pointer"></i> Bạn chọn</span>
                        <span class="answer-tf-values">${rows}</span>
                        ${summary}
                    </div>
                </div>`;
    } else if (qType === 'short') {
        // Build verdict if interactive and expected numeric present
        let isCorrect = false;
        let verdict = '';
        if (examMode === 'interactive') {
            const expected = getExpectedShortSpec(question, ansText);
            if (expected) {
                const stuNum = normalizeNumberInput(String(answer));
                const expStr = expected.value.toFixed(expected.decimals);
                const expVN = expStr.replace('.', ',');
                if (!isNaN(stuNum)) {
                    const stuStr = stuNum.toFixed(expected.decimals);
                    isCorrect = (stuStr === expStr);
                    verdict = isCorrect 
                        ? `<span class="ml-2 text-emerald-600"><i class="fa-solid fa-circle-check mr-1"></i>Đúng</span>`
                        : `<span class="ml-2 text-red-500"><i class="fa-solid fa-circle-xmark mr-1"></i>Sai (Đáp án: ${expVN})</span>`;
                } else {
                    verdict = `<span class="ml-2 text-red-500"><i class="fa-solid fa-circle-xmark mr-1"></i>Sai (Đáp án: ${expVN})</span>`;
                }
            }
        }
        const statusClass = examMode === 'interactive' ? (isCorrect ? 'correct' : 'wrong') : '';
        return `<div class="student-answer ${statusClass}">
                    <div class="answer-row">
                        <span class="answer-label-tag"><i class="fa-solid fa-pen"></i> Bạn điền</span>
                        <span class="answer-value">${answer}</span>
                        ${verdict}
                    </div>
                </div>`;
    } else if (qType === 'essay') {
        const displayAnswer = String(answer || '').trim();
        const pretty = displayAnswer ? displayAnswer.replace(/\n/g, '<br>') : '(Không nhập câu trả lời trong hệ thống)';
        return `<div class="student-answer">
                    <div class="answer-row">
                        <span class="answer-label-tag"><i class="fa-solid fa-pen"></i> Bài làm</span>
                        <span class="answer-value">${pretty}</span>
                    </div>
                </div>`;
    }
    return '';
}

/**
 * Populate the exam menu with available exams and tools for the selected grade
 * @param {string} grade - The grade level (9, 10, 11, 12)
 */
function populateExamMenu(grade) {
    debugLog('populateExamMenu called with grade:', grade);
    const examMenu = document.getElementById('exam-menu');
    if (!examMenu) { console.error('exam-menu element not found!'); return; }

    const gradeKey = `grade${grade}`;
    const gradeData = (examManifest && examManifest.grades) ? examManifest.grades[gradeKey] : null;
    const exams = (gradeData && Array.isArray(gradeData.exams)) ? gradeData.exams : [];
    const tools = (gradeData && Array.isArray(gradeData.tools)) ? gradeData.tools : [];

    const titleEl = document.getElementById('exam-selection-title');
    if (titleEl) titleEl.textContent = `Học liệu Lớp ${grade}`;

    // Build sections (filter is handled by v3 page)
    examMenu.innerHTML = `
      <div class="w-full max-w-3xl mx-auto">
        <div class="grid gap-4">
          <div id="rand-card" data-ripple class="group relative overflow-hidden rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition transform active:scale-95 cursor-pointer">
            <div class="absolute inset-0 bg-gradient-to-r from-indigo-50 to-blue-50 opacity-0 group-hover:opacity-100 transition"></div>
            <div class="relative z-10 flex items-center gap-4">
              <div class="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center"><i class="fa-solid fa-shuffle fa-random"></i></div>
              <div class="flex-1">
                <div class="font-semibold text-slate-800">Luyện đề ngẫu nhiên</div>
                <div class="text-sm text-slate-600">Hệ thống chọn một đề bất kỳ phù hợp lớp của bạn</div>
              </div>
              <div class="text-indigo-600 transition-transform group-hover:translate-x-1"><i class="fa-solid fa-arrow-right"></i></div>
            </div>
          </div>

          <div id="accordion-exams" class="space-y-3"></div>

          <div id="section-exams" class="">
            <h3 class="text-left text-slate-800 font-semibold mb-2">Đề kiểm tra</h3>
            <div id="grid-exams" class="grid grid-cols-1 sm:grid-cols-2 gap-4"></div>
          </div>

          <div id="section-tools" class="${tools.length? '':'hidden'}">
            <h3 class="text-left text-slate-800 font-semibold mb-2">Học liệu</h3>
            <div id="grid-tools" class="grid grid-cols-1 sm:grid-cols-2 gap-4"></div>
          </div>
        </div>
      </div>`;

    // Fill exams
    const gridEx = examMenu.querySelector('#grid-exams');
    const gridTl = examMenu.querySelector('#grid-tools');
    const randCard = examMenu.querySelector('#rand-card');
    if (randCard) {
      randCard.addEventListener('click', ()=>{
        const modeSel = document.getElementById('exam-mode-select');
        const mode = modeSel ? modeSel.value : 'static';
        navigateTo(`#/exam?random=1&grade=${encodeURIComponent(grade)}&mode=${encodeURIComponent(mode)}`);
      });
    }

    // (removed) accordion categories per latest request

    const makeExamCard = (it)=>{
      const div = document.createElement('div');
      div.className = 'card-item group relative rounded-2xl border border-blue-200 bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition transform active:scale-95';
      div.setAttribute('data-ripple','');
      div.setAttribute('data-item-type','exam');
      try{
        const id = it.id || ''; const title = it.title || '';
        let cat = 'other';
        const t = title.toLowerCase();
        if(['lop10_ontap_1','lop10_ontap_2','lop10_ontap_3'].includes(id)) cat = 'gk1';
        else if(/giữa\s*hk1/i.test(title)) cat = 'gk1';
        else if(/cuối\s*hk1/i.test(title)) cat = 'ck1';
        else if(/giữa\s*hk2/i.test(title)) cat = 'gk2';
        else if(/cuối\s*hk2/i.test(title)) cat = 'ck2';
        else if(/chương/i.test(t)) cat = 'chuong';
        div.setAttribute('data-cat', cat);
        div.setAttribute('data-title', title.toLowerCase());
      }catch(e){}
      div.innerHTML = `
        <div class="absolute inset-0 bg-gradient-to-r from-blue-50/40 to-transparent opacity-0 group-hover:opacity-100 transition"></div>
        <div class="relative z-10 flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 border border-blue-200"><i class="fa-solid fa-file-pen mr-1"></i> Exam</span>
          </div>
          <div class="font-semibold text-slate-800">${it.title||''}</div>
        </div>
        ${it.description? `
          <div class=\"desc-tip absolute invisible opacity-0 group-hover:visible group-hover:opacity-100 bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 transition-all duration-300 ease-out transform group-hover:translate-y-0 translate-y-2\">
            <div class=\"relative p-4 bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-md rounded-2xl border border-white/10 shadow-[0_0_30px_rgba(79,70,229,0.15)] text-gray-300 text-sm\">${it.description}</div>
            <div class=\"absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-gradient-to-br from-gray-900/95 to-gray-800/95 rotate-45 border-r border-b border-white/10\"></div>
          </div>`:''}
      `;
      div.addEventListener('click',()=>{
        const modeSel = document.getElementById('exam-mode-select');
        const mode = modeSel ? modeSel.value : 'static';
        const pathParam = encodeURIComponent(it.path);
        navigateTo(`#/exam?path=${pathParam}&mode=${encodeURIComponent(mode)}`);
      });
      return div;
    };

    const makeToolCard = (it)=>{
      const div = document.createElement('div');
      div.className = 'card-item group relative rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition transform active:scale-95';
      div.setAttribute('data-ripple','');
      div.setAttribute('data-item-type','tool');
      try{
        const title = it.title || '';
        div.setAttribute('data-cat', 'other');
        div.setAttribute('data-title', title.toLowerCase());
      }catch(e){}
      div.innerHTML = `
        <div class="absolute inset-0 bg-gradient-to-r from-emerald-50/40 to-transparent opacity-0 group-hover:opacity-100 transition"></div>
        <div class="relative z-10 flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700 border border-emerald-200"><i class="fa-solid fa-lightbulb mr-1"></i> Learning</span>
          </div>
          <div class="font-semibold text-slate-800">${it.title||''}</div>
        </div>
        ${it.description? `
          <div class=\"desc-tip absolute invisible opacity-0 group-hover:visible group-hover:opacity-100 bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 transition-all duration-300 ease-out transform group-hover:translate-y-0 translate-y-2\">
            <div class=\"relative p-4 bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-md rounded-2xl border border-white/10 shadow-[0_0_30px_rgba(79,70,229,0.15)] text-gray-300 text-sm\">${it.description}</div>
            <div class=\"absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-gradient-to-br from-gray-900/95 to-gray-800/95 rotate-45 border-r border-b border-white/10\"></div>
          </div>`:''}
      `;
    div.addEventListener('click',()=>{ if(it.url) window.location.href = it.url; });
    return div;
};

// ...
    if (gridEx) exams.forEach(it=> gridEx.appendChild(makeExamCard(it)) );
    if (gridTl) tools.forEach(it=> gridTl.appendChild(makeToolCard(it)) );

    // Filters
    const btnAll = examMenu.querySelector('#flt-all');
    const btnEx = examMenu.querySelector('#flt-exams');
    const btnTl = examMenu.querySelector('#flt-tools');
    const sectionEx = examMenu.querySelector('#section-exams');
    const sectionTl = examMenu.querySelector('#section-tools');

    const setFilter = (k)=>{
      if(sectionEx) sectionEx.classList.toggle('hidden', k==='tools');
      if(sectionTl) sectionTl.classList.toggle('hidden', k==='exams');
    };
    if(btnAll) btnAll.onclick = ()=> setFilter('all');
    if(btnEx) btnEx.onclick = ()=> setFilter('exams');
    if(btnTl) btnTl.onclick = ()=> setFilter('tools');

    // init toggle each time we load the grade menu
    try{ if(window.initExamModeToggle) window.initExamModeToggle(); }catch(e){}
    
    // Notify v3.html that the exam menu was populated (for other layouts to rebuild)
    try{ 
        debugLog('populateExamMenu: dispatching examMenuPopulated event for grade', grade);
        window.dispatchEvent(new CustomEvent('examMenuPopulated', { detail: { grade } })); 
    }catch(e){}
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
        window.currentExamData = currentExamData; // Sync to window for features.js
        answersMap = answersContent;
        window.answersMap = answersMap; // Sync to window for features.js

        // Capture selected mode (static or interactive)
        const modeSel = document.getElementById('exam-mode-select');
        examMode = modeSel ? modeSel.value : 'static';

        let finalTitle = examInfo.title;
        if (!finalTitle || finalTitle === '(đang tải)') {
            try {
                const allGrades = examManifest && examManifest.grades ? Object.values(examManifest.grades) : [];
                for (const g of allGrades) {
                    const found = (g.exams || []).find(it => it.path === basePath || it.path === examInfo.path);
                    if (found) { finalTitle = found.title || finalTitle; break; }
                }
            } catch (e) {}
        }
        examTitleHeader.textContent = finalTitle;
        currentExamMeta = { title: finalTitle, path: examInfo.path || basePath, type: 'exam', mode: examMode };
        attemptStartAtMs = Date.now();
        
        // Load saved answers for this exam
        studentAnswers = loadAnswersFromStorage();
        window.studentAnswers = studentAnswers;

        let examHTML = '';
        const sections = partitionIntoSections(currentExamData);
        let questionCounter = 1;
        questionIndexMap = [];
        currentQuestionIdx = 1;

        sections.forEach(sec => {
            examHTML += `<h2 class="text-xl font-semibold text-slate-800 mt-6 mb-3">${sec.title}</h2>`;

            sec.items.forEach((item) => {
                if (item.is_group && item.sub_questions) {
                    item.sub_questions.forEach(subItem => {
                        const stem = getStemText(subItem, item.type);
                        const formattedQuestion = formatQuestionText(stem);
                        const inputHTML = renderInputElement(subItem, item.type);
                        examHTML += `
                            <div id="q-${questionCounter}" data-qid="${subItem.q_id}" class="question-container rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition">
                                <div class="question-content">
                                    <div class="flex items-start gap-3 mb-2">
                                        <span class="inline-flex items-center justify-center w-8 aspect-square rounded-full bg-blue-600 text-white text-sm font-semibold leading-none flex-shrink-0">${questionCounter}</span>
                                        <div class="question-text text-slate-800 text-base md:text-lg font-medium">${formattedQuestion}</div>
                                    </div>
                                </div>
                                ${inputHTML}
                            </div>`;
                        questionIndexMap.push({ idx: questionCounter, qid: subItem.q_id });
                        questionCounter++;
                    });
                } else {
                    const stem = getStemText(item);
                    const formattedQuestion = formatQuestionText(stem);
                    const inputHTML = renderInputElement(item);
                    examHTML += `
                        <div id="q-${questionCounter}" data-qid="${item.q_id}" class="question-container rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition">
                            <div class="question-content">
                                <div class="flex items-start gap-3 mb-2">
                                    <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-semibold flex-shrink-0">${questionCounter}</span>
                                    <div class="question-text text-slate-800 text-base md:text-lg font-medium">${formattedQuestion}</div>
                                </div>
                            </div>
                            ${inputHTML}
                        </div>`;
                    questionIndexMap.push({ idx: questionCounter, qid: item.q_id });
                    questionCounter++;
                }
            });
        });

        examQuestionsContainer.innerHTML = examHTML;
        if (window.MathJax) {
            MathJax.typesetPromise([examQuestionsContainer]).catch((err) => console.log('MathJax Typeset Error: ' + err.message));
        }

        try {
            if (window.Diagrams && typeof window.Diagrams.renderAll === 'function') {
                window.Diagrams.renderAll(examQuestionsContainer, { mode: examMode });
            }
        } catch (e) {
            console.warn('Diagrams render failed', e);
        }

        // Build Question Palette and handlers
        try { buildQuestionPalette(questionCounter-1); updateQuestionPalette(); setupQuestionObserver(); setupPaletteMobile(); } catch(e){ console.warn('palette init failed', e); }
        applySavedAnswersToUI();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        try { if (timerInterval) clearInterval(timerInterval); } catch (e) {}
        if (currentExamData && currentExamData.duration && typeof window.startTimer === 'function') {
            window.startTimer(currentExamData.duration);
        }

    } catch (error) {
        console.error(error);
        alert('Đã có lỗi xảy ra khi tải đề thi. Vui lòng thử lại.');
        examTitleHeader.textContent = 'Lỗi';
    }
}

// === MAIN CODE ===
document.addEventListener('DOMContentLoaded', async () => {
    // === Lấy các phần tử HTML ===
    const classSelectionScreen = document.getElementById('class-selection-screen');
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
    const authAreas = document.querySelectorAll('#auth-area, [data-auth-area]');
    const historyScreen = document.getElementById('history-screen');
    const historyContainer = document.getElementById('history-container');
    const adminSummaryScreen = document.getElementById('admin-summary-screen');
    const adminSummaryContainer = document.getElementById('admin-summary-container');
    const authScreen = document.getElementById('auth-screen');
    const authSpinner = document.getElementById('auth-spinner');
    const btnAuthGoogle = document.getElementById('btn-auth-google');
    const btnAuthPhone = document.getElementById('btn-auth-phone');
    const profileScreen = document.getElementById('profile-screen');
    const profileFullName = document.getElementById('profile-fullName');
    const profilePhone = document.getElementById('profile-phone');
    const profileGrade = document.getElementById('profile-grade');
    const profileSchool = document.getElementById('profile-school');
    const profileSaveBtn = document.getElementById('profile-save');
    const profileLinkPhoneBtn = document.getElementById('profile-link-phone');

    // --- Tải dữ liệu manifest ---
    try {
        const manifestUrl = 'data/exams-manifest.json';
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
        const response = await fetch(manifestUrl, options);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response body:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        }

        const responseText = await response.text();

        try {
            examManifest = JSON.parse(responseText);
            window.examManifest = examManifest;
        } catch (e) {
            console.error('Failed to parse manifest JSON:', e);
            throw new Error('Invalid JSON in response');
        }

        if (!examManifest || !examManifest.grades) {
            throw new Error('Manifest is missing required grades data');
        }

        // Dispatch event so listeners know manifest is ready
        try { 
            window.dispatchEvent(new Event('examManifestLoaded')); 
        } catch(e){ 
            console.error('Failed to dispatch examManifestLoaded event:', e); 
        }
    } catch (error) {
        console.error(error);
        document.body.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Lỗi nghiêm trọng: Không thể tải dữ liệu học liệu. Vui lòng kiểm tra lại cấu trúc file.</p>';
        return;
    }

    // === Router boot ===
    window.addEventListener('hashchange', renderRoute);
    if (!location.hash) {
        navigateTo('#/auth');
    } else {
        renderRoute();
    }

    // === Gán sự kiện ===
    if (!classMenu) {
        console.error('classMenu element not found!');
        return;
    }

    classMenu.addEventListener('click', (e) => {
        const target = e.target.closest('button[data-grade]');
        if (target) {
            const selectedGrade = target.dataset.grade;
            navigateTo(`#/exams/${selectedGrade}`);
        }
    });

    if (!backToClassSelectionBtn) {
        console.error('backToClassSelectionBtn not found!');
    } else {
        backToClassSelectionBtn.addEventListener('click', () => navigateTo('#/classes'));
    }

    // NOTE: initExamModeToggle is defined globally via window.initExamModeToggle (lines 25-64)

    function renderAuthUI(){
        if(!authAreas || !authAreas.length) return;
        const u = (window.Auth && Auth.getUser) ? Auth.getUser() : null;
        const isGuest = (guestMode === true);
        authAreas.forEach((container)=>{
            if(!container) return;
            if(!u){
                container.innerHTML = `
                  <div class="flex items-center gap-3 text-sm">
                    <span class="text-gray-600">${isGuest ? 'Chế độ: Khách' : 'Chưa đăng nhập'}</span>
                    <a href="#/auth" class="btn-go-auth text-blue-600 hover:underline">Đăng nhập</a>
                    <span class="text-gray-400">|</span>
                    <button type="button" class="btn-guest text-blue-600 hover:underline">Chế độ khách</button>
                  </div>`;
                container.querySelectorAll('.btn-go-auth').forEach(btn=>{
                    btn.onclick = ()=>{ navigateTo('#/auth'); };
                });
                container.querySelectorAll('.btn-guest').forEach(btn=>{
                    btn.onclick = ()=>{ guestMode = true; try{ localStorage.setItem('guest_mode','1'); }catch(e){} navigateTo('#/classes'); };
                });
            } else {
                const initialName = u.displayName || u.email || u.phoneNumber || 'Bạn';
                container.innerHTML = `<span class="text-gray-700">Xin chào, <strong class="auth-name">${initialName}</strong></span>
                  <button type="button" class="btn-profile text-blue-600 hover:underline ml-3">Hồ sơ</button>
                  <button type="button" class="btn-logout text-red-600 hover:underline ml-3">Đăng xuất</button>`;
                container.querySelectorAll('.btn-profile').forEach(btn=>{ btn.onclick = ()=> navigateTo('#/profile'); });
                container.querySelectorAll('.btn-logout').forEach(btn=>{
                    btn.onclick = ()=>{ if(window.Auth && Auth.signOut) Auth.signOut(); };
                });
            }
        });
        // After render, if logged in try to replace name with profile.fullName
        if(u && window.DataStore && DataStore.getUserProfile){
            DataStore.getUserProfile(u.uid).then(prof=>{
                if(prof && prof.fullName){
                    authAreas.forEach(c=>{ const el = c.querySelector('.auth-name'); if(el) el.textContent = prof.fullName; });
                }
            }).catch(()=>{});
        }
    }
    // Guest mode load
    try{ guestMode = localStorage.getItem('guest_mode') === '1'; }catch(e){}
    if(window.Auth && Auth.init){
        try { Auth.init(); } catch(e){}
        if(window.Auth && Auth.onChange){
            Auth.onChange(async (u)=>{
                renderAuthUI();
                if(u){
                    guestMode = false; try{ localStorage.setItem('guest_mode','0'); }catch(e){}
                    await checkAndOnboardUser();
                } else {
                    toastInfo('Đã đăng xuất');
                    navigateTo('#/auth');
                }
            });
        }
        renderAuthUI();
    }

    function setAuthLoading(on){
        if(!authSpinner) return;
        if(on){ authSpinner.classList.remove('d-none'); } else { authSpinner.classList.add('d-none'); }
    }

    if(btnAuthGoogle){
        btnAuthGoogle.addEventListener('click', async ()=>{
            try{
                setAuthLoading(true);
                await Auth.signInWithGoogle();
            }catch(e){
                console.warn('Google sign-in failed', e);
                if(window.Swal) Swal.fire('Lỗi', 'Không đăng nhập được bằng Google', 'error');
            }finally{
                setAuthLoading(false);
            }
        });
    }
    if(btnAuthPhone){
        btnAuthPhone.addEventListener('click', async ()=>{
            try{
                setAuthLoading(true);
                await Auth.signInWithPhone();
            }catch(e){
                console.warn('Phone sign-in failed', e);
                if(window.Swal) Swal.fire('Lỗi', 'Không đăng nhập được bằng Số điện thoại', 'error');
            }finally{
                setAuthLoading(false);
            }
        });
    }

    const btnAuthGuest = document.getElementById('btn-auth-guest');
    if(btnAuthGuest){
        btnAuthGuest.addEventListener('click', ()=>{
            guestMode = true; try{ localStorage.setItem('guest_mode','1'); }catch(e){}
            if(window.Swal) Swal.fire({ icon:'info', title:'Chế độ Khách', text:'Bạn chỉ có thể xem đề ở dạng tĩnh. Hệ thống không lưu lịch sử.', timer:1800, showConfirmButton:false });
            navigateTo('#/classes');
        });
    }

    window.swalPromptCode = async function(){
        const { value: code } = await Swal.fire({
            title: 'Nhập mã xác minh',
            input: 'text',
            inputLabel: 'Mã OTP đã gửi tới số của bạn',
            inputPlaceholder: 'Nhập mã 6 chữ số',
            inputAttributes: { maxlength: 10 },
            confirmButtonText: 'Xác nhận',
            showCancelButton: true
        });
        return code;
    };

    window.swalPromptPhone = async function(){
        const { value: phone } = await Swal.fire({
            title: 'Nhập số điện thoại',
            input: 'tel',
            inputLabel: 'Định dạng quốc tế, ví dụ +84... (dùng số test khi phát triển)',
            inputPlaceholder: '+84...',
            inputAttributes: { maxlength: 20 },
            confirmButtonText: 'Tiếp tục',
            showCancelButton: true
        });
        return phone;
    };

    async function checkAndOnboardUser(){
        try{
            const u = (window.Auth && Auth.getUser) ? Auth.getUser() : null;
            if(!u) return;
            const profile = (window.DataStore && DataStore.getUserProfile) ? await DataStore.getUserProfile(u.uid) : null;
            const need = !profile || !profile.fullName || !profile.phone || !profile.grade || !profile.school;
            if(!need){
                const nm = (profile && profile.fullName) ? profile.fullName : (u.displayName || u.email || u.phoneNumber || 'bạn');
                if(typeof toastSuccess === 'function') toastSuccess(`Chào mừng, ${nm}!`);
                navigateTo('#/classes');
                return;
            }
            await showOnboardingModal(u, profile||{});
        }catch(e){ console.warn('checkAndOnboardUser failed', e); }
    }

    async function showOnboardingModal(u, current){
        const fullName = current.fullName || u.displayName || '';
        const phone = current.phone || u.phoneNumber || '';
        const grade = current.grade || '';
        const school = current.school || '';
        const html = `
          <div class="text-start">
            <div class="mb-2">
              <label class="form-label">Họ và tên</label>
              <input id="sw-fullName" class="form-control" type="text" placeholder="Nguyễn Văn A" value="${fullName}">
            </div>
            <div class="mb-2">
              <label class="form-label">Số điện thoại/Zalo</label>
              <input id="sw-phone" class="form-control" type="tel" placeholder="+84..." value="${phone}">
              <div class="form-text">Có thể liên kết vào tài khoản hiện tại</div>
            </div>
            <div class="mb-2">
              <label class="form-label">Khối lớp</label>
              <select id="sw-grade" class="form-select">
                <option value="" ${!grade?'selected':''}>-- Chọn khối --</option>
                <option value="9" ${grade==='9'?'selected':''}>Lớp 9</option>
                <option value="10" ${grade==='10'?'selected':''}>Lớp 10</option>
                <option value="11" ${grade==='11'?'selected':''}>Lớp 11</option>
                <option value="12" ${grade==='12'?'selected':''}>Lớp 12</option>
                <option value="lt" ${grade==='lt'?'selected':''}>Luyện thi</option>
              </select>
            </div>
            <div class="mb-2">
              <label class="form-label">Trường học</label>
              <input id="sw-school" class="form-control" type="text" placeholder="THPT..." value="${school}">
            </div>
          </div>`;
        const res = await Swal.fire({
            title: 'Cập nhật thông tin học viên',
            html,
            focusConfirm: false,
            allowOutsideClick: false,
            allowEscapeKey: false,
            confirmButtonText: 'Hoàn tất',
            showCancelButton: false,
            preConfirm: ()=>{
                const fn = document.getElementById('sw-fullName').value.trim();
                const ph = document.getElementById('sw-phone').value.trim();
                const gr = document.getElementById('sw-grade').value;
                const sc = document.getElementById('sw-school').value.trim();
                if(!fn || !ph || !gr || !sc){
                    Swal.showValidationMessage('Vui lòng điền đầy đủ thông tin bắt buộc');
                    return false;
                }
                return { fullName: fn, phone: ph, grade: gr, school: sc };
            }
        });
        if(res && res.value){
            try{
                const { fullName: fn, phone: ph, grade: gr, school: sc } = res.value;
                // Link phone to current account if possible and not already linked
                if(ph && (!u.phoneNumber || u.phoneNumber !== ph) && window.Auth && Auth.linkPhoneNumber){
                    try { await Auth.linkPhoneNumber(ph); } catch(e) { console.warn('linkPhoneNumber failed', e); }
                }
                await DataStore.upsertUserProfile(u.uid, { fullName: fn, phone: ph, grade: gr, school: sc, email: u.email||'', displayName: u.displayName||'' });
                if (typeof toastSuccess === 'function') toastSuccess(`Chào mừng, ${fn}!`);
                navigateTo('#/classes');
            }catch(e){
                console.warn('Saving profile failed', e);
                Swal.fire('Lỗi', 'Không lưu được thông tin. Vui lòng thử lại.', 'error');
            }
        }
    }

    if(window.Auth && Auth.onChange){
        Auth.onChange(async (u)=>{
            renderAuthUI();
            if(u){
                // After login, perform onboarding check
                await checkAndOnboardUser();
            }
        });
    }

    window.renderProfilePage = async function(){
        try{
            const u = (window.Auth && Auth.getUser) ? Auth.getUser() : null;
            if(!u){ navigateTo('#/auth'); return; }
            const prof = (window.DataStore && DataStore.getUserProfile) ? await DataStore.getUserProfile(u.uid) : null;
            if(profileFullName) profileFullName.value = (prof && prof.fullName) || u.displayName || '';
            if(profilePhone) profilePhone.value = (prof && prof.phone) || u.phoneNumber || '';
            if(profileGrade) profileGrade.value = (prof && prof.grade) || '';
            if(profileSchool) profileSchool.value = (prof && prof.school) || '';
        }catch(e){ console.warn('renderProfilePage failed', e); }
    };

    if(profileSaveBtn){
        profileSaveBtn.addEventListener('click', async ()=>{
            try{
                const u = (window.Auth && Auth.getUser) ? Auth.getUser() : null;
                if(!u){ navigateTo('#/auth'); return; }
                const data = {
                    fullName: (profileFullName && profileFullName.value.trim()) || '',
                    phone: (profilePhone && profilePhone.value.trim()) || '',
                    grade: (profileGrade && profileGrade.value) || '',
                    school: (profileSchool && profileSchool.value.trim()) || ''
                };
                if(!data.fullName || !data.phone || !data.grade || !data.school){
                    if(window.Swal) Swal.fire('Thiếu thông tin', 'Vui lòng điền đầy đủ các trường bắt buộc.', 'warning');
                    return;
                }
                await DataStore.upsertUserProfile(u.uid, Object.assign(data, { email: u.email||'', displayName: u.displayName||'' }));
                toastSuccess('Đã lưu hồ sơ');
                setTimeout(()=>{ navigateTo('#/classes'); }, 400);
            }catch(e){ if(window.Swal) Swal.fire('Lỗi', 'Không lưu được hồ sơ', 'error'); }
        });
    }

    if(profileLinkPhoneBtn){
        profileLinkPhoneBtn.addEventListener('click', async ()=>{
            try{
                const ph = (profilePhone && profilePhone.value.trim()) || '';
                if(!ph){ if(window.Swal) Swal.fire('Thiếu số điện thoại', 'Vui lòng nhập số điện thoại', 'warning'); return; }
                await Auth.linkPhoneNumber(ph);
                toastSuccess('Đã liên kết số điện thoại');
            }catch(e){ if(window.Swal) Swal.fire('Lỗi', 'Không liên kết được số điện thoại', 'error'); }
        });
    }

    window.renderHistoryPage = async function(){
        if(!historyContainer) return;
        historyContainer.innerHTML = '<div class="text-gray-500">Đang tải lịch sử...</div>';
        try {
            const arr = (window.DataStore && DataStore.listAttempts) ? await DataStore.listAttempts() : [];
            if(!arr || !arr.length){
                historyContainer.innerHTML = '<div class="text-gray-600">Chưa có lịch sử làm bài.</div>';
                return;
            }
            const rows = arr.map((a)=>{
                const started = new Date(a.startedAt || a.submittedAt || Date.now());
                const time = started.toLocaleString();
                const title = (a.exam && a.exam.title) ? a.exam.title : '(Không rõ)';
                const percent = (a.autoScore && typeof a.autoScore.percent === 'number') ? a.autoScore.percent : 0;
                const spent = (typeof a.timeSpentSec === 'number') ? a.timeSpentSec : 0;
                const mm = Math.floor(spent/60); const ss = String(spent%60).padStart(2,'0');
                return `<div class="p-4 border rounded flex items-center justify-between">
                    <div>
                        <div class="font-semibold text-blue-700">${title}</div>
                        <div class="text-sm text-gray-600">Bắt đầu: ${time} • Thời gian: ${mm}:${ss} • Chế độ: ${a.mode||''}</div>
                    </div>
                    <div class="text-right">
                        <div class="text-lg font-bold ${percent>=70?'text-green-600':'text-gray-800'}">${percent}%</div>
                        <div class="text-sm text-gray-500">${a.autoScore ? `${a.autoScore.points}/${a.autoScore.max}` : ''}</div>
                    </div>
                </div>`;
            }).join('');
            historyContainer.innerHTML = rows;
        } catch (e) {
            historyContainer.innerHTML = '<div class="text-red-600">Không tải được lịch sử.</div>';
        }
    };

    window.renderAdminPage = async function(){
        if(!adminSummaryContainer) return;
        if(!(window.DataStore && DataStore.isAdmin && DataStore.isAdmin())){
            adminSummaryContainer.innerHTML = '<div class="text-red-600">Chức năng này chỉ dành cho Admin. Hãy đăng nhập bằng tài khoản quản trị.</div>';
            return;
        }
        adminSummaryContainer.innerHTML = '<div class="text-gray-500">Đang tải tổng hợp...</div>';
        try {
            const arr = (window.DataStore && DataStore.listAllAttempts) ? await DataStore.listAllAttempts(1000) : [];
            let filtered = arr.slice();

            const uniqueSchools = Array.from(new Set(arr.map(a=>a.userSchool).filter(Boolean))).sort();

            const filters = `<div class="flex flex-wrap items-center gap-3 mb-4">
                <div class="flex items-center gap-2">
                    <label for="adm-filter-grade" class="text-sm text-gray-700">Khối:</label>
                    <select id="adm-filter-grade" class="border border-gray-300 rounded px-2 py-1 text-sm">
                        <option value="">Tất cả</option>
                        <option value="9">Lớp 9</option>
                        <option value="10">Lớp 10</option>
                        <option value="11">Lớp 11</option>
                        <option value="12">Lớp 12</option>
                        <option value="lt">Luyện thi</option>
                    </select>
                </div>
                <div class="flex items-center gap-2">
                    <label for="adm-filter-school" class="text-sm text-gray-700">Trường:</label>
                    <select id="adm-filter-school" class="border border-gray-300 rounded px-2 py-1 text-sm">
                        <option value="">Tất cả</option>
                        ${uniqueSchools.map(s=>`<option value="${s}">${s}</option>`).join('')}
                    </select>
                </div>
                <button id="adm-filter-reset" class="text-blue-600 hover:underline text-sm">Reset</button>
            </div>`;

            const draw = (list)=>{
                const total = list.length;
                const byUser = new Map();
                const byExam = new Map();
                for(const a of list){
                    const key = a.userEmail || a.uid || 'unknown';
                    if(!byUser.has(key)) byUser.set(key, { email: a.userEmail||'', uid: a.uid||'', name: a.userFullName||a.userName||'', count:0, sum:0, n:0 });
                    const u = byUser.get(key); u.count++; if(a.autoScore && typeof a.autoScore.percent==='number'){ u.sum += a.autoScore.percent; u.n++; }
                    const ex = (a.exam && (a.exam.path||a.exam.title)) || 'unknown';
                    if(!byExam.has(ex)) byExam.set(ex, { id: ex, title: (a.exam && a.exam.title) || ex, count:0, sum:0, n:0 });
                    const e = byExam.get(ex); e.count++; if(a.autoScore && typeof a.autoScore.percent==='number'){ e.sum += a.autoScore.percent; e.n++; }
                }
                const uniqueUsers = byUser.size;
                const topExams = Array.from(byExam.values()).sort((x,y)=>y.count-x.count).slice(0,10);
                const header = `<div class="grid grid-cols-2 gap-4 mb-6">
                    <div class="p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
                        <div class="text-sm text-gray-600">Tổng số bài nộp</div>
                        <div class="text-2xl font-bold text-blue-800">${total}</div>
                    </div>
                    <div class="p-4 bg-green-50 border-l-4 border-green-400 rounded">
                        <div class="text-sm text-gray-600">Số học sinh (ước tính)</div>
                        <div class="text-2xl font-bold text-green-800">${uniqueUsers}</div>
                    </div>
                </div>`;
                const examList = `<div>
                    <div class="font-semibold mb-2">Top đề được làm nhiều nhất</div>
                    <div class="space-y-2">${topExams.map(e=>{
                        const avg = e.n? Math.round(e.sum/e.n):0;
                        return `<div class="p-3 border rounded flex justify-between"><div>${e.title}</div><div class="text-sm text-gray-600">Số lần: ${e.count} • Điểm TB: ${avg}%</div></div>`;
                    }).join('')}</div>
                </div>`;

                const tableRows = list.slice(0,500).map(a=>{
                    const t = new Date(a.submittedAt || a.startedAt || Date.now());
                    const time = t.toLocaleString();
                    const name = a.userFullName || a.userName || '';
                    const email = a.userEmail || '';
                    const grade = a.userGrade || '';
                    const school = a.userSchool || '';
                    const title = (a.exam && a.exam.title) || '';
                    const percent = (a.autoScore && typeof a.autoScore.percent==='number') ? a.autoScore.percent : 0;
                    const spent = (typeof a.timeSpentSec === 'number') ? a.timeSpentSec : 0;
                    const mm = Math.floor(spent/60); const ss = String(spent%60).padStart(2,'0');
                    return `<tr>
                        <td class="px-3 py-2 whitespace-nowrap">${time}</td>
                        <td class="px-3 py-2">${name}</td>
                        <td class="px-3 py-2 text-gray-600">${email}</td>
                        <td class="px-3 py-2">${grade}</td>
                        <td class="px-3 py-2">${school}</td>
                        <td class="px-3 py-2">${title}</td>
                        <td class="px-3 py-2 text-right">${percent}%</td>
                        <td class="px-3 py-2 text-right">${mm}:${ss}</td>
                    </tr>`;
                }).join('');
                const table = `<div class="mt-6">
                    <div class="flex items-center justify-between mb-2">
                        <div class="font-semibold">Danh sách bài nộp (mới nhất)</div>
                        <button id="btn-export-csv" class="text-blue-600 hover:underline">Xuất CSV</button>
                    </div>
                    <div class="overflow-auto">
                        <table class="min-w-full text-sm">
                            <thead class="bg-gray-50"><tr>
                                <th class="px-3 py-2 text-left">Thời gian nộp</th>
                                <th class="px-3 py-2 text-left">Họ tên</th>
                                <th class="px-3 py-2 text-left">Email</th>
                                <th class="px-3 py-2 text-left">Khối</th>
                                <th class="px-3 py-2 text-left">Trường</th>
                                <th class="px-3 py-2 text-left">Đề</th>
                                <th class="px-3 py-2 text-right">Điểm</th>
                                <th class="px-3 py-2 text-right">TG (mm:ss)</th>
                            </tr></thead>
                            <tbody>${tableRows}</tbody>
                        </table>
                    </div>
                </div>`;

                adminSummaryContainer.innerHTML = filters + header + examList + table;

                const btn = document.getElementById('btn-export-csv');
                if(btn){
                    btn.onclick = ()=>{
                        const lines = [['submittedAt','userFullName','userEmail','uid','grade','school','examTitle','examPath','percent','points','max','timeSpentSec','mode']];
                        for(const a of list){
                            const t = new Date(a.submittedAt || a.startedAt || Date.now()).toISOString();
                            const percent = (a.autoScore && typeof a.autoScore.percent==='number') ? a.autoScore.percent : '';
                            const points = (a.autoScore && typeof a.autoScore.points==='number') ? a.autoScore.points : '';
                            const max = (a.autoScore && typeof a.autoScore.max==='number') ? a.autoScore.max : '';
                            lines.push([
                                t,
                                a.userFullName||a.userName||'',
                                a.userEmail||'',
                                a.uid||'',
                                a.userGrade||'',
                                a.userSchool||'',
                                (a.exam && a.exam.title)||'',
                                (a.exam && a.exam.path)||'',
                                percent,
                                points,
                                max,
                                a.timeSpentSec||'',
                                a.mode||''
                            ]);
                        }
                        const csv = lines.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
                        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url; a.download = 'attempts.csv'; a.click();
                        URL.revokeObjectURL(url);
                    };
                }

                const gSel = document.getElementById('adm-filter-grade');
                const sSel = document.getElementById('adm-filter-school');
                const resetBtn = document.getElementById('adm-filter-reset');
                if(gSel) gSel.onchange = ()=>{ applyFilters(); };
                if(sSel) sSel.onchange = ()=>{ applyFilters(); };
                if(resetBtn) resetBtn.onclick = ()=>{ if(gSel) gSel.value=''; if(sSel) sSel.value=''; applyFilters(); };

                function applyFilters(){
                    const g = (document.getElementById('adm-filter-grade')||{}).value || '';
                    const s = (document.getElementById('adm-filter-school')||{}).value || '';
                    filtered = arr.filter(a=> (!g || (a.userGrade||'')===g) && (!s || (a.userSchool||'')===s));
                    draw(filtered);
                }
            };

            draw(filtered);
        } catch (e) {
            adminSummaryContainer.innerHTML = '<div class="text-red-600">Không tải được tổng hợp.</div>';
        }
    };

    submitExamBtn.addEventListener('click', () => {
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
                        <div class="question-container result-item rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div class="question-content">
                                <div class="question-text text-slate-800 text-base md:text-lg font-medium leading-relaxed">${formattedGroupTitle}</div>
                            </div>
                            <div class="sub-questions-container mt-4 space-y-4">`;

                    item.sub_questions.forEach((sub, subIdx) => {
                        const currentQuestionNumber = questionCounter;
                        checkboxItems.push({ id: sub.q_id, label: `Câu ${currentQuestionNumber}` });

                        // Format câu hỏi và đáp án
                        const formattedSubQuestion = formatQuestionText(getStemText(sub, item.type, true));
                        const formattedAnswer = formatAnswerText(sub.model_answer || 'Chưa có đáp án.');
                        const studentAns = getStudentAnswerDisplay(sub, item.type);

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
                            <div class="sub-question-result result-item rounded-xl border border-slate-200 bg-slate-50 p-4" data-question-index="${questionCounter - 1}">
                                <div class="question-content">
                                    <div class="flex items-start gap-3 mb-2">
                                        <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-semibold flex-shrink-0">${currentQuestionNumber}</span>
                                        <div class="question-text text-slate-800 text-base font-medium leading-relaxed">${formattedSubQuestion}</div>
                                    </div>
                                </div>
                                ${studentAns}
                                <div class="answer-section">
                                    <div class="answer-label">Lời giải</div>
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
                    const formattedQuestion = formatQuestionText(getStemText(item, null, true));
                    const formattedAnswer = formatAnswerText(item.model_answer || 'Chưa có đáp án.');
                    const studentAns = getStudentAnswerDisplay(item, null);

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
                        <div class="question-container result-item rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition" data-question-index="${questionCounter - 1}">
                            <div class="question-content">
                                <div class="flex items-start gap-3 mb-3">
                                    <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-semibold flex-shrink-0">${questionCounter}</span>
                                    <div class="question-text text-slate-800 text-base md:text-lg font-medium leading-relaxed">${formattedQuestion}</div>
                                </div>
                            </div>
                            ${studentAns}
                            <div class="answer-section">
                                <div class="answer-label">Lời giải</div>
                                <div class="answer-text">${formattedAnswer}</div>
                            </div>
                        </div>`;
                    questionCounter++;
                }
            });
        });

        // Prepend auto-grading summary (interactive mode)
        let computedPercent = null;
        if (examMode === 'interactive') {
            const percent = autoMaxPoints > 0 ? Math.round(100 * autoScorePoints / autoMaxPoints) : 0;
            computedPercent = percent;
            const summaryHTML = `
                <div class="bg-blue-50 border-l-4 border-blue-400 rounded p-4 mb-6">
                    <div class="font-bold text-blue-800">Kết quả chấm tự động</div>
                    <div class="text-blue-700 mt-1">Điểm: ${autoScorePoints} / ${autoMaxPoints} (${percent}%)</div>
                    <div class="text-gray-600 text-sm">Gồm phần trắc nghiệm, đúng/sai và tự luận dạng số (chấp nhận dấu phẩy thập phân, so sánh theo số chữ số thập phân trong đáp án mẫu).</div>
                </div>`;
            resultsHTML = summaryHTML + resultsHTML;
        }

        try {
            // Only persist attempts when interactive and user is logged in (not guest)
            const u = (window.Auth && Auth.getUser) ? Auth.getUser() : null;
            if (examMode === 'interactive' && u && !guestMode) {
                const attempt = buildAttemptRecord(autoScorePoints, autoMaxPoints);
                if (window.DataStore && DataStore.saveAttempt) { DataStore.saveAttempt(attempt); }
            }
        } catch (e) { console.warn('saveAttempt failed', e); }

        // Inject results

        if (resultsContainer) {
            resultsContainer.innerHTML = resultsHTML || '<p>Chưa có dữ liệu kết quả để hiển thị.</p>';
            if (window.MathJax) {
                MathJax.typesetPromise([resultsContainer]).catch((err) => console.log('MathJax Typeset Error: ' + err.message));
            }
        }

        if (questionCheckboxContainer) {
            questionCheckboxContainer.innerHTML = checkboxItems.map(it => {
                const id = `cb_${it.id}`;
                return `
                    <div class="flex items-center gap-2 py-1">
                        <input id="${id}" type="checkbox" value="${it.id}" class="w-4 h-4" />
                        <label for="${id}" class="text-sm text-gray-700">${it.label}</label>
                    </div>`;
            }).join('');
        }

        try {
            if (typeof buildResultsQuestionPalette === 'function') {
                buildResultsQuestionPalette(checkboxItems);
            }
        } catch (e) { }

        navigateTo('#/results');
        window.scrollTo(0, 0);

        try {
            if (resultsContainer && window.Diagrams && typeof window.Diagrams.renderAll === 'function') {
                setTimeout(() => {
                    try { window.Diagrams.renderAll(resultsContainer, { mode: 'static' }); } catch (e) { console.warn('Diagrams render failed', e); }
                }, 50);
            }
        } catch (e) {
            console.warn('Diagrams render failed', e);
        }
    });

    restartBtn.addEventListener('click', () => {
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
        window.currentExamData = null;
        studentAnswers = {};
        window.studentAnswers = studentAnswers;
        attemptStartAtMs = null;
        currentExamMeta = null;
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
    window.startTimer = function (duration) {
        try { if (timerInterval) clearInterval(timerInterval); } catch (e) {}
        let remaining = parseInt(duration, 10) || 0;
        const timerSidebar = document.getElementById('timer-sidebar');
        const examProgress = document.getElementById('exam-progress');
        
        const render = () => {
            const hours = Math.floor(remaining / 3600);
            const minutes = Math.floor((remaining % 3600) / 60);
            const seconds = remaining % 60;
            const h = String(hours).padStart(1, '0');
            const m = String(minutes).padStart(2, '0');
            const s = String(seconds).padStart(2, '0');
            const timeStr = hours > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
            
            // Update both mobile and sidebar timers
            if (timerDisplay) timerDisplay.textContent = timeStr;
            if (timerSidebar) timerSidebar.textContent = timeStr;
            
            // Update progress bars (mobile and sidebar)
            if (currentExamData?.questions) {
                const answered = Object.keys(studentAnswers).length;
                const total = currentExamData.questions.length || 1;
                const percent = Math.round((answered / total) * 100);
                if (examProgress) examProgress.style.width = `${percent}%`;
                const sidebarProgress = document.getElementById('exam-progress-sidebar');
                if (sidebarProgress) sidebarProgress.style.width = `${percent}%`;
            }
            
            // Change timer color when low on time (< 1 min)
            if (remaining <= 60 && timerSidebar) {
                timerSidebar.classList.add('text-red-500', 'animate-pulse');
            }
            // Warning at 5 minutes
            if (remaining <= 300 && remaining > 60 && timerSidebar) {
                timerSidebar.classList.add('text-amber-500');
            }
        };
        render();
        timerInterval = setInterval(function () {
            remaining -= 1;
            if (remaining <= 0) {
                remaining = 0;
                render();
                clearInterval(timerInterval);
                submitExamBtn && submitExamBtn.click();
                return;
            }
            render();
        }, 1000);
    };

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