/* =========================================================
 * JSX Editor — APP (UI wiring)
 * ========================================================= */
(function () {
  'use strict';

  const Core = window.JSXEditor.Core;
  const Tools = window.JSXEditor.Tools;
  const Exp = window.JSXEditor.Export;

  // ================== DOM ==================
  const $ = (id) => document.getElementById(id);
  const qsa = (sel) => Array.from(document.querySelectorAll(sel));

  let activeTab = 'scene';

  // ================== SAMPLE ==================
  const SAMPLE_LOG = [
    { id: 'A', kind: 'point', args: [-3, -1], style: { color: '#dc2626', size: 3, label: 'A' } },
    { id: 'B', kind: 'point', args: [3, -1], style: { color: '#dc2626', size: 3, label: 'B' } },
    { id: 'C', kind: 'point', args: [0, 3], style: { color: '#dc2626', size: 3, label: 'C' } },
    { id: 'poly1', kind: 'polygon', args: ['A', 'B', 'C'], style: { color: '#0f172a', strokeWidth: 2, fillOpacity: 0.1, fillColor: '#3b82f6' } },
    { id: 'D', kind: 'midpoint', args: ['A', 'B'], style: { color: '#16a34a', size: 3, label: 'D' } },
    { id: 's1', kind: 'segment', args: ['C', 'D'], style: { color: '#16a34a', strokeWidth: 2, dash: 2 } }
  ];

  // ================== INIT ==================
  function init() {
    // Init board
    Core.initBoard('board', Core.getBoardOpts());
    Tools.attachBoardEvents('board');
    Tools.setOnHintChange(updateHint);
    Tools.setOnToolReset(() => refreshAll());
    Core.setOnChange(() => refreshAll());

    // Top buttons
    $('btn-undo').addEventListener('click', () => Core.undo());
    $('btn-redo').addEventListener('click', () => Core.redo());
    $('btn-clear').addEventListener('click', () => {
      if (Core.getLog().length === 0) return;
      if (confirm('Xoá toàn bộ hình?')) Core.clearAll();
    });
    $('btn-load-sample').addEventListener('click', () => Core.loadLog(SAMPLE_LOG));

    // Tool buttons
    qsa('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.dataset.tool;
        Tools.setTool(tool);
        setActiveTool(tool);
      });
    });
    setActiveTool('move');
    Tools.setTool('move');

    // Board option controls
    $('btn-apply-board').addEventListener('click', applyBoardOptions);
    ['bbox-input', 'height-input', 'chk-grid', 'chk-axes', 'chk-aspect'].forEach(id => {
      const el = $(id);
      if (!el) return;
      el.addEventListener('change', () => {
        // instant apply for checkboxes
        if (el.type === 'checkbox') applyBoardOptions();
      });
    });

    // Output tabs
    qsa('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab;
        qsa('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
        refreshOutput();
      });
    });

    $('btn-copy').addEventListener('click', async () => {
      const text = $('output').value;
      try {
        await navigator.clipboard.writeText(text);
        flashBtn($('btn-copy'), '✓ Đã copy');
      } catch (e) {
        // fallback
        $('output').select(); document.execCommand('copy');
        flashBtn($('btn-copy'), '✓ Đã copy');
      }
    });

    $('btn-download').addEventListener('click', () => {
      const text = $('output').value;
      let name = 'diagram';
      if (activeTab === 'scene') name += '.json';
      else if (activeTab === 'code') name += '.js';
      else name += '.html';
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    });

    // Keyboard shortcuts
    window.addEventListener('keydown', (ev) => {
      if (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA') return;
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') {
        ev.preventDefault(); Core.undo();
      } else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'y') {
        ev.preventDefault(); Core.redo();
      } else if (ev.key === 'Delete' || ev.key === 'Backspace') {
        const sid = Core.getSelected();
        if (sid) {
          const r = Core.removeCommand(sid, false);
          if (!r.removed) {
            const ok = confirm(`Đang có ${r.dependents.length} đối tượng phụ thuộc. Xoá tất cả?`);
            if (ok) Core.removeCommand(sid, true);
          }
        }
      } else {
        const map = { v: 'move', p: 'point', s: 'segment', l: 'line', o: 'polygon', c: 'circle', m: 'midpoint', x: 'intersect', d: 'delete' };
        const t = map[ev.key.toLowerCase()];
        if (t) { Tools.setTool(t); setActiveTool(t); }
      }
    });

    refreshAll();
  }

  function setActiveTool(name) {
    qsa('.tool-btn').forEach(b => b.classList.toggle('active', b.dataset.tool === name));
  }

  function applyBoardOptions() {
    const bboxStr = $('bbox-input').value;
    const parts = bboxStr.split(',').map(s => Number(s.trim()));
    const bbox = (parts.length === 4 && parts.every(n => !isNaN(n))) ? parts : Core.getBoardOpts().bbox;
    const height = Number($('height-input').value) || 260;
    const grid = $('chk-grid').checked;
    const axis = $('chk-axes').checked;
    const keepAspectRatio = $('chk-aspect').checked;
    Core.initBoard('board', { bbox, height, grid, axis, keepAspectRatio });
    Tools.attachBoardEvents('board');
    Tools.applyBoardInteractivity();
  }

  function updateHint(msg) {
    const el = $('hint-bar');
    if (!el) return;
    if (!msg) { el.style.display = 'none'; return; }
    el.textContent = msg;
    el.style.display = 'block';
  }

  // ================== REFRESH ==================
  function refreshAll() {
    refreshLog();
    refreshOutput();
    refreshStylePanel();
    syncBoardOptionInputs();
  }

  function syncBoardOptionInputs() {
    const o = Core.getBoardOpts();
    $('bbox-input').value = o.bbox.join(', ');
    $('height-input').value = o.height || 260;
    $('chk-grid').checked = !!o.grid;
    $('chk-axes').checked = o.axis !== false;
    $('chk-aspect').checked = o.keepAspectRatio !== false;
  }

  function refreshLog() {
    const root = $('log-list');
    const log = Core.getLog();
    $('log-count').textContent = log.length;
    root.innerHTML = '';
    if (log.length === 0) {
      root.innerHTML = '<div class="text-xs text-slate-400 italic p-2">Chưa có lệnh nào. Chọn công cụ ở trái và click lên board để bắt đầu.</div>';
      return;
    }
    const sel = Core.getSelected();
    log.forEach((c, i) => {
      const row = document.createElement('div');
      row.className = 'log-row' + (sel === c.id ? ' selected' : '');
      const txt = document.createElement('span');
      txt.innerHTML = `<span style="color:#94a3b8">${String(i + 1).padStart(2, ' ')}</span>  ${Exp.formatLogLine(c)}`;
      txt.style.cursor = 'pointer';
      txt.addEventListener('click', () => Core.setSelected(c.id));
      const del = document.createElement('button');
      del.textContent = '×';
      del.title = 'Xoá lệnh này (và đối tượng phụ thuộc)';
      del.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const r = Core.removeCommand(c.id, false);
        if (!r.removed) {
          const ok = confirm(`Đang có ${r.dependents.length} đối tượng phụ thuộc. Xoá tất cả?`);
          if (ok) Core.removeCommand(c.id, true);
        }
      });
      row.appendChild(txt);
      row.appendChild(del);
      root.appendChild(row);
    });
  }

  function refreshOutput() {
    const log = Core.getLog();
    const out = $('output');
    const note = $('output-note');
    if (log.length === 0) {
      out.value = '';
      note.textContent = 'Trống.';
      return;
    }
    if (activeTab === 'scene') {
      if (Exp.canUseScene(log)) {
        out.value = Exp.toSceneJSONString();
        note.innerHTML = '✓ Tương thích <span class="kbd">preset=scene</span>. Có thể nhúng trực tiếp vào exam JSON.';
      } else {
        out.value = Exp.toSceneJSONString();
        note.innerHTML = '⚠ Có lệnh dựng hình (midpoint/perpendicular/…) — scene JSON chỉ giữ primitives. Dùng tab <b>JSXGraph code</b> để có đầy đủ.';
      }
    } else if (activeTab === 'code') {
      out.value = Exp.toJSXCode();
      note.textContent = 'Code JSXGraph thô, tương thích full. Cần div id="jxgbox" + jsxgraphcore.js đã load.';
    } else if (activeTab === 'snippet') {
      out.value = Exp.toHtmlSnippet();
      note.innerHTML = 'Snippet <span class="kbd">&lt;div class="jxg-diagram" data-jxg=\'…\'&gt;</span> dùng cho exam.json hoặc trang có <b>diagrams.js</b>.';
    }
  }

  function flashBtn(btn, text) {
    const old = btn.textContent;
    btn.textContent = text;
    setTimeout(() => { btn.textContent = old; }, 900);
  }

  // ================== STYLE PANEL ==================
  function refreshStylePanel() {
    const sid = Core.getSelected();
    const cmd = sid ? Core.byId(sid) : null;
    const label = $('sel-label');
    const root = $('style-controls');
    if (!cmd) {
      label.textContent = '(chưa chọn)';
      root.innerHTML = '<div class="text-xs text-slate-400 italic">Click vào một đối tượng trong log hoặc trên board để chỉnh thuộc tính.</div>';
      return;
    }
    label.textContent = `${cmd.id} · ${cmd.kind}`;
    root.innerHTML = '';
    const s = cmd.style || {};
    const isPt = Core.isPointKind(cmd.kind);
    const isPoly = cmd.kind === 'polygon';

    // Color
    addStyleRow(root, 'Màu', buildColorInput(s.color || (isPt ? '#dc2626' : '#2563eb'), v => Core.updateStyle(cmd.id, { color: v })));

    if (isPt) {
      addStyleRow(root, 'Kích cỡ', buildNumberInput(s.size || 3, v => Core.updateStyle(cmd.id, { size: v }), 1, 10));
      addStyleRow(root, 'Nhãn', buildTextInput(s.label !== undefined ? s.label : cmd.id, v => Core.updateStyle(cmd.id, { label: v })));
    } else if (isPoly) {
      addStyleRow(root, 'Viền rộng', buildNumberInput(s.strokeWidth || 2, v => Core.updateStyle(cmd.id, { strokeWidth: v }), 0, 8, 0.5));
      addStyleRow(root, 'Màu tô', buildColorInput(s.fillColor || '#3b82f6', v => Core.updateStyle(cmd.id, { fillColor: v })));
      addStyleRow(root, 'Độ mờ', buildNumberInput(s.fillOpacity !== undefined ? s.fillOpacity : 0.08, v => Core.updateStyle(cmd.id, { fillOpacity: v }), 0, 1, 0.05));
    } else {
      addStyleRow(root, 'Độ rộng', buildNumberInput(s.strokeWidth || 2, v => Core.updateStyle(cmd.id, { strokeWidth: v }), 0.5, 8, 0.5));
      addStyleRow(root, 'Dash', buildSelect(s.dash || 0, [[0, 'liền'], [1, '. . .'], [2, '— —'], [3, '— . —']], v => Core.updateStyle(cmd.id, { dash: Number(v) })));
    }

    // Visible
    const chkDiv = document.createElement('div');
    chkDiv.className = 'style-row';
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = s.visible !== false;
    chk.addEventListener('change', () => Core.updateStyle(cmd.id, { visible: chk.checked }));
    chkDiv.appendChild(chk);
    const lb = document.createElement('label');
    lb.textContent = 'Hiển thị';
    lb.style.minWidth = 'auto';
    chkDiv.appendChild(lb);
    root.appendChild(chkDiv);

    // Delete button
    const delBtn = document.createElement('button');
    delBtn.className = 'top-btn text-xs';
    delBtn.style.color = '#dc2626';
    delBtn.textContent = '🗑 Xoá đối tượng';
    delBtn.addEventListener('click', () => {
      const r = Core.removeCommand(cmd.id, false);
      if (!r.removed) {
        const ok = confirm(`Đang có ${r.dependents.length} đối tượng phụ thuộc. Xoá tất cả?`);
        if (ok) Core.removeCommand(cmd.id, true);
      }
    });
    root.appendChild(delBtn);
  }

  function addStyleRow(root, label, inputEl) {
    const div = document.createElement('div');
    div.className = 'style-row';
    const lb = document.createElement('label');
    lb.textContent = label;
    div.appendChild(lb);
    div.appendChild(inputEl);
    root.appendChild(div);
  }
  function buildColorInput(value, onChange) {
    const w = document.createElement('span');
    const c = document.createElement('input');
    c.type = 'color';
    c.value = value;
    c.addEventListener('input', () => onChange(c.value));
    const tx = document.createElement('input');
    tx.type = 'text';
    tx.value = value;
    tx.style.width = '68px';
    tx.addEventListener('change', () => {
      if (/^#[0-9a-fA-F]{3,8}$/.test(tx.value)) { c.value = tx.value; onChange(tx.value); }
    });
    c.addEventListener('input', () => tx.value = c.value);
    w.appendChild(c); w.appendChild(tx);
    return w;
  }
  function buildNumberInput(value, onChange, min, max, step) {
    const i = document.createElement('input');
    i.type = 'number';
    i.value = value;
    if (min !== undefined) i.min = min;
    if (max !== undefined) i.max = max;
    if (step !== undefined) i.step = step;
    i.addEventListener('input', () => onChange(Number(i.value)));
    return i;
  }
  function buildTextInput(value, onChange) {
    const i = document.createElement('input');
    i.type = 'text';
    i.value = value;
    i.addEventListener('input', () => onChange(i.value));
    return i;
  }
  function buildSelect(value, options, onChange) {
    const s = document.createElement('select');
    options.forEach(([v, lab]) => {
      const o = document.createElement('option');
      o.value = v; o.textContent = lab;
      if (String(v) === String(value)) o.selected = true;
      s.appendChild(o);
    });
    s.addEventListener('change', () => onChange(s.value));
    return s;
  }

  // ================== BOOT ==================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
