/* =========================================================
 * JSX Editor — CORE
 * Command log, DAG replay, undo/redo, picking.
 *
 * Command schema:
 *   { id, kind, args, style }
 *   kind ∈ point | segment | line | ray | polygon
 *          | circle_cp | circle_cr
 *          | midpoint | perpendicular | parallel | intersect | tangent
 *
 *   args for each kind:
 *     point          : [x, y]                (free point)
 *     segment        : [idA, idB]
 *     line           : [idA, idB]
 *     ray            : [idA, idB]            (from A through B)
 *     polygon        : [id1, id2, ..., idN]
 *     circle_cp      : [idCenter, idThrough]
 *     circle_cr      : [idCenter, radius]    (radius is number)
 *     midpoint       : [idA, idB]
 *     perpendicular  : [idPoint, idLine]     (returns a line)
 *     parallel       : [idPoint, idLine]
 *     intersect      : [idObj1, idObj2, index]  (index 0 or 1)
 *     tangent        : [idPoint, idCircle]
 *
 *   style: { color, strokeWidth, dash, fillOpacity, label, labelOffset, visible }
 * ========================================================= */
(function (global) {
  'use strict';

  const state = {
    log: [],                 // command list (source of truth)
    elements: {},            // id → JXG.Element (live)
    board: null,
    undoStack: [],           // snapshots of log (each is JSON string)
    redoStack: [],
    boardOpts: {             // persisted board options
      bbox: [-5, 5, 5, -5],
      grid: true,
      axis: true,
      keepAspectRatio: true,
      height: 260
    },
    idCounters: { point: 0, s: 0, l: 0, r: 0, poly: 0, c: 0, m: 0, perp: 0, par: 0, inter: 0, tan: 0 },
    selectedId: null,
    onChange: null           // invoked after any log-modifying op
  };

  // ================== UTIL ==================
  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
  function byId(id) { return state.log.find(c => c.id === id) || null; }
  function notify() { if (typeof state.onChange === 'function') state.onChange(); }

  function nextId(kind) {
    if (kind === 'point' || kind === 'midpoint' || kind === 'intersect' || kind === 'foot') {
      const n = state.idCounters.point++;
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      if (n < 26) return letters[n];
      return letters[n % 26] + Math.floor(n / 26);
    }
    const prefix = ({
      segment: 's', line: 'l', ray: 'r', polygon: 'poly',
      circle_cp: 'c', circle_cr: 'c',
      perpendicular: 'perp', parallel: 'par', tangent: 'tan'
    })[kind] || kind.slice(0, 2);
    const key = prefix === 's' ? 's'
      : prefix === 'l' ? 'l'
      : prefix === 'r' ? 'r'
      : prefix === 'poly' ? 'poly'
      : prefix === 'c' ? 'c'
      : prefix === 'perp' ? 'perp'
      : prefix === 'par' ? 'par'
      : prefix === 'tan' ? 'tan' : prefix;
    state.idCounters[key] = (state.idCounters[key] || 0) + 1;
    return prefix + state.idCounters[key];
  }

  // Default style for a given kind.
  function defaultStyle(kind) {
    const isPoint = (kind === 'point' || kind === 'midpoint' || kind === 'intersect' || kind === 'foot');
    if (isPoint) {
      return { color: '#dc2626', size: 3, label: '', visible: true };
    }
    if (kind === 'polygon') {
      return { color: '#0f172a', strokeWidth: 2, fillOpacity: 0.08, fillColor: '#3b82f6', visible: true };
    }
    return { color: '#2563eb', strokeWidth: 2, dash: 0, visible: true };
  }

  // ================== BOARD ==================
  function initBoard(containerId, opts) {
    const merged = Object.assign({}, state.boardOpts, opts || {});
    state.boardOpts = merged;
    if (state.board) {
      try { JXG.JSXGraph.freeBoard(state.board); } catch (e) { /* ignore */ }
      state.board = null;
    }
    // size container
    const container = document.getElementById(containerId);
    if (container && merged.height) container.style.height = merged.height + 'px';

    state.board = JXG.JSXGraph.initBoard(containerId, {
      boundingbox: merged.bbox,
      axis: merged.axis !== false,
      grid: merged.grid !== false,
      keepAspectRatio: merged.keepAspectRatio !== false,
      showCopyright: false,
      showNavigation: true,
      pan: { enabled: true, needShift: true },
      zoom: { wheel: true, needShift: false }
    });
    state.elements = {};
    replayAll();
    notify();
    return state.board;
  }

  function setBoardOpts(opts) {
    state.boardOpts = Object.assign({}, state.boardOpts, opts);
  }

  function getBoard() { return state.board; }
  function getBoardOpts() { return clone(state.boardOpts); }

  // ================== LOG OPS ==================
  function pushUndo() {
    state.undoStack.push(JSON.stringify(state.log));
    if (state.undoStack.length > 100) state.undoStack.shift();
    state.redoStack.length = 0;
  }

  function addCommand(cmd) {
    pushUndo();
    if (!cmd.id) cmd.id = nextId(cmd.kind);
    if (!cmd.style) cmd.style = defaultStyle(cmd.kind);
    // Point labels default to their id (A, B, C, …)
    if (isPointKind(cmd.kind) && !cmd.style.label) cmd.style.label = cmd.id;
    state.log.push(cmd);
    execCommand(cmd);
    notify();
    return cmd;
  }

  function removeCommand(id, cascade) {
    pushUndo();
    const cascadeSet = new Set();
    function mark(cid) {
      if (cascadeSet.has(cid)) return;
      cascadeSet.add(cid);
      // mark everything that references cid
      state.log.forEach(c => {
        if (c.id === cid) return;
        if (Array.isArray(c.args) && c.args.some(a => a === cid)) mark(c.id);
      });
    }
    mark(id);
    if (!cascade) {
      // only remove the item itself if no one depends
      const deps = Array.from(cascadeSet).filter(x => x !== id);
      if (deps.length > 0) {
        state.undoStack.pop();
        return { removed: false, dependents: deps };
      }
    }
    state.log = state.log.filter(c => !cascadeSet.has(c.id));
    if (cascadeSet.has(state.selectedId)) state.selectedId = null;
    rebuildBoard();
    notify();
    return { removed: true, dependents: [] };
  }

  function updateStyle(id, styleDelta) {
    const cmd = byId(id);
    if (!cmd) return;
    pushUndo();
    cmd.style = Object.assign({}, cmd.style || {}, styleDelta);
    rebuildBoard();
    notify();
  }

  function updatePointPosition(id, x, y) {
    const cmd = byId(id);
    if (!cmd || cmd.kind !== 'point') return;
    // don't pushUndo on every drag — use a single snapshot on mouseup
    cmd.args = [x, y];
    notify();
  }

  function undo() {
    if (state.undoStack.length === 0) return false;
    state.redoStack.push(JSON.stringify(state.log));
    state.log = JSON.parse(state.undoStack.pop());
    rebuildBoard();
    notify();
    return true;
  }

  function redo() {
    if (state.redoStack.length === 0) return false;
    state.undoStack.push(JSON.stringify(state.log));
    state.log = JSON.parse(state.redoStack.pop());
    rebuildBoard();
    notify();
    return true;
  }

  function clearAll() {
    if (state.log.length === 0) return;
    pushUndo();
    state.log = [];
    state.idCounters = { point: 0, s: 0, l: 0, r: 0, poly: 0, c: 0, m: 0, perp: 0, par: 0, inter: 0, tan: 0 };
    state.selectedId = null;
    rebuildBoard();
    notify();
  }

  function loadLog(log) {
    pushUndo();
    state.log = clone(log);
    // re-compute id counters based on max used id suffixes
    state.idCounters = { point: 0, s: 0, l: 0, r: 0, poly: 0, c: 0, m: 0, perp: 0, par: 0, inter: 0, tan: 0 };
    state.log.forEach(c => bumpCounters(c.id, c.kind));
    rebuildBoard();
    notify();
  }

  function bumpCounters(id, kind) {
    if (isPointKind(kind)) {
      const m = /^([A-Z])(\d*)$/.exec(id);
      if (m) {
        const letterIdx = m[1].charCodeAt(0) - 65;
        const base = m[2] ? parseInt(m[2], 10) * 26 : 0;
        const total = base + letterIdx + 1;
        if (total > state.idCounters.point) state.idCounters.point = total;
      }
    } else {
      const m = /^([a-z]+)(\d+)$/.exec(id);
      if (m && state.idCounters[m[1]] !== undefined) {
        const n = parseInt(m[2], 10);
        if (n > state.idCounters[m[1]]) state.idCounters[m[1]] = n;
      }
    }
  }

  function isPointKind(kind) {
    return kind === 'point' || kind === 'midpoint' || kind === 'intersect' || kind === 'foot';
  }

  // ================== REPLAY ==================
  function replayAll() {
    state.elements = {};
    state.log.forEach(execCommand);
  }

  function rebuildBoard() {
    if (!state.board) return;
    // remove all user-created objects (keep axes, grid)
    const toRemove = [];
    for (const key of Object.keys(state.board.objects)) {
      const el = state.board.objects[key];
      if (el && el.elType && el.elType !== 'axis' && el.elType !== 'ticks' && el.elType !== 'grid') {
        // Heuristic: only remove our tracked ones to avoid axis labels
        if (Object.values(state.elements).includes(el)) toRemove.push(el);
      }
    }
    toRemove.forEach(el => { try { state.board.removeObject(el, true); } catch (e) {} });
    state.elements = {};
    state.log.forEach(execCommand);
    state.board.update();
  }

  function buildStyleOpts(cmd) {
    const s = cmd.style || {};
    const opts = {
      highlight: false,
      fixed: false
    };
    if (isPointKind(cmd.kind)) {
      opts.name = s.label !== undefined ? s.label : cmd.id;
      opts.size = typeof s.size === 'number' ? s.size : 3;
      opts.strokeColor = s.color || '#dc2626';
      opts.fillColor = s.color || '#dc2626';
      opts.visible = s.visible !== false;
      opts.label = { fontSize: 14, offset: s.labelOffset || [8, 8] };
    } else if (cmd.kind === 'polygon') {
      opts.borders = {
        strokeColor: s.color || '#0f172a',
        strokeWidth: typeof s.strokeWidth === 'number' ? s.strokeWidth : 2,
        highlight: false
      };
      opts.fillColor = s.fillColor || '#3b82f6';
      opts.fillOpacity = typeof s.fillOpacity === 'number' ? s.fillOpacity : 0.08;
      opts.hasInnerPoints = false;
      opts.vertices = { visible: false };
      opts.withLines = true;
      opts.visible = s.visible !== false;
    } else {
      opts.strokeColor = s.color || '#2563eb';
      opts.strokeWidth = typeof s.strokeWidth === 'number' ? s.strokeWidth : 2;
      opts.dash = typeof s.dash === 'number' ? s.dash : 0;
      opts.visible = s.visible !== false;
    }
    return opts;
  }

  function execCommand(cmd) {
    const b = state.board;
    if (!b) return;
    const resolve = (ref) => state.elements[ref] || null;
    const opts = buildStyleOpts(cmd);
    let el = null;

    try {
      switch (cmd.kind) {
        case 'point':
          el = b.create('point', [cmd.args[0], cmd.args[1]], opts);
          el.on('up', () => {
            const c = byId(cmd.id);
            if (c && c.kind === 'point') {
              const newArgs = [el.X(), el.Y()];
              // Only push undo if actually moved
              if (c.args[0] !== newArgs[0] || c.args[1] !== newArgs[1]) {
                pushUndo();
                c.args = newArgs;
                notify();
              }
            }
          });
          break;

        case 'segment': {
          const A = resolve(cmd.args[0]), B = resolve(cmd.args[1]);
          if (!A || !B) return;
          el = b.create('segment', [A, B], opts);
          break;
        }
        case 'line': {
          const A = resolve(cmd.args[0]), B = resolve(cmd.args[1]);
          if (!A || !B) return;
          el = b.create('line', [A, B], opts);
          break;
        }
        case 'ray': {
          const A = resolve(cmd.args[0]), B = resolve(cmd.args[1]);
          if (!A || !B) return;
          el = b.create('line', [A, B], Object.assign({}, opts, { straightFirst: false, straightLast: true }));
          break;
        }
        case 'polygon': {
          const pts = cmd.args.map(resolve).filter(Boolean);
          if (pts.length < 3) return;
          el = b.create('polygon', pts, opts);
          break;
        }
        case 'circle_cp': {
          const C = resolve(cmd.args[0]), P = resolve(cmd.args[1]);
          if (!C || !P) return;
          el = b.create('circle', [C, P], opts);
          break;
        }
        case 'circle_cr': {
          const C = resolve(cmd.args[0]);
          const r = cmd.args[1];
          if (!C || typeof r !== 'number') return;
          el = b.create('circle', [C, r], opts);
          break;
        }
        case 'midpoint': {
          const A = resolve(cmd.args[0]), B = resolve(cmd.args[1]);
          if (!A || !B) return;
          el = b.create('midpoint', [A, B], opts);
          break;
        }
        case 'perpendicular': {
          // args: [pointId, lineId]
          const P = resolve(cmd.args[0]);
          const L = resolve(cmd.args[1]);
          if (!P || !L) return;
          el = b.create('perpendicular', [L, P], opts);
          break;
        }
        case 'parallel': {
          const P = resolve(cmd.args[0]);
          const L = resolve(cmd.args[1]);
          if (!P || !L) return;
          el = b.create('parallel', [L, P], opts);
          break;
        }
        case 'intersect': {
          const O1 = resolve(cmd.args[0]);
          const O2 = resolve(cmd.args[1]);
          const idx = typeof cmd.args[2] === 'number' ? cmd.args[2] : 0;
          if (!O1 || !O2) return;
          el = b.create('intersection', [O1, O2, idx], opts);
          break;
        }
        case 'tangent': {
          // tangent from a free point to a circle:
          // JSXGraph: board.create('tangent', [glider])
          // We need a glider on the circle — create two hidden gliders for 2 tangents.
          const P = resolve(cmd.args[0]);
          const C = resolve(cmd.args[1]);
          if (!P || !C) return;
          // Use polar line construction: for circle center O and point P, polar line p = ... then tangents are lines through P and intersections of p with C
          // Simpler: use JSXGraph's tangent through polarpoint:
          const polarLine = b.create('polarline', [C, P], { visible: false });
          const [T1, T2] = [0, 1].map(i => b.create('intersection', [polarLine, C, i], { visible: false, name: '' }));
          el = b.create('line', [P, T1], opts);
          if (cmd.args[2] === 2) {
            try { b.removeObject(el, true); } catch (e) {}
            el = b.create('line', [P, T2], opts);
          }
          break;
        }
      }
    } catch (e) {
      console.warn('execCommand failed', cmd, e);
      return;
    }
    if (el) state.elements[cmd.id] = el;
  }

  // ================== PICKING ==================
  // Get a point id at pixel position (within tolerance). Returns existing point id or null.
  function pickPoint(clientX, clientY, tolPx) {
    tolPx = tolPx || 8;
    const b = state.board;
    if (!b) return null;
    const rect = b.containerObj.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    let best = null, bestD = tolPx;
    for (const id of Object.keys(state.elements)) {
      const el = state.elements[id];
      if (!el || el.elType !== 'point') continue;
      if (el.visProp && el.visProp.visible === false) continue;
      const cx = el.coords.scrCoords[1];
      const cy = el.coords.scrCoords[2];
      const d = Math.hypot(px - cx, py - cy);
      if (d < bestD) { bestD = d; best = id; }
    }
    return best;
  }

  // Pick any non-point object (line/segment/circle/polygon) under cursor.
  function pickObject(clientX, clientY, tolPx) {
    tolPx = tolPx || 6;
    const b = state.board;
    if (!b) return null;
    const rect = b.containerObj.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    // iterate our tracked elements
    for (const id of Object.keys(state.elements)) {
      const el = state.elements[id];
      if (!el || el.elType === 'point') continue;
      if (el.visProp && el.visProp.visible === false) continue;
      try {
        if (typeof el.hasPoint === 'function' && el.hasPoint(px, py)) return id;
      } catch (e) { /* ignore */ }
    }
    return null;
  }

  function pickAny(clientX, clientY) {
    return pickPoint(clientX, clientY) || pickObject(clientX, clientY);
  }

  // Convert a pixel coord to world coord.
  function toWorld(clientX, clientY) {
    const b = state.board;
    const rect = b.containerObj.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const coords = new JXG.Coords(JXG.COORDS_BY_SCREEN, [px, py], b);
    return [coords.usrCoords[1], coords.usrCoords[2]];
  }

  // Ensure a point at (x, y) exists; if a nearby existing point matches click, return its id. Else create a new free point and return id.
  function ensurePointAt(clientX, clientY) {
    const hit = pickPoint(clientX, clientY);
    if (hit) return hit;
    const [x, y] = toWorld(clientX, clientY);
    // Snap to grid if close (0.25 grid snap)
    const rx = Math.round(x * 4) / 4;
    const ry = Math.round(y * 4) / 4;
    const snapped = (Math.abs(rx - x) < 0.08 && Math.abs(ry - y) < 0.08) ? [rx, ry] : [x, y];
    const cmd = addCommand({ kind: 'point', args: snapped });
    return cmd.id;
  }

  // ================== SELECTION ==================
  function setSelected(id) {
    state.selectedId = id;
    notify();
  }
  function getSelected() { return state.selectedId; }

  // ================== EXPORT ==================
  function getLog() { return clone(state.log); }
  function getBoardSize() {
    const b = state.board;
    if (!b) return { width: 0, height: 0 };
    return { width: b.canvasWidth, height: b.canvasHeight };
  }

  // ================== PUBLIC API ==================
  global.JSXEditor = global.JSXEditor || {};
  global.JSXEditor.Core = {
    initBoard, setBoardOpts, getBoard, getBoardOpts, getBoardSize,
    addCommand, removeCommand, updateStyle, updatePointPosition,
    undo, redo, clearAll, loadLog,
    getLog, byId,
    isPointKind, defaultStyle, nextId,
    pickPoint, pickObject, pickAny, toWorld, ensurePointAt,
    setSelected, getSelected,
    setOnChange(fn) { state.onChange = fn; },
    _state: state
  };
})(window);
