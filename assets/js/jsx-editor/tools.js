/* =========================================================
 * JSX Editor — TOOLS
 * Each tool is a state machine: onClick / onMove / reset.
 * ========================================================= */
(function (global) {
  'use strict';

  const Core = global.JSXEditor.Core;
  let onHintChange = null;
  let onToolReset = null; // called after a tool completes an action

  // helper — guard "non-point" selection: must resolve to line/segment/circle/polygon id
  function isNonPoint(id) {
    if (!id) return false;
    const cmd = Core.byId(id);
    if (!cmd) return false;
    return !Core.isPointKind(cmd.kind);
  }

  function isLineLike(id) {
    const cmd = Core.byId(id);
    if (!cmd) return false;
    return ['segment', 'line', 'ray', 'perpendicular', 'parallel', 'tangent'].includes(cmd.kind);
  }
  function isCircle(id) {
    const cmd = Core.byId(id);
    if (!cmd) return false;
    return ['circle_cp', 'circle_cr'].includes(cmd.kind);
  }

  // ================== TOOLS ==================
  const Tools = {};

  // -------- Move (default) --------
  Tools.move = {
    name: 'move',
    hint: 'Kéo điểm tự do. Dùng Shift+kéo để pan, cuộn chuột để zoom.',
    onDown() { /* let JSXGraph handle dragging */ },
    reset() {}
  };

  // -------- Point --------
  Tools.point = {
    name: 'point',
    hint: 'Click vào vị trí để tạo điểm mới.',
    onDown(ev) {
      const hit = Core.pickPoint(ev.clientX, ev.clientY);
      if (hit) { notify('Điểm này đã tồn tại: ' + hit); return; }
      const [x, y] = Core.toWorld(ev.clientX, ev.clientY);
      const sx = snap(x), sy = snap(y);
      Core.addCommand({ kind: 'point', args: [sx, sy] });
      reset();
    },
    reset() {}
  };

  // -------- Segment (click 2 points; auto-create if empty) --------
  Tools.segment = makeTwoPointTool('segment', 'Đoạn thẳng: click 2 điểm.', (a, b) => {
    Core.addCommand({ kind: 'segment', args: [a, b] });
  });

  Tools.line = makeTwoPointTool('line', 'Đường thẳng: click 2 điểm.', (a, b) => {
    Core.addCommand({ kind: 'line', args: [a, b] });
  });

  Tools.ray = makeTwoPointTool('ray', 'Tia: click điểm gốc, rồi điểm thứ hai.', (a, b) => {
    Core.addCommand({ kind: 'ray', args: [a, b] });
  });

  // -------- Polygon (click n points; close by clicking first point or double-click) --------
  Tools.polygon = (function () {
    const t = {
      name: 'polygon',
      hint: 'Đa giác: click các đỉnh. Click đỉnh đầu hoặc double-click để đóng.',
      ids: [],
      onDown(ev) {
        // close if clicked first point and have ≥ 3 pts
        const hit = Core.pickPoint(ev.clientX, ev.clientY);
        if (hit && this.ids.length >= 3 && hit === this.ids[0]) {
          Core.addCommand({ kind: 'polygon', args: this.ids.slice() });
          this.reset();
          reset();
          return;
        }
        const pid = Core.ensurePointAt(ev.clientX, ev.clientY);
        if (!this.ids.includes(pid)) this.ids.push(pid);
        notify(`Đa giác: đã chọn ${this.ids.length} đỉnh · click đỉnh đầu hoặc double-click để đóng`);
      },
      onDoubleClick() {
        if (this.ids.length >= 3) {
          Core.addCommand({ kind: 'polygon', args: this.ids.slice() });
        }
        this.reset();
        reset();
      },
      reset() { this.ids = []; }
    };
    return t;
  })();

  // -------- Circle (center, through) --------
  Tools.circle = makeTwoPointTool('circle', 'Đường tròn: click tâm, rồi điểm trên đường tròn.', (a, b) => {
    Core.addCommand({ kind: 'circle_cp', args: [a, b] });
  });

  // -------- Midpoint --------
  Tools.midpoint = {
    name: 'midpoint',
    hint: 'Trung điểm: click 2 điểm, hoặc 1 đoạn thẳng.',
    first: null,
    onDown(ev) {
      // If user clicks on an existing segment, create midpoint of its endpoints.
      const objId = Core.pickObject(ev.clientX, ev.clientY);
      if (objId && !this.first) {
        const cmd = Core.byId(objId);
        if (cmd && (cmd.kind === 'segment' || cmd.kind === 'line')) {
          Core.addCommand({ kind: 'midpoint', args: [cmd.args[0], cmd.args[1]] });
          this.reset(); reset();
          return;
        }
      }
      // Else collect 2 points
      const pid = Core.ensurePointAt(ev.clientX, ev.clientY);
      if (!this.first) {
        this.first = pid;
        notify('Trung điểm: chọn điểm thứ hai');
      } else {
        Core.addCommand({ kind: 'midpoint', args: [this.first, pid] });
        this.reset(); reset();
      }
    },
    reset() { this.first = null; }
  };

  // -------- Perpendicular (point, line) --------
  Tools.perpendicular = makePointThenLineTool('perpendicular',
    'Đường vuông góc: click 1 điểm, rồi click 1 đường/đoạn.',
    (pid, lid) => Core.addCommand({ kind: 'perpendicular', args: [pid, lid] })
  );

  // -------- Parallel (point, line) --------
  Tools.parallel = makePointThenLineTool('parallel',
    'Đường song song: click 1 điểm, rồi click 1 đường/đoạn.',
    (pid, lid) => Core.addCommand({ kind: 'parallel', args: [pid, lid] })
  );

  // -------- Intersect (2 non-points) --------
  Tools.intersect = {
    name: 'intersect',
    hint: 'Giao điểm: click 2 đối tượng (đường/đường tròn).',
    first: null,
    onDown(ev) {
      const id = Core.pickObject(ev.clientX, ev.clientY);
      if (!id) { notify('Click trực tiếp lên đường/đường tròn'); return; }
      if (!this.first) {
        this.first = id;
        notify('Giao điểm: chọn đối tượng thứ hai');
      } else {
        if (id === this.first) { notify('Phải chọn đối tượng khác'); return; }
        // For circle-circle or line-circle, there are 2 intersections → create both.
        const c1 = Core.byId(this.first), c2 = Core.byId(id);
        const twoInts = isCircle(this.first) && (isCircle(id) || isLineLike(id))
          || (isCircle(id) && isLineLike(this.first));
        Core.addCommand({ kind: 'intersect', args: [this.first, id, 0] });
        if (twoInts) {
          Core.addCommand({ kind: 'intersect', args: [this.first, id, 1] });
        }
        this.reset(); reset();
      }
    },
    reset() { this.first = null; }
  };

  // -------- Tangent (point, circle) --------
  Tools.tangent = {
    name: 'tangent',
    hint: 'Tiếp tuyến: click 1 điểm (ngoài), rồi click vào đường tròn.',
    pointId: null,
    onDown(ev) {
      if (!this.pointId) {
        // first click — accept a point (existing or new)
        const pid = Core.ensurePointAt(ev.clientX, ev.clientY);
        this.pointId = pid;
        notify('Tiếp tuyến: giờ click vào đường tròn');
      } else {
        const cid = Core.pickObject(ev.clientX, ev.clientY);
        if (!cid || !isCircle(cid)) { notify('Click trực tiếp vào đường tròn'); return; }
        // create both tangents
        Core.addCommand({ kind: 'tangent', args: [this.pointId, cid, 1] });
        Core.addCommand({ kind: 'tangent', args: [this.pointId, cid, 2] });
        this.reset(); reset();
      }
    },
    reset() { this.pointId = null; }
  };

  // -------- Delete --------
  Tools.delete = {
    name: 'delete',
    hint: 'Xoá: click đối tượng để xoá (sẽ xoá kéo theo phụ thuộc).',
    onDown(ev) {
      const id = Core.pickAny(ev.clientX, ev.clientY);
      if (!id) return;
      const r = Core.removeCommand(id, false);
      if (!r.removed) {
        const ok = confirm(`Đối tượng "${id}" đang có ${r.dependents.length} thứ phụ thuộc. Xoá tất cả?`);
        if (ok) Core.removeCommand(id, true);
      }
    },
    reset() {}
  };

  // ================== HELPERS ==================
  function makeTwoPointTool(name, hint, callback) {
    return {
      name,
      hint,
      first: null,
      onDown(ev) {
        const pid = Core.ensurePointAt(ev.clientX, ev.clientY);
        if (!this.first) {
          this.first = pid;
          notify(name + ': chọn điểm thứ hai');
        } else {
          if (pid !== this.first) callback(this.first, pid);
          this.reset();
          reset();
        }
      },
      reset() { this.first = null; }
    };
  }

  function makePointThenLineTool(name, hint, callback) {
    return {
      name,
      hint,
      pointId: null,
      onDown(ev) {
        if (!this.pointId) {
          // Prefer picking an existing point
          const hit = Core.pickPoint(ev.clientX, ev.clientY);
          if (hit) {
            this.pointId = hit;
          } else {
            // Accept creating a new free point
            this.pointId = Core.ensurePointAt(ev.clientX, ev.clientY);
          }
          notify(name + ': giờ click vào đường/đoạn');
        } else {
          const lid = Core.pickObject(ev.clientX, ev.clientY);
          if (!lid || !isLineLike(lid)) { notify('Click trực tiếp lên đường/đoạn'); return; }
          callback(this.pointId, lid);
          this.reset(); reset();
        }
      },
      reset() { this.pointId = null; }
    };
  }

  function snap(v) {
    const s = Math.round(v * 4) / 4;
    return (Math.abs(s - v) < 0.08) ? s : Math.round(v * 100) / 100;
  }

  // ================== ACTIVE TOOL MANAGEMENT ==================
  let current = Tools.move;

  function setTool(name) {
    if (current && current.reset) current.reset();
    current = Tools[name] || Tools.move;
    notify(current.hint);
    applyBoardInteractivity();
  }
  function getToolName() { return current ? current.name : 'move'; }
  function getTool() { return current; }

  function resetCurrent() {
    if (current && current.reset) current.reset();
    notify(current.hint);
    if (typeof onToolReset === 'function') onToolReset();
  }
  function reset() { resetCurrent(); }

  function notify(msg) {
    if (typeof onHintChange === 'function') onHintChange(msg);
  }

  // When in a drawing tool, disable JSXGraph pan-drag so clicks don't pan.
  function applyBoardInteractivity() {
    const board = Core.getBoard();
    if (!board) return;
    // Pan requires Shift when any drawing tool is active.
    const isMove = current.name === 'move';
    board.attr.pan = { enabled: true, needShift: !isMove, needTwoFingers: false };
  }

  // ================== BOARD EVENT HANDLING ==================
  function attachBoardEvents(boardContainerId) {
    const container = document.getElementById(boardContainerId);
    if (!container) return;

    container.addEventListener('mousedown', (ev) => {
      // Only left-button
      if (ev.button !== 0) return;
      if (!current || !current.onDown) return;
      // If tool is 'move', don't intercept — let JSXGraph handle it.
      if (current.name === 'move') return;
      // If the click is on a free point (and we're not in a multi-step capture), let JSXGraph drag it... actually we want clicks to register even on points because tools need to pick points.
      // Solution: run our handler first; if it didn't consume, let drag continue. Our handler never preventDefault → JSXGraph still receives event.
      current.onDown(ev);
    }, true);

    container.addEventListener('dblclick', (ev) => {
      if (!current || !current.onDoubleClick) return;
      current.onDoubleClick(ev);
    });
  }

  // Escape key to cancel current multi-step action.
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') resetCurrent();
  });

  // ================== PUBLIC ==================
  global.JSXEditor.Tools = {
    Tools, setTool, getToolName, getTool, resetCurrent,
    attachBoardEvents,
    setOnHintChange(fn) { onHintChange = fn; },
    setOnToolReset(fn) { onToolReset = fn; },
    applyBoardInteractivity
  };
})(window);
