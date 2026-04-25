/* =========================================================
 * Exam Editor — Full-featured editor for exam.json
 * ========================================================= */

(function () {
  'use strict';

  // ================== STATE ==================
  const state = {
    examPath: '',
    exam: null,          // { duration, questions: [...] }
    selected: null,      // { qIdx, subIdx|null }
    dirty: false,
    lastFocus: null,     // HTMLTextArea/HTMLInputElement for diagram insertion
    currentPreset: null, // in config modal
    currentSpec: null,   // spec JSON for preset config
    cfgBoard: null,      // JSX board in config modal
  };

  // ================== UTIL ==================
  const $ = id => document.getElementById(id);
  const h = (tag, attrs = {}, children = []) => {
    const el = document.createElement(tag);
    for (const k of Object.keys(attrs)) {
      if (k === 'class') el.className = attrs[k];
      else if (k === 'html') el.innerHTML = attrs[k];
      else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      else el.setAttribute(k, attrs[k]);
    }
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (c === null || c === undefined) return;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return el;
  };
  const toast = (msg, type = '') => {
    const el = $('toast');
    el.className = 'toast show ' + type;
    el.textContent = msg;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.classList.remove('show'); }, 2500);
  };
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const markDirty = () => {
    state.dirty = true;
    updateStats();
  };
  const typesetMathJax = (el) => {
    if (window.MathJax && MathJax.typesetPromise) {
      MathJax.typesetPromise([el]).catch(() => { });
    }
  };
  const renderDiagramsIn = (el) => {
    try {
      if (window.Diagrams && Diagrams.renderAll) Diagrams.renderAll(el, { mode: 'static' });
    } catch (e) { console.warn('diagrams', e); }
  };
  // Reset any pre-rendered diagrams in a DOM subtree so renderAll will re-render.
  const resetDiagramsIn = (el) => {
    el.querySelectorAll('.jxg-diagram').forEach(d => {
      d.removeAttribute('data-jxg-rendered');
      d.innerHTML = '';
    });
  };

  function letterFromIndex(i) {
    return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[i] || '?';
  }

  function updateStats() {
    const q = state.exam && state.exam.questions ? state.exam.questions : [];
    const nTotal = q.length;
    let nSub = 0;
    q.forEach(x => { if (x.is_group && Array.isArray(x.sub_questions)) nSub += x.sub_questions.length; });
    $('stats').innerHTML = state.exam ? `${nTotal} câu · ${nSub} câu nhóm · ${state.examPath || '(chưa lưu)'}${state.dirty ? ' <span class="dirty-ind">CHƯA LƯU</span>' : ''}` : '';
  }

  // ================== LOAD / SAVE ==================
  async function loadByPath(path) {
    if (!path) { toast('Nhập đường dẫn', 'err'); return; }
    try {
      const res = await fetch(path + '?t=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      state.exam = data;
      state.examPath = path;
      state.selected = null;
      state.dirty = false;
      renderList();
      renderEditor();
      renderPreview();
      updateStats();
      toast('Đã tải exam.json', 'ok');
    } catch (e) {
      toast('Lỗi tải: ' + e.message, 'err');
    }
  }

  function loadFromFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        state.exam = data;
        state.examPath = file.name;
        $('pathInput').value = file.name;
        state.selected = null;
        state.dirty = false;
        renderList();
        renderEditor();
        renderPreview();
        updateStats();
        toast('Đã nạp file ' + file.name, 'ok');
      } catch (e) {
        toast('File không phải JSON hợp lệ: ' + e.message, 'err');
      }
    };
    reader.readAsText(file);
  }

  async function saveExam() {
    if (!state.exam) return;
    const json = JSON.stringify(state.exam, null, 2);
    // 1) always offer download
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fn = (state.examPath || 'exam').split(/[\\/]/).pop();
    a.download = fn.endsWith('.json') ? fn : 'exam.json';
    a.click();
    URL.revokeObjectURL(url);

    // 2) try PUT to server if path is a relative URL
    const path = state.examPath;
    if (path && !/^[a-z]+:/i.test(path) && path.endsWith('.json')) {
      try {
        const r = await fetch(path, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: json });
        if (r.ok) {
          state.dirty = false;
          updateStats();
          toast('Đã lưu lên server + tải xuống', 'ok');
          return;
        }
      } catch (e) { /* fall through */ }
    }
    state.dirty = false;
    updateStats();
    toast('Đã tải xuống file (server không hỗ trợ PUT)', 'ok');
  }

  // ================== QUESTION LIST ==================
  function typeBadge(type, isGroup) {
    if (isGroup) return '<span class="badge group">NHÓM</span>';
    const t = type || 'multiple_choice';
    if (t === 'multiple_choice') return '<span class="badge mc">MC</span>';
    if (t === 'true_false') return '<span class="badge tf">ĐS</span>';
    if (t === 'short') return '<span class="badge short">TLN</span>';
    if (t === 'essay') return '<span class="badge essay">TL</span>';
    return `<span class="badge">${esc(t)}</span>`;
  }

  function previewText(q) {
    const stem = q.stem || q.question_text || '';
    return esc(stem.replace(/<[^>]+>/g, ' ').slice(0, 120));
  }

  function renderList() {
    const root = $('q-list');
    root.innerHTML = '';
    if (!state.exam || !Array.isArray(state.exam.questions)) {
      root.innerHTML = '<div class="empty">Chưa có dữ liệu</div>';
      return;
    }
    const sectionMap = new Map();
    state.exam.questions.forEach((q, idx) => {
      const s = q.section || 'Phần chung';
      if (!sectionMap.has(s)) sectionMap.set(s, []);
      sectionMap.get(s).push({ q, idx });
    });
    let counter = 1;
    for (const [sectionTitle, items] of sectionMap) {
      root.appendChild(h('div', { class: 'section-hdr' }, sectionTitle));
      items.forEach(({ q, idx }) => {
        if (q.is_group && Array.isArray(q.sub_questions)) {
          // group header row
          const groupRow = h('div', {
            class: 'q-item' + (state.selected && state.selected.qIdx === idx && state.selected.subIdx === null ? ' active' : ''),
            onclick: () => select(idx, null)
          }, [
            h('div', { class: 'q-head', html: `<span class="q-num">Câu ${counter}–${counter + q.sub_questions.length - 1}</span>${typeBadge(q.type, true)}` }),
            h('div', { class: 'q-preview' }, `(Nhóm gồm ${q.sub_questions.length} ý) ${(q.group_title || '').slice(0, 60)}`)
          ]);
          root.appendChild(groupRow);
          q.sub_questions.forEach((sub, sIdx) => {
            const row = h('div', {
              class: 'q-sub' + (state.selected && state.selected.qIdx === idx && state.selected.subIdx === sIdx ? ' active' : ''),
              onclick: () => select(idx, sIdx)
            }, [
              h('div', { class: 'q-head', html: `<span class="q-num">Câu ${counter}</span>${typeBadge(sub.type || q.type)}` }),
              h('div', { class: 'q-preview' }, previewText(sub))
            ]);
            root.appendChild(row);
            counter++;
          });
        } else {
          const row = h('div', {
            class: 'q-item' + (state.selected && state.selected.qIdx === idx && state.selected.subIdx === null ? ' active' : ''),
            onclick: () => select(idx, null)
          }, [
            h('div', { class: 'q-head', html: `<span class="q-num">Câu ${counter}</span>${typeBadge(q.type)}` }),
            h('div', { class: 'q-preview' }, previewText(q))
          ]);
          root.appendChild(row);
          counter++;
        }
      });
    }
  }

  function select(qIdx, subIdx) {
    state.selected = { qIdx, subIdx };
    renderList();
    renderEditor();
    // if "only current" is on, rerender preview; otherwise just scroll
    if ($('chk-only-current').checked) {
      renderPreview();
    } else {
      scrollPreviewToSelected();
    }
  }

  function getSelectedItem() {
    if (!state.selected || !state.exam) return null;
    const { qIdx, subIdx } = state.selected;
    const q = state.exam.questions[qIdx];
    if (!q) return null;
    if (subIdx !== null && subIdx !== undefined && q.sub_questions) {
      return { parent: q, item: q.sub_questions[subIdx], isSub: true };
    }
    return { parent: null, item: q, isSub: false };
  }

  // ================== ADD / REMOVE ==================
  function addQuestion() {
    if (!state.exam) {
      state.exam = { duration: 5400, questions: [] };
      state.examPath = state.examPath || 'new-exam.json';
    }
    const nq = {
      q_id: 'new_' + Math.random().toString(36).slice(2, 8),
      section: 'PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn.',
      type: 'multiple_choice',
      stem: '',
      options: ['', '', '', ''],
      correct_index: 0,
      detailed_explanation: ''
    };
    state.exam.questions.push(nq);
    state.selected = { qIdx: state.exam.questions.length - 1, subIdx: null };
    markDirty();
    renderList();
    renderEditor();
    renderPreview();
  }

  function addGroupQuestion() {
    if (!state.exam) {
      state.exam = { duration: 5400, questions: [] };
      state.examPath = state.examPath || 'new-exam.json';
    }
    const ng = {
      q_id: 'group_' + Math.random().toString(36).slice(2, 8),
      section: 'PHẦN IV. Tự luận.',
      type: 'short',
      is_group: true,
      sub_questions: [
        { q_id: 'sub_' + Math.random().toString(36).slice(2, 8), question_text: '', final_answer: '', detailed_explanation: '' }
      ]
    };
    state.exam.questions.push(ng);
    state.selected = { qIdx: state.exam.questions.length - 1, subIdx: 0 };
    markDirty();
    renderList();
    renderEditor();
    renderPreview();
  }

  function deleteSelected() {
    const sel = getSelectedItem();
    if (!sel) return;
    if (!confirm('Xoá câu hỏi này?')) return;
    if (sel.isSub) {
      sel.parent.sub_questions.splice(state.selected.subIdx, 1);
      if (sel.parent.sub_questions.length === 0) {
        state.exam.questions.splice(state.selected.qIdx, 1);
        state.selected = null;
      } else {
        state.selected.subIdx = Math.min(state.selected.subIdx, sel.parent.sub_questions.length - 1);
      }
    } else {
      state.exam.questions.splice(state.selected.qIdx, 1);
      state.selected = null;
    }
    markDirty();
    renderList();
    renderEditor();
    renderPreview();
  }

  function duplicateSelected() {
    const sel = getSelectedItem();
    if (!sel) return;
    const copy = JSON.parse(JSON.stringify(sel.item));
    copy.q_id = (copy.q_id || 'q') + '_copy';
    if (sel.isSub) {
      sel.parent.sub_questions.splice(state.selected.subIdx + 1, 0, copy);
      state.selected.subIdx++;
    } else {
      state.exam.questions.splice(state.selected.qIdx + 1, 0, copy);
      state.selected.qIdx++;
    }
    markDirty();
    renderList();
    renderEditor();
    renderPreview();
  }

  function moveSelected(delta) {
    const sel = getSelectedItem();
    if (!sel) return;
    if (sel.isSub) {
      const arr = sel.parent.sub_questions;
      const i = state.selected.subIdx;
      const j = i + delta;
      if (j < 0 || j >= arr.length) return;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      state.selected.subIdx = j;
    } else {
      const arr = state.exam.questions;
      const i = state.selected.qIdx;
      const j = i + delta;
      if (j < 0 || j >= arr.length) return;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      state.selected.qIdx = j;
    }
    markDirty();
    renderList();
    renderEditor();
    renderPreview();
  }

  // ================== EDITOR FORM ==================
  function renderEditor() {
    const root = $('edit-area');
    root.className = '';
    const sel = getSelectedItem();
    if (!sel) {
      root.className = 'empty';
      root.innerHTML = 'Chọn một câu hỏi để soạn.';
      return;
    }
    const q = sel.item;
    const parent = sel.parent;
    root.innerHTML = '';
    const f = h('div', { class: 'form' });
    root.appendChild(f);

    // If this is a group (selected the group itself)
    if (q.is_group) {
      f.appendChild(formField('Q_ID', 'text', q.q_id || '', v => { q.q_id = v; markDirty(); }));
      f.appendChild(formField('Section', 'text', q.section || '', v => { q.section = v; markDirty(); renderList(); }));
      f.appendChild(formField('Group title (tuỳ chọn)', 'text', q.group_title || '', v => { q.group_title = v; markDirty(); }));
      f.appendChild(formSelect('Type mặc định cho sub_questions', ['short', 'essay'], q.type || 'short', v => { q.type = v; markDirty(); }));
      f.appendChild(h('div', { class: 'group' }, [
        h('label', {}, 'Sub-questions'),
        h('div', { id: 'subq-list' })
      ]));
      renderSubList(q);
      const addBtn = h('button', { class: 'btn-add', onclick: () => {
          q.sub_questions = q.sub_questions || [];
          q.sub_questions.push({ q_id: 'sub_' + Math.random().toString(36).slice(2, 8), question_text: '', final_answer: '', detailed_explanation: '' });
          markDirty();
          renderList();
          renderEditor();
          renderPreview();
        } }, '+ Thêm sub-question');
      f.appendChild(addBtn);
      return;
    }

    // Normal question (or sub_question of a group)
    // Header
    if (parent) {
      f.appendChild(h('div', { class: 'group', style: 'background:#fef3c7;padding:6px 10px;border-radius:4px;font-size:12px;color:#92400e' }, `Đang soạn sub-question trong nhóm: ${parent.group_title || parent.q_id}`));
    }

    f.appendChild(formField('Q_ID', 'text', q.q_id || '', v => { q.q_id = v; markDirty(); }));
    if (!parent) f.appendChild(formField('Section', 'text', q.section || '', v => { q.section = v; markDirty(); renderList(); }));

    const isSub = !!parent;
    const type = q.type || (parent ? parent.type : 'multiple_choice');
    if (!isSub) {
      f.appendChild(formSelect('Type', ['multiple_choice', 'true_false', 'short', 'essay'], type, v => {
        q.type = v;
        // reset type-specific fields
        if (v === 'multiple_choice' && !Array.isArray(q.options)) { q.options = ['', '', '', '']; q.correct_index = 0; }
        if (v === 'true_false' && !Array.isArray(q.statements)) { q.statements = ['', '', '', '']; q.correct_values = [true, false, true, false]; }
        markDirty();
        renderList();
        renderEditor();
        renderPreview();
      }));
    } else {
      f.appendChild(formSelect('Type (override của sub-question)', ['(kế thừa nhóm)', 'multiple_choice', 'true_false', 'short', 'essay'], q.type || '(kế thừa nhóm)', v => {
        if (v === '(kế thừa nhóm)') delete q.type; else q.type = v;
        markDirty();
        renderEditor();
        renderPreview();
      }));
    }

    // Stem / question_text
    const stemKey = isSub ? 'question_text' : 'stem';
    f.appendChild(formTextarea('Đề bài' + (isSub ? ' (question_text)' : ' (stem) — hỗ trợ LaTeX $…$ hoặc \\(…\\) và <div class="jxg-diagram" data-jxg="…">'), q[stemKey] || '', v => {
      q[stemKey] = v;
      markDirty();
      debouncedPreview();
    }, 'stem'));

    // Type-specific body
    if (type === 'multiple_choice') renderMCOptions(f, q);
    else if (type === 'true_false') renderTFStatements(f, q);

    // final_answer (short/essay/all)
    f.appendChild(formField('Đáp số (final_answer)', 'text', q.final_answer || '', v => {
      q.final_answer = v;
      markDirty();
      debouncedPreview();
    }));

    // detailed_explanation
    f.appendChild(formTextarea('Lời giải chi tiết (detailed_explanation)', q.detailed_explanation || '', v => {
      q.detailed_explanation = v;
      markDirty();
      debouncedPreview();
    }, 'expl'));

    // Inline buttons: insert diagram
    const btns = h('div', { class: 'inline-btns' }, [
      h('button', { class: 'btn-add', onclick: () => openPresetGallery() }, '🎨 Thư viện preset'),
      h('button', { class: 'btn-add', onclick: () => insertRawHtml('<div class="jxg-diagram" data-jxg=\'{"preset":"axes","bbox":[-5,5,5,-5],"height":200}\'></div>') }, 'Chèn template <jxg>'),
      h('button', { class: 'btn-add', onclick: () => insertRawHtml('$...$') }, 'Chèn $...$')
    ]);
    f.appendChild(btns);
  }

  function renderSubList(q) {
    const root = $('subq-list');
    root.innerHTML = '';
    (q.sub_questions || []).forEach((sub, i) => {
      const row = h('div', { class: 'subq-block' }, [
        h('div', { class: 'subq-hdr' }, [
          h('strong', {}, `Sub ${i + 1}: ${sub.q_id || '(no id)'}`),
          h('div', {}, [
            h('button', { class: 'btn-add', onclick: () => select(state.selected.qIdx, i) }, 'Sửa →'),
            ' ',
            h('button', { class: 'btn-add danger', onclick: () => {
                if (!confirm('Xoá sub-question này?')) return;
                q.sub_questions.splice(i, 1);
                markDirty();
                renderList();
                renderEditor();
                renderPreview();
              } }, 'Xoá')
          ])
        ]),
        h('div', { style: 'font-size:12px;color:var(--muted);max-height:50px;overflow:hidden' }, (sub.question_text || sub.stem || '').slice(0, 200))
      ]);
      root.appendChild(row);
    });
  }

  function renderMCOptions(f, q) {
    q.options = Array.isArray(q.options) ? q.options : ['', '', '', ''];
    q.correct_index = Number.isInteger(q.correct_index) ? q.correct_index : 0;
    const wrap = h('div', { class: 'group' }, [h('label', {}, 'Lựa chọn (chọn 1 đúng)')]);
    const list = h('div', {});
    wrap.appendChild(list);
    function rerender() {
      list.innerHTML = '';
      q.options.forEach((opt, i) => {
        const row = h('div', { class: 'option-row' });
        const radio = h('input', { type: 'radio', name: 'correct-opt', checked: q.correct_index === i ? 'checked' : null });
        radio.checked = q.correct_index === i;
        radio.addEventListener('change', () => { q.correct_index = i; markDirty(); debouncedPreview(); });
        const letter = h('strong', { style: 'width:18px;text-align:center;line-height:36px' }, letterFromIndex(i) + '.');
        const ta = h('textarea', {
          onInput: (e) => { q.options[i] = e.target.value; markDirty(); debouncedPreview(); }
        });
        ta.value = opt;
        ta.addEventListener('focus', () => { state.lastFocus = ta; });
        const del = h('button', { class: 'danger small', onclick: () => {
            q.options.splice(i, 1);
            if (q.correct_index >= q.options.length) q.correct_index = Math.max(0, q.options.length - 1);
            markDirty(); debouncedPreview(); rerender();
          } }, '✕');
        row.appendChild(radio);
        row.appendChild(letter);
        row.appendChild(ta);
        row.appendChild(h('div', { class: 'row-actions' }, [del]));
        list.appendChild(row);
      });
      const addBtn = h('button', { class: 'btn-add', onclick: () => { q.options.push(''); markDirty(); rerender(); } }, '+ Thêm lựa chọn');
      list.appendChild(addBtn);
    }
    rerender();
    f.appendChild(wrap);
  }

  function renderTFStatements(f, q) {
    q.statements = Array.isArray(q.statements) ? q.statements : ['', '', '', ''];
    q.correct_values = Array.isArray(q.correct_values) ? q.correct_values : q.statements.map(() => true);
    while (q.correct_values.length < q.statements.length) q.correct_values.push(true);
    const wrap = h('div', { class: 'group' }, [h('label', {}, 'Các mệnh đề (check = đúng)')]);
    const list = h('div', {});
    wrap.appendChild(list);
    function rerender() {
      list.innerHTML = '';
      q.statements.forEach((stmt, i) => {
        const row = h('div', { class: 'stmt-row' });
        const chk = h('input', { type: 'checkbox' });
        chk.checked = !!q.correct_values[i];
        chk.addEventListener('change', () => { q.correct_values[i] = chk.checked; markDirty(); debouncedPreview(); });
        const letter = h('strong', { style: 'width:18px;text-align:center;line-height:36px' }, String.fromCharCode(97 + i) + ')');
        const ta = h('textarea', {
          onInput: (e) => { q.statements[i] = e.target.value; markDirty(); debouncedPreview(); }
        });
        ta.value = stmt;
        ta.addEventListener('focus', () => { state.lastFocus = ta; });
        const del = h('button', { class: 'danger small', onclick: () => {
            q.statements.splice(i, 1);
            q.correct_values.splice(i, 1);
            markDirty(); debouncedPreview(); rerender();
          } }, '✕');
        row.appendChild(chk);
        row.appendChild(letter);
        row.appendChild(ta);
        row.appendChild(h('div', { class: 'row-actions' }, [del]));
        list.appendChild(row);
      });
      const addBtn = h('button', { class: 'btn-add', onclick: () => { q.statements.push(''); q.correct_values.push(true); markDirty(); rerender(); } }, '+ Thêm mệnh đề');
      list.appendChild(addBtn);
    }
    rerender();
    f.appendChild(wrap);
  }

  function formField(label, type, value, onChange) {
    const wrap = h('div', { class: 'group' });
    wrap.appendChild(h('label', {}, label));
    const inp = h('input', { type });
    inp.value = value;
    inp.addEventListener('input', e => onChange(e.target.value));
    inp.addEventListener('focus', () => { state.lastFocus = inp; });
    wrap.appendChild(inp);
    return wrap;
  }

  function formTextarea(label, value, onChange, cls) {
    const wrap = h('div', { class: 'group' });
    wrap.appendChild(h('label', {}, label));
    const ta = h('textarea', { class: cls || '' });
    ta.value = value;
    ta.addEventListener('input', e => onChange(e.target.value));
    ta.addEventListener('focus', () => { state.lastFocus = ta; });
    wrap.appendChild(ta);
    return wrap;
  }

  function formSelect(label, opts, value, onChange) {
    const wrap = h('div', { class: 'group' });
    wrap.appendChild(h('label', {}, label));
    const sel = h('select', {});
    opts.forEach(o => {
      const op = document.createElement('option');
      op.value = o;
      op.textContent = o;
      if (o === value) op.selected = true;
      sel.appendChild(op);
    });
    sel.addEventListener('change', e => onChange(e.target.value));
    wrap.appendChild(sel);
    return wrap;
  }

  function insertRawHtml(snippet) {
    const ta = state.lastFocus;
    if (!ta || (ta.tagName !== 'TEXTAREA' && ta.tagName !== 'INPUT')) {
      toast('Bấm vào ô văn bản trước khi chèn', 'err');
      return;
    }
    const start = ta.selectionStart || 0;
    const end = ta.selectionEnd || 0;
    ta.value = ta.value.slice(0, start) + snippet + ta.value.slice(end);
    ta.selectionStart = ta.selectionEnd = start + snippet.length;
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.focus();
  }

  // ================== PREVIEW ==================
  let previewTimer = null;
  function debouncedPreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(renderPreview, 350);
  }

  function partitionSections(exam) {
    const map = new Map();
    (exam.questions || []).forEach(q => {
      const s = q.section || 'Phần chung';
      if (!map.has(s)) map.set(s, []);
      map.get(s).push(q);
    });
    return Array.from(map.entries()).map(([title, items]) => ({ title, items }));
  }

  function renderQuestionHtml(q, parentType, counter) {
    const type = q.type || parentType || 'multiple_choice';
    let body = '';
    const stem = (q.stem || q.question_text || '').replace(/\n/g, '<br>');
    body += `<div class="q-body"><div class="qstem">${stem}</div>`;

    if (type === 'multiple_choice' && Array.isArray(q.options)) {
      body += '<div class="mt-2" style="margin-top:8px">';
      q.options.forEach((opt, i) => {
        const txt = typeof opt === 'string' ? opt : (opt && opt.text) || '';
        const correct = i === q.correct_index;
        body += `<div class="mc-opt ${correct ? 'correct' : ''}"><span class="letter">${letterFromIndex(i)}.</span>${txt}${correct ? ' ✓' : ''}</div>`;
      });
      body += '</div>';
    } else if (type === 'true_false' && Array.isArray(q.statements)) {
      body += '<div style="margin-top:8px">';
      q.statements.forEach((s, i) => {
        const v = q.correct_values && q.correct_values[i];
        body += `<div class="tf-opt"><div><span class="letter">${String.fromCharCode(97 + i)})</span>${s}</div><div class="${v ? 'tf-true' : 'tf-false'}">${v ? 'Đúng' : 'Sai'}</div></div>`;
      });
      body += '</div>';
    }

    if (q.detailed_explanation) {
      body += `<div class="expl"><div class="expl-hdr">Lời giải chi tiết:</div>${q.detailed_explanation.replace(/\n/g, '<br>')}</div>`;
    }
    if (q.final_answer) {
      body += `<div class="final-ans"><strong>Đáp số:</strong> ${esc(q.final_answer)}</div>`;
    }
    body += '</div>';

    return `<div class="question-container" data-pv-idx="${counter}"><div class="q-head"><span class="q-num">${counter}</span>${body}</div></div>`;
  }

  function renderPreview() {
    const root = $('preview');
    root.className = 'preview';
    if (!state.exam) {
      root.className = 'preview empty';
      root.innerHTML = 'Chưa có dữ liệu.';
      return;
    }
    const onlyCurrent = $('chk-only-current') && $('chk-only-current').checked;
    let html = '';
    let counter = 1;
    const sel = getSelectedItem();
    const selQIdx = state.selected ? state.selected.qIdx : -1;
    const selSubIdx = state.selected ? state.selected.subIdx : null;

    if (onlyCurrent && sel) {
      // Render single question (or whole group if group itself selected)
      const q = state.exam.questions[selQIdx];
      html += `<h2 class="section-title">${esc(q.section || 'Phần chung')}</h2>`;
      if (q.is_group && Array.isArray(q.sub_questions)) {
        if (selSubIdx !== null && selSubIdx !== undefined) {
          // preview just the selected sub
          html += renderQuestionHtml(q.sub_questions[selSubIdx], q.type, 1).replace('question-container', 'question-container active-pv');
        } else {
          q.sub_questions.forEach((sub, i) => {
            html += renderQuestionHtml(sub, q.type, i + 1);
          });
        }
      } else {
        html += renderQuestionHtml(q, null, 1).replace('question-container', 'question-container active-pv');
      }
    } else {
      const sections = partitionSections(state.exam);
      sections.forEach(sec => {
        html += `<h2 class="section-title">${esc(sec.title)}</h2>`;
        sec.items.forEach(item => {
          if (item.is_group && Array.isArray(item.sub_questions)) {
            item.sub_questions.forEach((sub, i) => {
              const parentIdx = state.exam.questions.indexOf(item);
              const activeCls = (selQIdx === parentIdx && selSubIdx === i) ? 'active-pv' : '';
              html += renderQuestionHtml(sub, item.type, counter).replace('question-container', 'question-container ' + activeCls);
              counter++;
            });
          } else {
            const idx = state.exam.questions.indexOf(item);
            const activeCls = (selQIdx === idx && selSubIdx === null) ? 'active-pv' : '';
            html += renderQuestionHtml(item, null, counter).replace('question-container', 'question-container ' + activeCls);
            counter++;
          }
        });
      });
    }

    root.innerHTML = html;
    resetDiagramsIn(root);
    renderDiagramsIn(root);
    typesetMathJax(root);
    scrollPreviewToSelected();
  }

  function scrollPreviewToSelected() {
    const active = $('preview').querySelector('.active-pv');
    if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ================== PRESET GALLERY ==================
  // Registry is defined in a separate file for clarity.
  function buildPresetTabs() {
    const tabs = $('preset-tabs');
    const cats = ['all'];
    (window.PRESETS || []).forEach(p => { if (!cats.includes(p.category)) cats.push(p.category); });
    tabs.innerHTML = '';
    cats.forEach((c, i) => {
      const t = h('div', { class: 'tab' + (i === 0 ? ' active' : ''), 'data-cat': c, onclick: () => {
          tabs.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
          t.classList.add('active');
          renderPresetGrid(c, $('preset-search').value);
        } }, c === 'all' ? 'Tất cả' : c);
      tabs.appendChild(t);
    });
  }

  function renderPresetGrid(cat, search) {
    const grid = $('preset-grid');
    grid.innerHTML = '';
    const q = (search || '').trim().toLowerCase();
    const presets = (window.PRESETS || []).filter(p => {
      if (cat !== 'all' && p.category !== cat) return false;
      if (q) {
        const hay = (p.id + ' ' + p.title + ' ' + (p.desc || '') + ' ' + (p.tags || []).join(' ')).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    presets.forEach((p, i) => {
      const thumbId = `thumb-${p.id}-${i}`;
      const card = h('div', { class: 'preset-card', onclick: () => openCfgModal(p) }, [
        h('div', { class: 'thumb', id: thumbId }),
        h('div', { class: 'title' }, p.title),
        h('div', { class: 'desc' }, p.desc || ''),
        p.category ? h('span', { class: 'tag' }, p.category) : null
      ]);
      grid.appendChild(card);
      // Render thumbnail after a tick (board needs container in DOM with size)
      setTimeout(() => {
        const wrap = document.getElementById(thumbId);
        if (!wrap || wrap.dataset.done) return;
        wrap.dataset.done = '1';
        const el = document.createElement('div');
        el.className = 'jxg-diagram';
        el.style.width = '100%';
        el.style.height = '100%';
        el.style.border = 'none';
        el.style.margin = '0';
        el.style.borderRadius = '0';
        const sp = Object.assign({}, p.sample || { preset: 'axes', bbox: [-5, 5, 5, -5], height: 110 });
        sp.height = 110;
        el.setAttribute('data-jxg', JSON.stringify(sp));
        wrap.appendChild(el);
        if (window.Diagrams) Diagrams.renderAll(wrap, { mode: 'static' });
      }, 40);
    });
    if (presets.length === 0) {
      grid.appendChild(h('div', { class: 'empty' }, 'Không có preset phù hợp'));
    }
  }

  function openPresetGallery() {
    $('preset-modal').classList.add('open');
    buildPresetTabs();
    renderPresetGrid('all', '');
  }
  window.closePresetModal = () => { $('preset-modal').classList.remove('open'); };

  $('preset-search') && $('preset-search').addEventListener('input', e => {
    const active = $('preset-tabs').querySelector('.tab.active');
    renderPresetGrid(active ? active.dataset.cat : 'all', e.target.value);
  });

  // ================== PRESET CONFIG MODAL ==================
  function openCfgModal(preset) {
    state.currentPreset = preset;
    state.currentSpec = JSON.parse(JSON.stringify(preset.sample || { preset: preset.id }));
    if (!state.currentSpec.preset) state.currentSpec.preset = preset.id;
    $('cfg-title').textContent = `Cấu hình: ${preset.title}`;
    renderCfgForm();
    $('cfg-modal').classList.add('open');
    setTimeout(() => refreshCfgPreview(), 50);
  }
  window.closeCfgModal = () => {
    $('cfg-modal').classList.remove('open');
    if (state.cfgBoard && window.JXG && JXG.JSXGraph) {
      try { JXG.JSXGraph.freeBoard(state.cfgBoard); } catch (e) { }
      state.cfgBoard = null;
    }
  };

  function renderCfgForm() {
    const p = state.currentPreset;
    const spec = state.currentSpec;
    const root = $('cfg-form');
    root.innerHTML = '';
    // BBox (universal)
    const bbox = Array.isArray(spec.bbox) ? spec.bbox : [-5, 5, 5, -5];
    root.appendChild(cfgGroup('Bbox [xmin, ymax, xmax, ymin]', h('input', {
      value: bbox.join(','),
      onInput: (e) => {
        const parts = e.target.value.split(',').map(s => Number(s.trim()));
        if (parts.length === 4 && parts.every(n => !isNaN(n))) {
          spec.bbox = parts;
          refreshCfgPreview();
        }
      }
    })));
    // Height/width
    root.appendChild(cfgGroup('Height (px)', h('input', {
      type: 'number', value: spec.height || 240,
      onInput: (e) => { spec.height = Number(e.target.value) || 240; refreshCfgPreview(); }
    })));
    root.appendChild(cfgChk('grid', 'Hiện lưới (grid)', !!spec.grid, v => { spec.grid = v; refreshCfgPreview(); }));
    root.appendChild(cfgChk('axes', 'Hiện trục (axes)', spec.axes !== false, v => {
      if (v) delete spec.axes; else spec.axes = false;
      refreshCfgPreview();
    }));
    root.appendChild(cfgChk('keepAspectRatio', 'Giữ tỉ lệ (keepAspectRatio)', spec.keepAspectRatio !== false, v => {
      spec.keepAspectRatio = v; refreshCfgPreview();
    }));

    // Preset-specific fields
    (p.fields || []).forEach(f => {
      if (f.type === 'number') {
        root.appendChild(cfgGroup(f.label + (f.hint ? ` <span style="color:var(--muted);font-weight:400">${esc(f.hint)}</span>` : ''), h('input', {
          type: 'number', step: f.step || 'any',
          value: (spec[f.key] !== undefined) ? spec[f.key] : (f.default !== undefined ? f.default : ''),
          onInput: (e) => {
            const v = e.target.value;
            if (v === '') delete spec[f.key]; else spec[f.key] = Number(v);
            refreshCfgPreview();
          }
        })));
      } else if (f.type === 'text') {
        root.appendChild(cfgGroup(f.label, h('input', {
          value: spec[f.key] !== undefined ? spec[f.key] : (f.default || ''),
          onInput: (e) => { const v = e.target.value; if (v === '') delete spec[f.key]; else spec[f.key] = v; refreshCfgPreview(); }
        })));
      } else if (f.type === 'bool') {
        root.appendChild(cfgChk('fld-' + f.key, f.label, spec[f.key] !== undefined ? !!spec[f.key] : !!f.default, v => { spec[f.key] = v; refreshCfgPreview(); }));
      } else if (f.type === 'json') {
        const ta = h('textarea', {
          rows: 5,
          onInput: (e) => {
            try { spec[f.key] = JSON.parse(e.target.value); refreshCfgPreview(); } catch (err) { /* wait for valid */ }
          }
        });
        ta.value = spec[f.key] !== undefined ? JSON.stringify(spec[f.key], null, 2) : (f.default || '');
        root.appendChild(cfgGroup(f.label + (f.hint ? ` <span style="color:var(--muted);font-weight:400">${esc(f.hint)}</span>` : ''), ta));
      } else if (f.type === 'select') {
        const sel = h('select', {
          onChange: (e) => { spec[f.key] = e.target.value; refreshCfgPreview(); }
        });
        (f.options || []).forEach(o => {
          const op = document.createElement('option');
          op.value = o;
          op.textContent = o;
          if ((spec[f.key] || f.default) === o) op.selected = true;
          sel.appendChild(op);
        });
        root.appendChild(cfgGroup(f.label, sel));
      }
    });

    // Free JSON edit
    const freeTa = h('textarea', { rows: 5, style: 'width:100%;font-family:monospace;font-size:11.5px' });
    freeTa.value = JSON.stringify(spec, null, 2);
    freeTa.addEventListener('input', () => {
      try {
        const parsed = JSON.parse(freeTa.value);
        state.currentSpec = parsed;
        refreshCfgPreview(false); // avoid loop-rewriting ta
      } catch (e) { /* ignore */ }
    });
    root.appendChild(cfgGroup('⚙️ JSON (nâng cao — chỉnh trực tiếp)', freeTa));
  }

  function cfgGroup(labelHtml, child) {
    const g = h('div', { class: 'fld' });
    const lb = h('label', { html: labelHtml });
    g.appendChild(lb);
    g.appendChild(child);
    return g;
  }
  function cfgChk(id, label, value, onChange) {
    const g = h('div', { class: 'fld checkbox' });
    const c = h('input', { type: 'checkbox', id });
    c.checked = !!value;
    c.addEventListener('change', () => onChange(c.checked));
    g.appendChild(c);
    g.appendChild(h('label', { for: id, style: 'margin:0;text-transform:none;letter-spacing:normal;font-size:12px;color:#334155' }, label));
    return g;
  }

  function refreshCfgPreview(regenerateForm = true) {
    const spec = state.currentSpec;
    $('cfg-json').textContent = `<div class="jxg-diagram" data-jxg='${JSON.stringify(spec)}'></div>`;
    const wrap = $('cfg-board-wrap');
    wrap.innerHTML = '<div id="cfg-board" style="width:100%;height:100%"></div>';
    const el = document.getElementById('cfg-board');
    el.className = 'jxg-diagram';
    el.setAttribute('data-jxg', JSON.stringify(spec));
    el.style.height = '100%';
    el.style.width = '100%';
    el.style.border = 'none';
    el.style.margin = '0';
    el.style.borderRadius = '0';
    if (window.Diagrams) Diagrams.renderAll(wrap, { mode: 'static' });
  }

  $('btn-insert-diagram').addEventListener('click', () => {
    const snippet = `<div class="jxg-diagram" data-jxg='${JSON.stringify(state.currentSpec)}'></div>`;
    insertRawHtml(snippet);
    closeCfgModal();
    closePresetModal();
    debouncedPreview();
    toast('Đã chèn diagram', 'ok');
  });

  // ================== WIRING ==================
  $('btn-load').addEventListener('click', () => loadByPath($('pathInput').value.trim()));
  $('pathInput').addEventListener('keydown', e => { if (e.key === 'Enter') loadByPath(e.target.value.trim()); });
  $('btn-upload').addEventListener('click', () => $('fileInput').click());
  $('fileInput').addEventListener('change', e => { if (e.target.files[0]) loadFromFile(e.target.files[0]); });
  $('btn-save').addEventListener('click', saveExam);
  $('btn-toggle-preview').addEventListener('click', () => document.body.classList.toggle('hide-preview'));
  $('btn-preset-gallery').addEventListener('click', () => openPresetGallery());
  $('btn-add-q').addEventListener('click', addQuestion);
  $('btn-add-group').addEventListener('click', addGroupQuestion);
  $('btn-delete-q').addEventListener('click', deleteSelected);
  $('btn-duplicate').addEventListener('click', duplicateSelected);
  $('btn-move-up').addEventListener('click', () => moveSelected(-1));
  $('btn-move-down').addEventListener('click', () => moveSelected(1));
  $('chk-only-current').addEventListener('change', renderPreview);

  // Auto-load from ?path=... query
  const params = new URLSearchParams(location.search);
  const initPath = params.get('path');
  if (initPath) {
    $('pathInput').value = initPath;
    loadByPath(initPath);
  }

  // Save dialog warn on leave
  window.addEventListener('beforeunload', (e) => {
    if (state.dirty) { e.preventDefault(); e.returnValue = ''; }
  });

  // Ctrl+S to save
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (state.exam) saveExam();
    }
    if (e.key === 'Escape') {
      if ($('cfg-modal').classList.contains('open')) closeCfgModal();
      else if ($('preset-modal').classList.contains('open')) closePresetModal();
    }
  });

  // Expose for debugging
  window._editor = state;
})();
