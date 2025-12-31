(function () {
    const LOCAL_JS = 'assets/vendor/jsxgraph/jsxgraphcore.js';
    const LOCAL_CSS = 'assets/vendor/jsxgraph/jsxgraph.css';
    const CDN_JS = 'https://cdn.jsdelivr.net/npm/jsxgraph/distrib/jsxgraphcore.js';
    const CDN_CSS = 'https://cdn.jsdelivr.net/npm/jsxgraph/distrib/jsxgraph.css';

    const PYODIDE_LOCAL_DIR = 'assets/vendor/pyodide/';
    const PYODIDE_LOCAL_JS = PYODIDE_LOCAL_DIR + 'pyodide.js';
    const PYODIDE_CDN_DIR = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/';
    const PYODIDE_CDN_JS = PYODIDE_CDN_DIR + 'pyodide.js';

    const state = {
        loading: null,
        cssHrefs: new Set(),
        counter: 0,
        sympyLoading: null,
        pyodide: null,
        sympyFns: null
    };

    function ensureCss(href) {
        if (!href || state.cssHrefs.has(href)) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.setAttribute('data-diagrams-css', href);
        document.head.appendChild(link);
        state.cssHrefs.add(href);
    }

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src;
            s.async = true;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error(`Failed to load ${src}`));
            document.head.appendChild(s);
        });
    }

    async function ensureJsxGraph() {
        if (window.JXG && window.JXG.JSXGraph) return;
        if (state.loading) return state.loading;

        state.loading = (async () => {
            try {
                ensureCss(LOCAL_CSS);
                await loadScript(LOCAL_JS);
                return;
            } catch (e1) {
                try {
                    ensureCss(CDN_CSS);
                    await loadScript(CDN_JS);
                    return;
                } catch (e2) {
                    throw e2;
                }
            }
        })();

        return state.loading;
    }

    async function ensureSympy() {
        if (state.pyodide) return;
        if (state.sympyLoading) return state.sympyLoading;

        const pyHelpers = `
import sympy as sp
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application, convert_xor

_TRANS = standard_transformations + (implicit_multiplication_application, convert_xor)

def _parse(expr_s, var):
    x = sp.Symbol(var, real=True)
    local = {var: x, 'ln': sp.log, 'log': sp.log, 'sqrt': sp.sqrt, 'abs': sp.Abs, 'exp': sp.exp, 'pi': sp.pi, 'e': sp.E}
    expr = parse_expr(expr_s, local_dict=local, transformations=_TRANS, evaluate=True)
    return expr, x

def roots_real(expr_s, var):
    try:
        expr, x = _parse(expr_s, var)
    except Exception:
        return []
    sols = []
    try:
        sol = sp.solveset(expr, x, domain=sp.S.Reals)
        if isinstance(sol, sp.FiniteSet):
            sols = list(sol)
    except Exception:
        sols = []
    if not sols:
        try:
            expr2 = sp.together(expr)
            num, den = sp.fraction(expr2)
            sol2 = sp.solveset(num, x, domain=sp.S.Reals)
            if isinstance(sol2, sp.FiniteSet):
                sols = list(sol2)
        except Exception:
            sols = []
    out = []
    for r in sols:
        try:
            rr = sp.N(r)
            if rr.is_real:
                out.append(float(rr))
        except Exception:
            pass
    return out

def roots_real_latex(expr_s, var):
    try:
        expr, x = _parse(expr_s, var)
    except Exception:
        return []
    sols = []
    try:
        sol = sp.solveset(expr, x, domain=sp.S.Reals)
        if isinstance(sol, sp.FiniteSet):
            sols = list(sol)
    except Exception:
        sols = []
    if not sols:
        try:
            expr2 = sp.together(expr)
            num, den = sp.fraction(expr2)
            sol2 = sp.solveset(num, x, domain=sp.S.Reals)
            if isinstance(sol2, sp.FiniteSet):
                sols = list(sol2)
        except Exception:
            sols = []
    out = []
    for r in sols:
        try:
            rr = sp.N(r)
            if rr.is_real:
                out.append([float(rr), sp.latex(r)])
        except Exception:
            pass
    return out

def denom_roots_real(expr_s, var):
    try:
        expr, x = _parse(expr_s, var)
        expr2 = sp.together(expr)
        num, den = sp.fraction(expr2)
        sol = sp.solveset(den, x, domain=sp.S.Reals)
        sols = list(sol) if isinstance(sol, sp.FiniteSet) else []
    except Exception:
        sols = []
    out = []
    for r in sols:
        try:
            rr = sp.N(r)
            if rr.is_real:
                out.append(float(rr))
        except Exception:
            pass
    return out

def denom_roots_real_latex(expr_s, var):
    try:
        expr, x = _parse(expr_s, var)
        expr2 = sp.together(expr)
        num, den = sp.fraction(expr2)
        sol = sp.solveset(den, x, domain=sp.S.Reals)
        sols = list(sol) if isinstance(sol, sp.FiniteSet) else []
    except Exception:
        sols = []
    out = []
    for r in sols:
        try:
            rr = sp.N(r)
            if rr.is_real:
                out.append([float(rr), sp.latex(r)])
        except Exception:
            pass
    return out

def sign_at(expr_s, var, x0):
    try:
        expr, x = _parse(expr_s, var)
        v = sp.N(expr.subs(x, sp.Float(x0)))
        if not v.is_real:
            return None
        vf = float(v)
        if abs(vf) < 1e-10:
            return 0
        return 1 if vf > 0 else -1
    except Exception:
        return None

def eval_at(expr_s, var, x0):
    try:
        expr, x = _parse(expr_s, var)
        v = sp.N(expr.subs(x, sp.Float(x0)))
        if not v.is_real:
            return None
        return float(v)
    except Exception:
        return None

def limit_at(expr_s, var, x0, direction):
    try:
        expr, x = _parse(expr_s, var)
        a = sp.Float(x0)
        d = '-' if direction == '-' else '+'
        v = sp.limit(expr, x, a, dir=d)
        if v is sp.oo:
            return float('inf')
        if v is -sp.oo:
            return float('-inf')
        vv = sp.N(v)
        if not vv.is_real:
            return None
        return float(vv)
    except Exception:
        return None

def limit_inf(expr_s, var, which):
    try:
        expr, x = _parse(expr_s, var)
        target = sp.oo if which == '+' else -sp.oo
        v = sp.limit(expr, x, target)
        if v is sp.oo:
            return float('inf')
        if v is -sp.oo:
            return float('-inf')
        vv = sp.N(v)
        if not vv.is_real:
            return None
        return float(vv)
    except Exception:
        return None

def derivative_expr(expr_s, var):
    try:
        expr, x = _parse(expr_s, var)
        d = sp.diff(expr, x)
        return str(sp.simplify(d))
    except Exception:
        return ''
`;

        state.sympyLoading = (async () => {
            let py = null;
            try {
                await loadScript(PYODIDE_LOCAL_JS);
                py = await window.loadPyodide({ indexURL: PYODIDE_LOCAL_DIR });
            } catch (e1) {
                await loadScript(PYODIDE_CDN_JS);
                py = await window.loadPyodide({ indexURL: PYODIDE_CDN_DIR });
            }
            await py.loadPackage('sympy');
            await py.runPythonAsync(pyHelpers);
            state.pyodide = py;
        })();

        return state.sympyLoading;
    }

    function toJsAndDestroy(v) {
        try {
            if (v && typeof v.toJs === 'function') {
                const out = v.toJs({ create_proxies: false });
                try { v.destroy(); } catch (_) { }
                return out;
            }
        } catch (_) { }
        return v;
    }

    async function ensureSympyFns() {
        await ensureSympy();
        if (state.sympyFns) return state.sympyFns;

        const py = state.pyodide;
        const g = py.globals;
        state.sympyFns = {
            rootsRealLatex: g.get('roots_real_latex'),
            denomRootsRealLatex: g.get('denom_roots_real_latex'),
            signAt: g.get('sign_at'),
            evalAt: g.get('eval_at'),
            limitAt: g.get('limit_at'),
            limitInf: g.get('limit_inf'),
            derivativeExpr: g.get('derivative_expr')
        };

        return state.sympyFns;
    }

    async function sympyRootsRealLatex(exprStr, variable) {
        const fns = await ensureSympyFns();
        const out = toJsAndDestroy(fns.rootsRealLatex(exprStr, variable));
        if (!Array.isArray(out)) return [];
        return out
            .filter(p => Array.isArray(p) && p.length >= 2 && typeof p[0] === 'number')
            .map(p => ({ x: p[0], label: typeof p[1] === 'string' ? p[1] : '' }))
            .filter(p => Number.isFinite(p.x));
    }

    async function sympyDenomRootsRealLatex(exprStr, variable) {
        const fns = await ensureSympyFns();
        const out = toJsAndDestroy(fns.denomRootsRealLatex(exprStr, variable));
        if (!Array.isArray(out)) return [];
        return out
            .filter(p => Array.isArray(p) && p.length >= 2 && typeof p[0] === 'number')
            .map(p => ({ x: p[0], label: typeof p[1] === 'string' ? p[1] : '' }))
            .filter(p => Number.isFinite(p.x));
    }

    async function sympySignAt(exprStr, variable, x0) {
        const fns = await ensureSympyFns();
        const out = toJsAndDestroy(fns.signAt(exprStr, variable, x0));
        if (typeof out !== 'number') return null;
        if (out === 0) return '0';
        if (out > 0) return '+';
        if (out < 0) return '-';
        return null;
    }

    async function sympyEvalAt(exprStr, variable, x0) {
        const fns = await ensureSympyFns();
        const out = toJsAndDestroy(fns.evalAt(exprStr, variable, x0));
        if (typeof out !== 'number') return null;
        return out;
    }

    async function sympyLimitAt(exprStr, variable, x0, dir) {
        const fns = await ensureSympyFns();
        const out = toJsAndDestroy(fns.limitAt(exprStr, variable, x0, dir));
        if (typeof out !== 'number') return null;
        return out;
    }

    async function sympyLimitInf(exprStr, variable, which) {
        const fns = await ensureSympyFns();
        const out = toJsAndDestroy(fns.limitInf(exprStr, variable, which));
        if (typeof out !== 'number') return null;
        return out;
    }

    function decodeSpec(raw) {
        if (!raw) return null;
        let s = raw;
        try { s = decodeURIComponent(raw); } catch (e) { }
        try { return JSON.parse(s); } catch (e) { }
        return parseKvSpec(s);
    }

    function parseKvSpec(s) {
        if (typeof s !== 'string') return null;
        const trimmed = s.trim();
        if (!trimmed) return null;

        // Support: key=value;key2=1,2,3;flag=true
        const out = {};
        const parts = trimmed.split(';').map(p => p.trim()).filter(Boolean);
        if (!parts.length) return null;

        for (const p of parts) {
            const eq = p.indexOf('=');
            if (eq <= 0) continue;
            const key = p.slice(0, eq).trim();
            const valRaw = p.slice(eq + 1).trim();
            if (!key) continue;

            let val = valRaw;
            if (valRaw === 'true') val = true;
            else if (valRaw === 'false') val = false;
            else if (/^-?\d+(?:\.\d+)?$/.test(valRaw)) val = Number(valRaw);
            else if (valRaw.includes(',')) {
                const arr = valRaw.split(',').map(x => x.trim()).filter(Boolean);
                const nums = arr.map(x => (/^-?\d+(?:\.\d+)?$/.test(x) ? Number(x) : x));
                val = nums;
            }

            out[key] = val;
        }

        return Object.keys(out).length ? out : null;
    }

    function compileExpr(expr) {
        if (typeof expr !== 'string' || !expr.trim()) return null;
        // Very small safe-expression gate: disallow quotes/backticks/braces/semicolons.
        // This is not intended for untrusted user input, but helps prevent accidental JS injection.
        if (/[\"'`{}\[\];]/.test(expr)) return null;

        const sanitized = expr
            .replace(/\^/g, '**')
            .replace(/\bpi\b/gi, 'PI')
            .replace(/\be\b/g, 'E');

        try {
            // eslint-disable-next-line no-new-func
            const fn = new Function('x', 'with (Math) { return (' + sanitized + '); }');
            const test = fn(0);
            if (typeof test !== 'number' || Number.isNaN(test)) {
                // Allow NaN at x=0 for some functions (e.g. 1/x). Still accept.
            }
            return (x) => {
                const v = fn(x);
                return (typeof v === 'number' && Number.isFinite(v)) ? v : NaN;
            };
        } catch (e) {
            return null;
        }
    }

    function getBBox(spec) {
        const bb = spec && Array.isArray(spec.bbox) ? spec.bbox : null;
        if (bb && bb.length === 4 && bb.every(n => typeof n === 'number')) return bb;
        return [-5, 5, 5, -5];
    }

    function bool(v, dflt) {
        if (typeof v === 'boolean') return v;
        return dflt;
    }

    function presetAxes(board, spec) {
        const axisColor = spec.axisColor || '#64748b';
        const tickLabelColor = spec.tickLabelColor || '#475569';

        const xAxis = board.create('axis', [[0, 0], [1, 0]], {
            strokeColor: axisColor,
            highlight: false,
            ticks: {
                strokeColor: axisColor,
                drawZero: true,
                label: {
                    strokeColor: tickLabelColor,
                    highlight: false
                }
            }
        });

        const yAxis = board.create('axis', [[0, 0], [0, 1]], {
            strokeColor: axisColor,
            highlight: false,
            ticks: {
                strokeColor: axisColor,
                drawZero: true,
                label: {
                    strokeColor: tickLabelColor,
                    highlight: false
                }
            }
        });

        return { xAxis, yAxis };
    }

    function presetParabola(board, spec) {
        const bb = getBBox(spec);
        const xMin = bb[0];
        const xMax = bb[2];

        const a = typeof spec.a === 'number' ? spec.a : 1;
        const color = spec.color || '#2563eb';
        const strokeWidth = typeof spec.strokeWidth === 'number' ? spec.strokeWidth : 2;

        let f = null;
        if (typeof spec.b === 'number' && typeof spec.c === 'number') {
            const b = spec.b;
            const c = spec.c;
            f = (x) => a * x * x + b * x + c;
        } else if (typeof spec.h === 'number' && typeof spec.k === 'number') {
            const h = spec.h;
            const k = spec.k;
            f = (x) => a * (x - h) * (x - h) + k;
        } else {
            f = (x) => a * x * x;
        }

        const graph = board.create('functiongraph', [f, xMin, xMax], {
            strokeColor: color,
            strokeWidth,
            highlight: false
        });

        if (bool(spec.showVertex, false)) {
            let h = 0;
            let k = 0;
            if (typeof spec.h === 'number' && typeof spec.k === 'number') {
                h = spec.h;
                k = spec.k;
            } else if (typeof spec.b === 'number' && typeof spec.c === 'number') {
                const b = spec.b;
                const c = spec.c;
                h = -b / (2 * a);
                k = a * h * h + b * h + c;
            }

            board.create('point', [h, k], {
                name: spec.vertexName || '',
                size: 3,
                color: spec.vertexColor || '#ef4444',
                fixed: true,
                highlight: false
            });
        }

        return { graph };
    }

    function presetFunction(board, spec) {
        const bb = getBBox(spec);
        const xMin = bb[0];
        const xMax = bb[2];
        const color = spec.color || '#2563eb';
        const strokeWidth = typeof spec.strokeWidth === 'number' ? spec.strokeWidth : 2;

        let fn = null;
        if (typeof spec.expr === 'string') {
            fn = compileExpr(spec.expr);
        }

        if (!fn && typeof spec.fn === 'function') {
            fn = spec.fn;
        }

        if (!fn) {
            fn = (x) => NaN;
        }

        const graph = board.create('functiongraph', [fn, xMin, xMax], {
            strokeColor: color,
            strokeWidth,
            highlight: false
        });

        return { graph };
    }

    function presetLine(board, spec) {
        const p1 = Array.isArray(spec.p1) ? spec.p1 : null;
        const p2 = Array.isArray(spec.p2) ? spec.p2 : null;
        const color = spec.color || '#0f172a';
        const strokeWidth = typeof spec.strokeWidth === 'number' ? spec.strokeWidth : 2;
        const kind = spec.kind || 'line';

        let A = null;
        let B = null;

        if (p1 && p1.length === 2 && p2 && p2.length === 2) {
            A = board.create('point', [p1[0], p1[1]], { visible: false, fixed: true });
            B = board.create('point', [p2[0], p2[1]], { visible: false, fixed: true });
        } else if (typeof spec.m === 'number' && typeof spec.b === 'number') {
            A = board.create('point', [0, spec.b], { visible: false, fixed: true });
            B = board.create('point', [1, spec.m + spec.b], { visible: false, fixed: true });
        } else {
            A = board.create('point', [0, 0], { visible: false, fixed: true });
            B = board.create('point', [1, 1], { visible: false, fixed: true });
        }

        const elementType = kind === 'segment' ? 'segment' : 'line';
        const l = board.create(elementType, [A, B], { strokeColor: color, strokeWidth, highlight: false });
        return { line: l };
    }

    function presetTriangle(board, spec) {
        const A0 = Array.isArray(spec.A) ? spec.A : [0, 0];
        const B0 = Array.isArray(spec.B) ? spec.B : [4, 0];
        const C0 = Array.isArray(spec.C) ? spec.C : [1, 3];

        const color = spec.color || '#0f172a';
        const strokeWidth = typeof spec.strokeWidth === 'number' ? spec.strokeWidth : 2;

        const A = board.create('point', [A0[0], A0[1]], {
            name: spec.nameA || 'A',
            size: 2,
            color: spec.pointColor || '#ef4444',
            fixed: true,
            highlight: false
        });
        const B = board.create('point', [B0[0], B0[1]], {
            name: spec.nameB || 'B',
            size: 2,
            color: spec.pointColor || '#ef4444',
            fixed: true,
            highlight: false
        });
        const C = board.create('point', [C0[0], C0[1]], {
            name: spec.nameC || 'C',
            size: 2,
            color: spec.pointColor || '#ef4444',
            fixed: true,
            highlight: false
        });

        const poly = board.create('polygon', [A, B, C], {
            borders: {
                strokeColor: color,
                strokeWidth,
                highlight: false
            },
            withLines: true,
            fillOpacity: typeof spec.fillOpacity === 'number' ? spec.fillOpacity : 0.0,
            highlight: false
        });

        return { A, B, C, polygon: poly };
    }

    function presetCircle(board, spec) {
        const center = Array.isArray(spec.center) ? spec.center : [0, 0];
        const r = typeof spec.r === 'number' ? spec.r : null;
        const through = Array.isArray(spec.through) ? spec.through : null;

        const color = spec.color || '#0f172a';
        const strokeWidth = typeof spec.strokeWidth === 'number' ? spec.strokeWidth : 2;

        const C = board.create('point', [center[0], center[1]], { visible: false, fixed: true });

        let circ = null;
        if (r !== null) {
            const P = board.create('point', [center[0] + r, center[1]], { visible: false, fixed: true });
            circ = board.create('circle', [C, P], { strokeColor: color, strokeWidth, highlight: false });
        } else if (through && through.length === 2) {
            const P = board.create('point', [through[0], through[1]], { visible: false, fixed: true });
            circ = board.create('circle', [C, P], { strokeColor: color, strokeWidth, highlight: false });
        } else {
            const P = board.create('point', [center[0] + 1, center[1]], { visible: false, fixed: true });
            circ = board.create('circle', [C, P], { strokeColor: color, strokeWidth, highlight: false });
        }

        return { circle: circ };
    }

    function presetLawnMower(board, spec) {
        const angleDeg = typeof spec.angleDeg === 'number' ? spec.angleDeg : 30;
        const forceN = typeof spec.forceN === 'number' ? spec.forceN : 222;
        const distanceM = typeof spec.distanceM === 'number' ? spec.distanceM : 30;

        const strokeColor = spec.color || '#0f172a';
        const textColor = spec.textColor || '#0f172a';
        const handleColor = spec.handleColor || '#ef4444';
        const forceColor = spec.forceColor || '#2563eb';
        const groundColor = spec.groundColor || '#16a34a';

        const theta = angleDeg * Math.PI / 180;

        function p(x, y) {
            return board.create('point', [x, y], { name: '', fixed: true, visible: false, highlight: false });
        }

        const G1 = p(-0.5, 0);
        const G2 = p(10.5, 0);
        board.create('segment', [G1, G2], { strokeColor: groundColor, strokeWidth: 3, highlight: false });

        const w1c = p(1.6, 0.45);
        const w2c = p(3.4, 0.45);
        const rw = 0.35;
        const w1p = p(w1c.X() + rw, w1c.Y());
        const w2p = p(w2c.X() + rw, w2c.Y());
        board.create('circle', [w1c, w1p], { strokeColor: strokeColor, strokeWidth: 2, fillColor: '#f1f5f9', fillOpacity: 1, highlight: false });
        board.create('circle', [w2c, w2p], { strokeColor: strokeColor, strokeWidth: 2, fillColor: '#f1f5f9', fillOpacity: 1, highlight: false });

        const bA = p(1.0, 0.75);
        const bB = p(3.9, 0.75);
        const bC = p(3.6, 1.55);
        const bD = p(1.2, 1.55);
        board.create('polygon', [bA, bB, bC, bD], {
            borders: { strokeColor: '#166534', strokeWidth: 2, highlight: false },
            fillColor: '#22c55e',
            fillOpacity: 0.9,
            highlight: false
        });

        const hBase = p(3.45, 1.25);
        const handleLen = typeof spec.handleLen === 'number' ? spec.handleLen : 4.2;
        const hEnd = p(hBase.X() + handleLen * Math.cos(theta), hBase.Y() + handleLen * Math.sin(theta));
        board.create('segment', [hBase, hEnd], { strokeColor: handleColor, strokeWidth: 3, highlight: false });

        const refLen = 1.4;
        const hRef = p(hBase.X() + refLen, hBase.Y());
        board.create('segment', [hBase, hRef], { strokeColor: '#64748b', strokeWidth: 2, dash: 2, highlight: false });

        const arcR = 1.0;
        const a1 = p(hBase.X() + arcR, hBase.Y());
        const a2 = p(hBase.X() + arcR * Math.cos(theta), hBase.Y() + arcR * Math.sin(theta));
        board.create('arc', [hBase, a1, a2], { strokeColor: '#64748b', strokeWidth: 2, highlight: false });
        board.create('text', [hBase.X() + 0.75, hBase.Y() + 0.35, `${angleDeg}°`], { fixed: true, fontSize: 16, strokeColor: textColor });

        const dispY = 0.22;
        const d1 = p(6.6, dispY);
        const d2 = p(2.0, dispY);
        board.create('arrow', [d1, d2], { strokeColor: '#0ea5e9', strokeWidth: 3, highlight: false });
        board.create('text', [(d1.X() + d2.X()) / 2 - 0.4, dispY + 0.25, `${distanceM} m`], { fixed: true, fontSize: 16, strokeColor: '#0f172a' });

        const hand = p(hEnd.X() + 0.15, hEnd.Y() - 0.05);
        const fLen = typeof spec.forceLen === 'number' ? spec.forceLen : 2.0;
        const fTip = p(hand.X() - fLen * Math.cos(theta), hand.Y() - fLen * Math.sin(theta));
        board.create('arrow', [hand, fTip], { strokeColor: forceColor, strokeWidth: 3, highlight: false });
        board.create('text', [hand.X() - 1.9, hand.Y() - 0.25, `<b>F</b> = ${forceN} N`], { display: 'html', fixed: true, fontSize: 16, strokeColor: textColor });

        return { origin: hBase };
    }

    function presetPhotoAnnotate(board, spec) {
        const img = typeof spec.img === 'string' ? spec.img : 'assets/manmower.png';
        const imgW = typeof spec.imgW === 'number' ? spec.imgW : 1952;
        const imgH = typeof spec.imgH === 'number' ? spec.imgH : 1276;

        const angleDeg = typeof spec.angleDeg === 'number' ? spec.angleDeg : 30;
        const forceN = typeof spec.forceN === 'number' ? spec.forceN : 222;
        const distanceM = typeof spec.distanceM === 'number' ? spec.distanceM : 30;

        const textColor = spec.textColor || '#0f172a';
        const forceColor = spec.forceColor || '#2563eb';
        const dispColor = spec.dispColor || '#0ea5e9';
        const angleColor = spec.angleColor || '#ef4444';

        const calibrate = bool(spec.calibrate, false);

        function p(x, y) {
            return board.create('point', [x, y], { name: '', fixed: true, visible: false, highlight: false });
        }

        const imgAnchor = Array.isArray(spec.imgAnchor) && spec.imgAnchor.length >= 2 ? spec.imgAnchor : [0, 0];
        const image = board.create('image', [img, imgAnchor, [imgW, imgH]], { fixed: true, highlight: false });

        const forceTail = Array.isArray(spec.forceTail) && spec.forceTail.length >= 2 ? spec.forceTail : [560, 706];
        const forceHead = Array.isArray(spec.forceHead) && spec.forceHead.length >= 2 ? spec.forceHead : [1010, 556];
        const F1 = p(forceTail[0], forceTail[1]);
        const F2 = p(forceHead[0], forceHead[1]);
        board.create('arrow', [F1, F2], { strokeColor: forceColor, strokeWidth: 4, highlight: false });
        board.create('text', [
            () => (F1.X() + F2.X()) / 2 + 30,
            () => (F1.Y() + F2.Y()) / 2 + 30,
            `<b>F</b> = ${forceN} N`
        ], { display: 'html', fixed: true, fontSize: 16, strokeColor: textColor });

        const dispA = Array.isArray(spec.dispA) && spec.dispA.length >= 2 ? spec.dispA : [920, 420];
        const dispB = Array.isArray(spec.dispB) && spec.dispB.length >= 2 ? spec.dispB : [1520, 420];
        const D1 = p(dispA[0], dispA[1]);
        const D2 = p(dispB[0], dispB[1]);
        board.create('arrow', [D1, D2], { strokeColor: dispColor, strokeWidth: 4, highlight: false });
        board.create('text', [
            () => (D1.X() + D2.X()) / 2,
            () => (D1.Y() + D2.Y()) / 2 + 35,
            `${distanceM} m`
        ], { fixed: true, fontSize: 16, strokeColor: textColor, anchorX: 'middle' });

        const angleCenter = Array.isArray(spec.angleCenter) && spec.angleCenter.length >= 2 ? spec.angleCenter : [1010, 556];
        const arcR = typeof spec.arcR === 'number' ? spec.arcR : 140;
        const C = p(angleCenter[0], angleCenter[1]);
        const theta = Math.abs(Math.atan2(F2.Y() - F1.Y(), F2.X() - F1.X()));
        const A = p(C.X() + arcR, C.Y());
        const B = p(C.X() + arcR * Math.cos(theta), C.Y() + arcR * Math.sin(theta));
        board.create('arc', [C, A, B], { strokeColor: angleColor, strokeWidth: 3, highlight: false });
        board.create('text', [
            () => C.X() + (arcR + 25) * Math.cos(theta / 2),
            () => C.Y() + (arcR + 25) * Math.sin(theta / 2),
            `${angleDeg}°`
        ], { fixed: true, fontSize: 16, strokeColor: textColor, anchorX: 'middle' });

        if (calibrate) {
            const clicks = [];
            const info = board.create('text', [10, imgH - 10, () => {
                const lines = clicks.map((c, i) => {
                    const pxY = imgH - c[1];
                    return `P${i + 1}=U(${c[0].toFixed(1)}, ${c[1].toFixed(1)}) | PX(${c[0].toFixed(1)}, ${pxY.toFixed(1)})`;
                });
                return `<div style=\"background:rgba(255,255,255,0.75);padding:6px 8px;border-radius:6px;max-width:740px\">${lines.join('<br/>')}</div>`;
            }], { display: 'html', fixed: true, anchorX: 'left', anchorY: 'top', fontSize: 14, strokeColor: textColor });

            board.on('down', (evt) => {
                let xy = null;
                try {
                    if (typeof board.getUsrCoordsOfMouse === 'function') {
                        xy = board.getUsrCoordsOfMouse(evt);
                    }
                } catch (e) {
                    xy = null;
                }
                if (!xy || xy.length < 2) return;

                clicks.push([xy[0], xy[1]]);
                board.create('point', [xy[0], xy[1]], { name: '', size: 2, fixed: true, strokeColor: '#ef4444', fillColor: '#ef4444', highlight: false });
                void info;
            });
        }

        return { image };
    }

    function presetCometTebbutt(board, spec) {
        const EC = typeof spec.EC === 'number' ? spec.EC : 0.133;
        const CS = typeof spec.CS === 'number' ? spec.CS : 0.894;
        const ES = typeof spec.ES === 'number' ? spec.ES : 1.017;

        const strokeColor = spec.color || '#0f172a';
        const textColor = spec.textColor || '#0f172a';
        const sunColor = spec.sunColor || '#f59e0b';
        const earthColor = spec.earthColor || '#2563eb';
        const cometColor = spec.cometColor || '#111827';

        const cosC = (CS * CS + EC * EC - ES * ES) / (2 * CS * EC);
        const clamped = Math.max(-1, Math.min(1, cosC));
        const angleC = Math.acos(clamped);
        const theta = Math.PI - angleC;
        const thetaDeg = theta * 180 / Math.PI;
        const thetaRound = Math.round(thetaDeg);

        const Ex = 0;
        const Ey = 0;
        const Sx = ES;
        const Sy = 0;
        const x = (EC * EC - CS * CS + ES * ES) / (2 * ES);
        const y = Math.sqrt(Math.max(0, EC * EC - x * x));

        const E = board.create('point', [Ex, Ey], {
            name: spec.nameEarth || 'E',
            fixed: true,
            size: 3,
            strokeColor: earthColor,
            fillColor: earthColor,
            highlight: false
        });
        const S = board.create('point', [Sx, Sy], {
            name: spec.nameSun || 'S',
            fixed: true,
            size: 3,
            strokeColor: sunColor,
            fillColor: sunColor,
            highlight: false
        });
        const C = board.create('point', [x, y], {
            name: spec.nameComet || 'C',
            fixed: true,
            size: 3,
            strokeColor: cometColor,
            fillColor: cometColor,
            highlight: false
        });

        board.create('segment', [E, S], { strokeColor, strokeWidth: 2, highlight: false });
        board.create('segment', [E, C], { strokeColor, strokeWidth: 2, highlight: false });
        board.create('segment', [C, S], { strokeColor, strokeWidth: 2, highlight: false });

        const labelOffset = (dx, dy, k) => {
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            return [-dy / len * k, dx / len * k];
        };

        const dxES = Sx - Ex;
        const dyES = Sy - Ey;
        const offES = labelOffset(dxES, dyES, -0.06);
        const tES = board.create('text', [
            (Ex + Sx) / 2 + offES[0],
            (Ey + Sy) / 2 + offES[1],
            `${ES.toFixed(3)} au`
        ], { fixed: true, fontSize: 15, strokeColor: textColor, anchorX: 'middle' });

        const dxEC = x - Ex;
        const dyEC = y - Ey;
        const offEC = labelOffset(dxEC, dyEC, 0.06);
        const tEC = board.create('text', [
            (Ex + x) / 2 + offEC[0],
            (Ey + y) / 2 + offEC[1],
            `${EC.toFixed(3)} au`
        ], { fixed: true, fontSize: 15, strokeColor: textColor, anchorX: 'middle' });

        const dxCS = Sx - x;
        const dyCS = Sy - y;
        const offCS = labelOffset(dxCS, dyCS, 0.06);
        const tCS = board.create('text', [
            (x + Sx) / 2 + offCS[0],
            (y + Sy) / 2 + offCS[1],
            `${CS.toFixed(3)} au`
        ], { fixed: true, fontSize: 15, strokeColor: textColor, anchorX: 'middle' });

        const showTheta = bool(spec.showTheta, true);
        if (showTheta) {
            const dirExtX = (x - Ex) / EC;
            const dirExtY = (y - Ey) / EC;
            const dirSX = (Sx - x) / CS;
            const dirSY = (Sy - y) / CS;

            const extLen = typeof spec.extLen === 'number' ? spec.extLen : 0.25;
            const E2 = board.create('point', [x + extLen * dirExtX, y + extLen * dirExtY], { visible: false, fixed: true, name: '' });
            board.create('segment', [C, E2], { strokeColor: '#94a3b8', strokeWidth: 1.4, dash: 2, fixed: true, highlight: false });

            const arcR = typeof spec.arcR === 'number' ? spec.arcR : 0.10;
            const A = board.create('point', [x + arcR * dirExtX, y + arcR * dirExtY], { visible: false, fixed: true, name: '' });
            const B = board.create('point', [x + arcR * dirSX, y + arcR * dirSY], { visible: false, fixed: true, name: '' });
            board.create('arc', [C, A, B], { strokeColor: '#64748b', strokeWidth: 2, fixed: true, highlight: false });

            const bisX0 = dirExtX + dirSX;
            const bisY0 = dirExtY + dirSY;
            const bisLen = Math.sqrt(bisX0 * bisX0 + bisY0 * bisY0) || 1;
            const bisX = bisX0 / bisLen;
            const bisY = bisY0 / bisLen;

            board.create('text', [
                x + (arcR + 0.05) * bisX,
                y + (arcR + 0.05) * bisY,
                'θ'
            ], { fixed: true, fontSize: 18, strokeColor: textColor, anchorX: 'left', anchorY: 'middle' });
        }

        void tES;
        void tEC;
        void tCS;

        return { E, S, C, thetaDeg };
    }

    function presetWindVectors(board, spec) {
    try {
        if (board && board.containerObj) {
            const c = board.containerObj;
            c.oncontextmenu = (e) => { try { e.preventDefault(); } catch (_) { } return false; };
            c.addEventListener('mousedown', (e) => {
                if (e && e.button === 2) {
                    try { e.preventDefault(); } catch (_) { }
                    try { e.stopPropagation(); } catch (_) { }
                }
            }, true);
            c.addEventListener('pointerdown', (e) => {
                if (e && e.button === 2) {
                    try { e.preventDefault(); } catch (_) { }
                    try { e.stopPropagation(); } catch (_) { }
                }
            }, true);
        }
    } catch (e) { }
    // --- HELPER: Hàm tính vị trí nhãn để không đè lên vector ---
    // Nguyên lý: Lấy trung điểm vector, sau đó tịnh tiến ra xa theo phương vuông góc (90 độ)
    const getLabelPos = (p1, p2, dist = 0.5) => {
        const mx = (p1[0] + p2[0]) / 2;
        const my = (p1[1] + p2[1]) / 2;
        // Tính góc của vector
        const angle = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
        // Cộng thêm 90 độ (PI/2) để lấy hướng vuông góc
        const perpAngle = angle + Math.PI / 2;
        return [
            mx + dist * Math.cos(perpAngle),
            my + dist * Math.sin(perpAngle)
        ];
    };
    // -----------------------------------------------------------

    const headingDeg = typeof spec.headingDeg === 'number' ? spec.headingDeg : 120;
    const speed = typeof spec.speed === 'number' ? spec.speed : 7;
    const withWind = bool(spec.withWind, false);
    const wind = Array.isArray(spec.wind) && spec.wind.length >= 2 ? spec.wind : [1.5, 1.0];
    const windAngleDeg = typeof spec.windAngleDeg === 'number' ? spec.windAngleDeg : null;
    const windSpeed = typeof spec.windSpeed === 'number' ? spec.windSpeed : null;
    const showP1Angles = bool(spec.showP1Angles, false);
    const p1AngleR = typeof spec.p1AngleR === 'number' ? spec.p1AngleR : 1.1;
    const hvDirRaw = typeof spec.horizontalVectorDir === 'string' ? spec.horizontalVectorDir : '';
    const hvDir = String(hvDirRaw).toLowerCase();
    const hvSign = (hvDir === 'left' || hvDir === 'west') ? -1 : ((hvDir === 'right' || hvDir === 'east') ? 1 : 1);
    
    // Lưu ý: Với công thức xoay mới bên dưới, bạn nên chỉnh planeOffsetDeg về 0 hoặc -90 
    // tùy theo icon gốc của bạn hướng sang Phải hay Lên.
    const planeOffsetDeg = typeof spec.planeOffsetDeg === 'number' ? spec.planeOffsetDeg : 0;

    const strokeColor = spec.color || '#0f172a';
    const textColor = spec.textColor || '#0f172a';

    const O = board.create('point', [0, 0], { visible: false, fixed: true, highlight: false, name: '' });
    
    // Vẽ hệ trục giả
    const X1 = board.create('point', [1, 0], { visible: false, fixed: true, highlight: false });
    const Y1 = board.create('point', [0, 1], { visible: false, fixed: true, highlight: false });
    board.create('line', [O, X1], { straightFirst: false, straightLast: true, lastArrow: true, strokeColor, strokeWidth: 2, fixed: true, highlight: false });
    board.create('line', [O, Y1], { straightFirst: false, straightLast: true, lastArrow: true, strokeColor, strokeWidth: 2, fixed: true, highlight: false });
    board.create('text', [4.9, -0.55, 'x'], { fixed: true, fontSize: 16, strokeColor: textColor, highlight: false });
    board.create('text', [0.2, 8.6, 'y'], { fixed: true, fontSize: 16, strokeColor: textColor, highlight: false });

    // Vẽ La bàn (Compass)
    if (bool(spec.compass, true)) {
        const pos = Array.isArray(spec.compassPos) && spec.compassPos.length >= 2 ? spec.compassPos : [3.2, 6.3];
        const cx = pos[0]; const cy = pos[1];
        const L = 0.8;
        const px1 = board.create('point', [cx - L, cy], { visible: false, fixed: true, highlight: false });
        const px2 = board.create('point', [cx + L, cy], { visible: false, fixed: true, highlight: false });
        const py1 = board.create('point', [cx, cy - L], { visible: false, fixed: true, highlight: false });
        const py2 = board.create('point', [cx, cy + L], { visible: false, fixed: true, highlight: false });
        board.create('segment', [px1, px2], { strokeWidth: 1.5, strokeColor, fixed: true, highlight: false });
        board.create('segment', [py1, py2], { strokeWidth: 1.5, strokeColor, fixed: true, highlight: false });
        board.create('point', [cx, cy], { size: 2, fixed: true, strokeColor, fillColor: strokeColor, highlight: false, name: '' });
        board.create('text', [cx, cy + 1.15, 'N'], { fixed: true, anchorX: 'middle', fontWeight: 'bold', strokeColor: textColor, highlight: false });
        board.create('text', [cx, cy - 1.35, 'S'], { fixed: true, anchorX: 'middle', fontWeight: 'bold', strokeColor: textColor, highlight: false });
        board.create('text', [cx + 1.2, cy, 'E'], { fixed: true, anchorX: 'middle', fontWeight: 'bold', strokeColor: textColor, highlight: false });
        board.create('text', [cx - 1.2, cy, 'W'], { fixed: true, anchorX: 'middle', fontWeight: 'bold', strokeColor: textColor, highlight: false });
    }

    // --- XỬ LÝ VECTOR V1 ---
    const ang1 = headingDeg * Math.PI / 180;
    const v1x = speed * Math.cos(ang1);
    const v1y = speed * Math.sin(ang1);
    const P1 = board.create('point', [v1x, v1y], { visible: false, fixed: true, highlight: false, name: '' });
    board.create('arrow', [O, P1], { strokeWidth: 3, strokeColor, fixed: true, highlight: false });

    // [New] Tự động tính vị trí nhãn v1 (đẩy ra xa 0.6 đơn vị)
    const labelPosV1 = getLabelPos([0, 0], [v1x, v1y], 0.6);
    board.create('text', [labelPosV1[0], labelPosV1[1], '<b>v<sub>1</sub></b>'], { 
        display: 'html', fixed: true, fontSize: 18, strokeColor: textColor, highlight: false,
        anchorX: 'middle', anchorY: 'middle' // Căn giữa tại điểm tính toán
    });

    let planeAnchor = P1;
    let planeAngle = ang1;

    if (!withWind) {
        // --- TRƯỜNG HỢP KHÔNG GIÓ ---
        const r = 1.8;
        const A = board.create('point', [r, 0], { visible: false, fixed: true, highlight: false });
        const B = board.create('point', [r * Math.cos(ang1), r * Math.sin(ang1)], { visible: false, fixed: true, highlight: false });
        board.create('arc', [O, A, B], { strokeColor: '#ef4444', strokeWidth: 2, fixed: true, highlight: false });

        // [New] Tính toán vị trí nhãn góc tự động
        const midAngle = (headingDeg / 2) * (Math.PI / 180);
        // Đặt chữ tại bán kính r + 0.2 để không dính vào đường cung
        const lblX = (r + 0.2) * Math.cos(midAngle);
        const lblY = (r + 0.2) * Math.sin(midAngle);
        
        board.create('text', [lblX, lblY, headingDeg + '°'], { 
            fixed: true, fontSize: 16, strokeColor: textColor, highlight: false,
            anchorX: 'middle', anchorY: 'bottom' 
        });

    } else {
        // --- TRƯỜNG HỢP CÓ GIÓ ---
        let v2x = 0;
        let v2y = 0;
        if (typeof windAngleDeg === 'number' && typeof windSpeed === 'number') {
            const a2 = windAngleDeg * Math.PI / 180;
            v2x = windSpeed * Math.cos(a2);
            v2y = windSpeed * Math.sin(a2);
        } else {
            v2x = Number(wind[0]) || 0;
            v2y = Number(wind[1]) || 0;
        }
        const Vtip = board.create('point', [v1x + v2x, v1y + v2y], { visible: false, fixed: true, highlight: false, name: '' });
        
        // Vẽ v2 (Gió)
        board.create('arrow', [P1, Vtip], { strokeWidth: 2.6, strokeColor, fixed: true, highlight: false });
        // [New] Nhãn v2: Đẩy ra xa 0.5 đơn vị
        const labelPosV2 = getLabelPos([v1x, v1y], [v1x + v2x, v1y + v2y], 0.5);
        board.create('text', [labelPosV2[0], labelPosV2[1], '<b>v<sub>2</sub></b>'], { 
            display: 'html', fixed: true, fontSize: 18, strokeColor: textColor, highlight: false, anchorX: 'middle', anchorY: 'middle' 
        });

        // Vẽ v (Tổng hợp)
        board.create('arrow', [O, Vtip], { strokeWidth: 3.2, strokeColor, fixed: true, highlight: false });
        // [New] Nhãn v tổng hợp: Dùng số ÂM (-0.6) để đẩy chữ sang phía đối diện
        // Điều này giúp nó không bị kẹp giữa v1 và trục y, hoặc đè lên v1
        const labelPosV = getLabelPos([0, 0], [v1x + v2x, v1y + v2y], -0.6);
        board.create('text', [labelPosV[0], labelPosV[1], '<b>v</b>'], { 
            display: 'html', fixed: true, fontSize: 18, strokeColor: textColor, highlight: false, anchorX: 'middle', anchorY: 'middle' 
        });

        // Góc lệch Alpha
        const vx = v1x + v2x;
        const vy = v1y + v2y;
        const angV = Math.atan2(vy, vx);
        const rr = 2.0;
        const Ay = board.create('point', [0, rr], { visible: false, fixed: true, highlight: false });
        const Av = board.create('point', [rr * Math.cos(angV), rr * Math.sin(angV)], { visible: false, fixed: true, highlight: false });
        board.create('arc', [O, Ay, Av], { strokeColor, strokeWidth: 2, fixed: true, highlight: false });
        board.create('text', [-0.6, 2.3, 'α°'], { fixed: true, fontSize: 16, strokeColor: textColor, highlight: false }); // Chỉnh lại vị trí alpha chút xíu

        if (showP1Angles) {
            const H_ang = board.create('point', [v1x + hvSign * p1AngleR, v1y], { visible: false, fixed: true, highlight: false });

            const oLen = Math.sqrt(v1x * v1x + v1y * v1y) || 1;
            const uOx = (-v1x) / oLen;
            const uOy = (-v1y) / oLen;
            const O_ang = board.create('point', [v1x + p1AngleR * uOx, v1y + p1AngleR * uOy], { visible: false, fixed: true, highlight: false });
            board.create('arc', [P1, H_ang, O_ang], { strokeColor: '#94a3b8', strokeWidth: 1.6, fixed: true, highlight: false });

            const wLen = Math.sqrt(v2x * v2x + v2y * v2y) || 1;
            const uWx = v2x / wLen;
            const uWy = v2y / wLen;
            const W_ang = board.create('point', [v1x + p1AngleR * uWx, v1y + p1AngleR * uWy], { visible: false, fixed: true, highlight: false });
            board.create('arc', [P1, H_ang, W_ang], { strokeColor: '#94a3b8', strokeWidth: 1.6, fixed: true, highlight: false });

            const uHx = hvSign;
            const uHy = 0;

            const b60x0 = uHx + uOx;
            const b60y0 = uHy + uOy;
            const b60Len = Math.sqrt(b60x0 * b60x0 + b60y0 * b60y0) || 1;
            board.create('text', [
                v1x + (p1AngleR + 0.32) * (b60x0 / b60Len),
                v1y + (p1AngleR + 0.32) * (b60y0 / b60Len),
                '60°'
            ], { fixed: true, fontSize: 14, strokeColor: textColor, highlight: false, anchorX: 'middle', anchorY: 'middle' });

            const b45x0 = uHx + uWx;
            const b45y0 = uHy + uWy;
            const b45Len = Math.sqrt(b45x0 * b45x0 + b45y0 * b45y0) || 1;
            board.create('text', [
                v1x + (p1AngleR + 0.62) * (b45x0 / b45Len),
                v1y + (p1AngleR + 0.62) * (b45y0 / b45Len),
                '45°'
            ], { fixed: true, fontSize: 14, strokeColor: textColor, highlight: false, anchorX: 'middle', anchorY: 'middle' });
        }

        planeAnchor = Vtip;
        planeAngle = angV;
    }

    if (spec.horizontalVector) {
        // Lấy độ dài từ JSON, nếu không có thì mặc định là 2.0
        const hLen = typeof spec.horizontalVector === 'number' ? spec.horizontalVector : 2.0;
        const dirRaw = typeof spec.horizontalVectorDir === 'string' ? spec.horizontalVectorDir : '';
        const dir = String(dirRaw).toLowerCase();
        const hSign = (dir === 'left' || dir === 'west') ? -1 : ((dir === 'right' || dir === 'east') ? 1 : (v1x < 0 ? -1 : 1));
        
        // Điểm đích: x = v1x + độ dài, y = v1y (giữ nguyên độ cao y)
        const H_tip = board.create('point', [v1x + hSign * hLen, v1y], { visible: false, fixed: true, highlight: false });
        
        // Vẽ mũi tên
        board.create('arrow', [P1, H_tip], { 
            strokeWidth: 2, 
            strokeColor: '#4b5563', // Màu xám hoặc đen tùy bạn
            dash: 2 // (Tùy chọn) Để nét đứt nếu muốn nó trông giống đường gióng
        , fixed: true, highlight: false });
    }
    // --- VẼ MÁY BAY ---
    if (bool(spec.plane, true)) {
        board.create('text', [
            () => planeAnchor.X(),
            () => planeAnchor.Y(),
            () => {
                // [Logic] Sử dụng dấu (-) để đảo chiều quay CSS cho khớp với Toán học
                // planeOffsetDeg: dùng để chỉnh icon nếu icon gốc không hướng sang Phải (0 độ)
                const deg = -(planeAngle * 180 / Math.PI) + planeOffsetDeg;
                const c = String(textColor);
                // Lưu ý: Tôi đã bỏ dấu '-' bên trong rotate(${deg}deg) vì đã tính ở biến 'const deg' rồi.
                return `<span style="display:inline-block;transform:rotate(${deg}deg);transform-origin:50% 50%;color:${c};font-size:28px;line-height:1;">✈</span>`;
            }
        ], {
            display: 'html',
            fixed: true,
            anchorX: 'middle',
            anchorY: 'middle'
        });
    }

    return { origin: O };
}

    function presetScene(board, spec) {
        const pointsSpec = spec && spec.points && typeof spec.points === 'object' ? spec.points : {};
        const segmentsSpec = Array.isArray(spec.segments) ? spec.segments : [];
        const polygonsSpec = Array.isArray(spec.polygons) ? spec.polygons : [];
        const circlesSpec = Array.isArray(spec.circles) ? spec.circles : [];

        const pointColorDefault = spec.pointColor || '#0f172a';
        const points = {};

        function resolvePointRef(ref) {
            if (!ref) return null;
            if (typeof ref === 'string') return points[ref] || null;
            if (Array.isArray(ref) && ref.length >= 2 && typeof ref[0] === 'number' && typeof ref[1] === 'number') {
                return board.create('point', [ref[0], ref[1]], { visible: false, fixed: true, highlight: false });
            }
            if (ref && typeof ref === 'object') {
                if (Array.isArray(ref.xy) && ref.xy.length >= 2) {
                    return board.create('point', [ref.xy[0], ref.xy[1]], { visible: false, fixed: true, highlight: false });
                }
                if (typeof ref.x === 'number' && typeof ref.y === 'number') {
                    return board.create('point', [ref.x, ref.y], { visible: false, fixed: true, highlight: false });
                }
            }
            return null;
        }

        for (const id of Object.keys(pointsSpec)) {
            const p = pointsSpec[id];
            let xy = null;
            if (Array.isArray(p) && p.length >= 2) xy = p;
            else if (p && typeof p === 'object' && Array.isArray(p.xy) && p.xy.length >= 2) xy = p.xy;
            else if (p && typeof p === 'object' && typeof p.x === 'number' && typeof p.y === 'number') xy = [p.x, p.y];
            if (!xy) continue;

            const name = (p && typeof p === 'object' && typeof p.name === 'string') ? p.name : (typeof p === 'string' ? p : id);
            const visible = bool(p && typeof p === 'object' ? p.visible : undefined, true);
            const fixed = bool(p && typeof p === 'object' ? p.fixed : undefined, true);
            const size = (p && typeof p === 'object' && typeof p.size === 'number') ? p.size : 2;
            const color = (p && typeof p === 'object' && (p.color || p.pointColor)) ? (p.color || p.pointColor) : pointColorDefault;

            points[id] = board.create('point', [xy[0], xy[1]], {
                name: name || '',
                visible,
                fixed,
                size,
                strokeColor: color,
                fillColor: color,
                highlight: false
            });
        }

        for (const poly of polygonsSpec) {
            if (!poly) continue;
            const ids = Array.isArray(poly.points) ? poly.points : [];
            const pts = ids.map(id => points[id]).filter(Boolean);
            if (pts.length < 3) continue;

            const color = poly.color || spec.color || '#0f172a';
            const strokeWidth = typeof poly.strokeWidth === 'number' ? poly.strokeWidth : (typeof spec.strokeWidth === 'number' ? spec.strokeWidth : 2);
            const fillOpacity = typeof poly.fillOpacity === 'number' ? poly.fillOpacity : 0.0;

            board.create('polygon', pts, {
                borders: {
                    strokeColor: color,
                    strokeWidth,
                    highlight: false
                },
                withLines: true,
                fillOpacity,
                highlight: false
            });
        }

        for (const seg of segmentsSpec) {
            if (!seg) continue;
            let aRef = null;
            let bRef = null;
            let strokeWidth = null;
            let color = null;

            if (Array.isArray(seg) && seg.length >= 2) {
                aRef = seg[0];
                bRef = seg[1];
                strokeWidth = (seg.length >= 3 && typeof seg[2] === 'number') ? seg[2] : null;
            } else if (typeof seg === 'object') {
                aRef = seg.p1 || seg.A;
                bRef = seg.p2 || seg.B;
                strokeWidth = typeof seg.strokeWidth === 'number' ? seg.strokeWidth : null;
                color = seg.color || null;
            }

            const A = resolvePointRef(aRef);
            const B = resolvePointRef(bRef);
            if (!A || !B) continue;

            board.create('segment', [A, B], {
                strokeColor: color || spec.color || '#0f172a',
                strokeWidth: strokeWidth !== null ? strokeWidth : (typeof spec.strokeWidth === 'number' ? spec.strokeWidth : 2),
                highlight: false
            });
        }

        for (const c of circlesSpec) {
            if (!c) continue;

            const color = c.color || spec.color || '#0f172a';
            const strokeWidth = typeof c.strokeWidth === 'number' ? c.strokeWidth : (typeof spec.strokeWidth === 'number' ? spec.strokeWidth : 2);

            const centerPt = resolvePointRef(c.center || c.C);
            if (!centerPt) continue;

            let circle = null;
            if (typeof c.r === 'number') {
                const P = board.create('point', [centerPt.X() + c.r, centerPt.Y()], { visible: false, fixed: true, highlight: false });
                circle = board.create('circle', [centerPt, P], { strokeColor: color, strokeWidth, highlight: false });
            } else {
                const throughPt = resolvePointRef(c.through || c.P);
                if (throughPt) {
                    circle = board.create('circle', [centerPt, throughPt], { strokeColor: color, strokeWidth, highlight: false });
                }
            }

            void circle;
        }

        return { points };
    }

    function presetInequalityRegion(board, spec) {
        const bb = getBBox(spec);
        const xMin = bb[0];
        const yMax = bb[1];
        const xMax = bb[2];
        const yMin = bb[3];

        const colors = Array.isArray(spec.colors) ? spec.colors : ['#ef4444', '#0ea5e9', '#22c55e', '#f59e0b', '#a855f7'];
        const showLines = bool(spec.showLines, true);
        const showVertices = bool(spec.showVertices, false);
        const showVertexCoords = bool(spec.showVertexCoords, false);

        const showHatching = bool(spec.showHatching, true);
        const hatchOpacity = typeof spec.hatchOpacity === 'number' ? spec.hatchOpacity : 0.35;
        const hatchWidth = typeof spec.hatchWidth === 'number' ? spec.hatchWidth : 1;
        const hatchSpacing = typeof spec.hatchSpacing === 'number' ? spec.hatchSpacing : (Math.min(Math.abs(xMax - xMin), Math.abs(yMax - yMin)) / 18);
        const maxHatchLines = typeof spec.maxHatchLines === 'number' ? spec.maxHatchLines : 160;

        const regionFillColor = typeof spec.fillColor === 'string' ? spec.fillColor : '#22c55e';
        const regionFillOpacity = typeof spec.fillOpacity === 'number' ? spec.fillOpacity : 0.18;
        const regionBorderColor = typeof spec.borderColor === 'string' ? spec.borderColor : '#16a34a';
        const regionBorderWidth = typeof spec.borderWidth === 'number' ? spec.borderWidth : 2;

        function parseSign(s) {
            const t = String(s || '').trim();
            if (t === '<=' || t === '=<' || t === '≤') return '≤';
            if (t === '>=' || t === '=>' || t === '≥') return '≥';
            if (t === '<') return '<';
            if (t === '>') return '>';
            return '≤';
        }

        function getIneqList() {
            if (Array.isArray(spec.inequalities)) {
                return spec.inequalities;
            }
            const out = [];
            const keys = Object.keys(spec || {}).filter(k => /^ineq\d*$/.test(k));
            keys.sort((a, b) => {
                const na = parseInt(a.slice(4) || '0', 10);
                const nb = parseInt(b.slice(4) || '0', 10);
                return na - nb;
            });
            for (const k of keys) {
                out.push(spec[k]);
            }
            return out;
        }

        const rawIneqs = getIneqList();
        const ineqs = [];
        for (let i = 0; i < rawIneqs.length; i++) {
            const r = rawIneqs[i];
            if (!r) continue;
            if (Array.isArray(r) && r.length >= 3) {
                const a = Number(r[0]);
                const b = Number(r[1]);
                const c = Number(r[2]);
                const sign = parseSign(r[3]);
                if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) continue;
                ineqs.push({ a, b, c, sign, color: colors[i % colors.length] });
                continue;
            }
            if (typeof r === 'object') {
                const a = Number(r.a);
                const b = Number(r.b);
                const c = Number(r.c);
                const sign = parseSign(r.sign);
                const color = typeof r.color === 'string' ? r.color : colors[i % colors.length];
                if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) continue;
                ineqs.push({ a, b, c, sign, color });
            }
        }

        function evalF(ineq, x, y) {
            return ineq.a * x + ineq.b * y - ineq.c;
        }

        function isInside(ineq, x, y) {
            const v = evalF(ineq, x, y);
            if (ineq.sign === '≤') return v <= 1e-9;
            if (ineq.sign === '<') return v < -1e-9;
            if (ineq.sign === '≥') return v >= -1e-9;
            if (ineq.sign === '>') return v > 1e-9;
            return v <= 1e-9;
        }

        function intersectSegWithLine(ineq, p, q) {
            const fp = evalF(ineq, p.x, p.y);
            const fq = evalF(ineq, q.x, q.y);
            const den = fp - fq;
            if (Math.abs(den) < 1e-12) return null;
            const t = fp / den;
            return { x: p.x + t * (q.x - p.x), y: p.y + t * (q.y - p.y) };
        }

        function dedup(poly) {
            const out = [];
            const eps = 1e-7;
            for (const p of poly) {
                const last = out.length ? out[out.length - 1] : null;
                if (!last || Math.abs(p.x - last.x) > eps || Math.abs(p.y - last.y) > eps) out.push(p);
            }
            if (out.length >= 2) {
                const a = out[0];
                const b = out[out.length - 1];
                if (Math.abs(a.x - b.x) < eps && Math.abs(a.y - b.y) < eps) out.pop();
            }
            return out;
        }

        function clipPoly(poly, ineq) {
            if (!poly || poly.length === 0) return [];
            const out = [];
            for (let i = 0; i < poly.length; i++) {
                const cur = poly[i];
                const prev = poly[(i + poly.length - 1) % poly.length];
                const curIn = isInside(ineq, cur.x, cur.y);
                const prevIn = isInside(ineq, prev.x, prev.y);
                if (curIn) {
                    if (!prevIn) {
                        const inter = intersectSegWithLine(ineq, prev, cur);
                        if (inter) out.push(inter);
                    }
                    out.push(cur);
                } else if (prevIn) {
                    const inter = intersectSegWithLine(ineq, prev, cur);
                    if (inter) out.push(inter);
                }
            }
            return dedup(out);
        }

        function invertSign(s) {
            if (s === '≤') return '>';
            if (s === '<') return '≥';
            if (s === '≥') return '<';
            if (s === '>') return '≤';
            return '>';
        }

        function toRgba(color, alpha) {
            if (typeof color !== 'string') return color;
            const c = color.trim();
            if (/^rgba\(/i.test(c) || /^rgb\(/i.test(c)) return c;
            const m = /^#([0-9a-f]{6})$/i.exec(c);
            if (!m) return c;
            const hex = m[1];
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            const a = Math.max(0, Math.min(1, alpha));
            return `rgba(${r},${g},${b},${a})`;
        }

        function cross(u, v) {
            return u.x * v.y - u.y * v.x;
        }

        function intersectLineWithSegment(p0, d, a, b) {
            const r = { x: b.x - a.x, y: b.y - a.y };
            const den = cross(d, r);
            if (Math.abs(den) < 1e-12) return null;
            const ap0 = { x: a.x - p0.x, y: a.y - p0.y };
            const t = cross(ap0, r) / den;
            const u = cross(ap0, d) / den;
            if (u < -1e-12 || u > 1 + 1e-12) return null;
            return { x: p0.x + t * d.x, y: p0.y + t * d.y };
        }

        function drawHatchingForPoly(polyToHatch, ineq) {
            if (!polyToHatch || polyToHatch.length < 3) return;
            const a = ineq.a;
            const b = ineq.b;
            const len = Math.sqrt(a * a + b * b);
            if (!(len > 1e-12)) return;
            const spacing = (hatchSpacing && hatchSpacing > 1e-9) ? hatchSpacing : 0.4;

            // Boundary line: a*x + b*y = c
            // - normal vector (perpendicular to boundary) is n = (a, b)
            // - boundary direction (parallel to boundary) is t = (b, -a)
            // We want hatch lines PERPENDICULAR to the boundary => hatch direction is along n.
            const d = { x: a / len, y: b / len };
            const s = { x: b / len, y: -a / len };

            // Cover the whole clipped polygon by scanning offsets along s (projection range).
            let minProj = Infinity;
            let maxProj = -Infinity;
            for (const p of polyToHatch) {
                const proj = p.x * s.x + p.y * s.y;
                if (proj < minProj) minProj = proj;
                if (proj > maxProj) maxProj = proj;
            }
            if (!Number.isFinite(minProj) || !Number.isFinite(maxProj)) return;

            let kStart = Math.floor(minProj / spacing) - 1;
            let kEnd = Math.ceil(maxProj / spacing) + 1;
            const total = kEnd - kStart + 1;
            if (total > maxHatchLines) {
                const mid = Math.floor((kStart + kEnd) / 2);
                const half = Math.max(1, Math.floor(maxHatchLines / 2));
                kStart = mid - half;
                kEnd = mid + half;
            }

            const hatchColor = toRgba(ineq.color, hatchOpacity);
            const polyEdges = polyToHatch;

            for (let k = kStart; k <= kEnd; k++) {
                const off = k * spacing;
                const p0 = { x: s.x * off, y: s.y * off };
                const pts = [];
                for (let i = 0; i < polyEdges.length; i++) {
                    const A = polyEdges[i];
                    const B = polyEdges[(i + 1) % polyEdges.length];
                    const inter = intersectLineWithSegment(p0, d, A, B);
                    if (!inter) continue;
                    let dup = false;
                    for (const q of pts) {
                        if (Math.abs(q.x - inter.x) < 1e-7 && Math.abs(q.y - inter.y) < 1e-7) { dup = true; break; }
                    }
                    if (!dup) pts.push(inter);
                }
                if (pts.length < 2) continue;
                pts.sort((p, q) => (p.x * d.x + p.y * d.y) - (q.x * d.x + q.y * d.y));
                const P = pts[0];
                const Q = pts[pts.length - 1];
                if (Math.abs(P.x - Q.x) < 1e-9 && Math.abs(P.y - Q.y) < 1e-9) continue;
                const JP = board.create('point', [P.x, P.y], { visible: false, fixed: true, highlight: false });
                const JQ = board.create('point', [Q.x, Q.y], { visible: false, fixed: true, highlight: false });
                board.create('segment', [JP, JQ], { strokeColor: hatchColor, strokeWidth: hatchWidth, highlight: false, fixed: true });
            }
        }

        const bboxPoly = [
            { x: xMin, y: yMax },
            { x: xMax, y: yMax },
            { x: xMax, y: yMin },
            { x: xMin, y: yMin }
        ];

        let poly = bboxPoly;

        for (const ineq of ineqs) {
            poly = clipPoly(poly, ineq);
            if (poly.length < 3) break;
        }

        if (showHatching) {
            for (const ineq of ineqs) {
                const inv = { a: ineq.a, b: ineq.b, c: ineq.c, sign: invertSign(ineq.sign), color: ineq.color };
                const nonPoly = clipPoly(bboxPoly, inv);
                drawHatchingForPoly(nonPoly, ineq);
            }
        }

        if (showLines) {
            for (let i = 0; i < ineqs.length; i++) {
                const ineq = ineqs[i];
                if (Math.abs(ineq.a) < 1e-12 && Math.abs(ineq.b) < 1e-12) continue;

                let p1 = null;
                let p2 = null;
                if (Math.abs(ineq.b) > 1e-12) {
                    const xa = xMin - 1;
                    const xb = xMax + 1;
                    p1 = { x: xa, y: (ineq.c - ineq.a * xa) / ineq.b };
                    p2 = { x: xb, y: (ineq.c - ineq.a * xb) / ineq.b };
                } else {
                    const x0 = ineq.c / ineq.a;
                    p1 = { x: x0, y: yMin - 1 };
                    p2 = { x: x0, y: yMax + 1 };
                }

                const A = board.create('point', [p1.x, p1.y], { visible: false, fixed: true, highlight: false });
                const B = board.create('point', [p2.x, p2.y], { visible: false, fixed: true, highlight: false });
                const dashed = (ineq.sign === '<' || ineq.sign === '>') ? 2 : 0;
                board.create('line', [A, B], {
                    straightFirst: true,
                    straightLast: true,
                    strokeColor: ineq.color,
                    strokeWidth: 2,
                    dash: dashed,
                    highlight: false
                });
            }
        }

        if (poly.length >= 3) {
            const pts = poly.map(p => board.create('point', [p.x, p.y], { visible: false, fixed: true, highlight: false }));
            board.create('polygon', pts, {
                borders: {
                    strokeColor: regionBorderColor,
                    strokeWidth: regionBorderWidth,
                    highlight: false
                },
                withLines: true,
                fillColor: regionFillColor,
                fillOpacity: regionFillOpacity,
                highlight: false
            });

            if (showVertices) {
                for (let i = 0; i < poly.length; i++) {
                    const p = poly[i];
                    const name = String.fromCharCode(65 + (i % 26));
                    const P = board.create('point', [p.x, p.y], {
                        name: name,
                        size: 2,
                        fixed: true,
                        strokeColor: '#ef4444',
                        fillColor: '#ef4444',
                        highlight: false
                    });
                    if (showVertexCoords) {
                        board.create('text', [
                            () => P.X() + 0.1,
                            () => P.Y() + 0.1,
                            () => `(${P.X().toFixed(2)}; ${P.Y().toFixed(2)})`
                        ], { fixed: true, fontSize: 13, strokeColor: '#ef4444', highlight: false, anchorX: 'left' });
                    }
                }
            }
        }

        return { poly };
    }

    async function presetSignTable(board, spec) {
        const variable = typeof spec.variable === 'string' ? spec.variable : 'x';
        const autoMode = bool(spec.auto, false);
        const expressions = Array.isArray(spec.expressions) ? spec.expressions : [];
        const intervalMin = typeof spec.intervalMin === 'number' ? spec.intervalMin : -Infinity;
        const intervalMax = typeof spec.intervalMax === 'number' ? spec.intervalMax : Infinity;

        const kind = typeof spec.kind === 'string' ? spec.kind : '';

        if (autoMode && kind === 'variation') {
            return await presetVariationTableAuto(board, spec, variable, intervalMin, intervalMax);
        }

        if (autoMode && expressions.length > 0) {
            return await presetSignTableAuto(board, spec, variable, expressions, intervalMin, intervalMax);
        }

        let intervals = Array.isArray(spec.intervals) ? spec.intervals : [];
        let rows = Array.isArray(spec.rows) ? spec.rows : [];

        const cellW = typeof spec.cellWidth === 'number' ? spec.cellWidth : 1.2;
        const cellH = typeof spec.cellHeight === 'number' ? spec.cellHeight : 0.8;
        const leftColW = typeof spec.leftColumnWidth === 'number' ? spec.leftColumnWidth : 1.8;
        const headerH = typeof spec.headerHeight === 'number' ? spec.headerHeight : 0.9;

        const borderColor = typeof spec.borderColor === 'string' ? spec.borderColor : '#000000';
        const borderWidth = typeof spec.borderWidth === 'number' ? spec.borderWidth : 2;
        const textSize = typeof spec.textSize === 'number' ? spec.textSize : 16;

        const numCols = intervals.length;
        const numRows = rows.length;

        const tableW = leftColW + numCols * cellW;
        const tableH = headerH + numRows * cellH;

        const x0 = 0;
        const y0 = 0;

        function line(x1, y1, x2, y2, w) {
            const A = board.create('point', [x1, y1], { visible: false, fixed: true });
            const B = board.create('point', [x2, y2], { visible: false, fixed: true });
            board.create('segment', [A, B], { strokeColor: borderColor, strokeWidth: w || borderWidth, highlight: false, fixed: true });
        }

        function txt(x, y, content, opts) {
            const size = (opts && opts.size) || textSize;
            const anchor = (opts && opts.anchor) || 'middle';
            board.create('text', [x, y, content], {
                fontSize: size,
                fixed: true,
                highlight: false,
                anchorX: anchor,
                anchorY: 'middle',
                strokeColor: '#000000'
            });
        }

        line(x0, y0, x0 + tableW, y0, borderWidth);
        line(x0, y0, x0, y0 - tableH, borderWidth);
        line(x0 + tableW, y0, x0 + tableW, y0 - tableH, borderWidth);
        line(x0, y0 - tableH, x0 + tableW, y0 - tableH, borderWidth);

        line(x0 + leftColW, y0, x0 + leftColW, y0 - tableH, borderWidth);
        line(x0, y0 - headerH, x0 + tableW, y0 - headerH, borderWidth);

        txt(x0 + leftColW / 2, y0 - headerH / 2, variable, { size: textSize + 2 });

        for (let i = 0; i < numCols; i++) {
            const cx = x0 + leftColW + (i + 0.5) * cellW;
            const cy = y0 - headerH / 2;
            const int = intervals[i];
            let label = '';
            if (typeof int === 'string') {
                label = int;
            } else if (typeof int === 'object' && int.label) {
                label = int.label;
            }
            txt(cx, cy, label, { size: textSize });

            if (i < numCols - 1) {
                const lx = x0 + leftColW + (i + 1) * cellW;
                line(lx, y0, lx, y0 - tableH, 1);
            }
        }

        for (let r = 0; r < numRows; r++) {
            const row = rows[r];
            const rowY = y0 - headerH - (r + 0.5) * cellH;
            const leftLabel = typeof row.label === 'string' ? row.label : (typeof row === 'string' ? row : '');
            txt(x0 + leftColW / 2, rowY, leftLabel, { size: textSize });

            const cells = Array.isArray(row.cells) ? row.cells : (Array.isArray(row) ? row : []);

            for (let c = 0; c < numCols && c < cells.length; c++) {
                const cell = cells[c];
                const cx = x0 + leftColW + (c + 0.5) * cellW;
                const cy = rowY;

                if (typeof cell === 'string') {
                    if (cell === '||') {
                        line(cx - 0.05, cy - cellH * 0.3, cx - 0.05, cy + cellH * 0.3, 2);
                        line(cx + 0.05, cy - cellH * 0.3, cx + 0.05, cy + cellH * 0.3, 2);
                    } else if (cell === '↗' || cell === 'up') {
                        const ax = cx - cellW * 0.25;
                        const ay = cy - cellH * 0.2;
                        const bx = cx + cellW * 0.25;
                        const by = cy + cellH * 0.2;
                        const A = board.create('point', [ax, ay], { visible: false, fixed: true });
                        const B = board.create('point', [bx, by], { visible: false, fixed: true });
                        board.create('arrow', [A, B], { strokeColor: borderColor, strokeWidth: 2, highlight: false, fixed: true });
                    } else if (cell === '↘' || cell === 'down') {
                        const ax = cx - cellW * 0.25;
                        const ay = cy + cellH * 0.2;
                        const bx = cx + cellW * 0.25;
                        const by = cy - cellH * 0.2;
                        const A = board.create('point', [ax, ay], { visible: false, fixed: true });
                        const B = board.create('point', [bx, by], { visible: false, fixed: true });
                        board.create('arrow', [A, B], { strokeColor: borderColor, strokeWidth: 2, highlight: false, fixed: true });
                    } else {
                        txt(cx, cy, cell, { size: textSize });
                    }
                } else if (typeof cell === 'object') {
                    const content = cell.value || cell.text || '';
                    if (content === '||') {
                        line(cx - 0.05, cy - cellH * 0.3, cx - 0.05, cy + cellH * 0.3, 2);
                        line(cx + 0.05, cy - cellH * 0.3, cx + 0.05, cy + cellH * 0.3, 2);
                    } else if (content === '↗' || content === 'up') {
                        const ax = cx - cellW * 0.25;
                        const ay = cy - cellH * 0.2;
                        const bx = cx + cellW * 0.25;
                        const by = cy + cellH * 0.2;
                        const A = board.create('point', [ax, ay], { visible: false, fixed: true });
                        const B = board.create('point', [bx, by], { visible: false, fixed: true });
                        board.create('arrow', [A, B], { strokeColor: borderColor, strokeWidth: 2, highlight: false, fixed: true });
                    } else if (content === '↘' || content === 'down') {
                        const ax = cx - cellW * 0.25;
                        const ay = cy + cellH * 0.2;
                        const bx = cx + cellW * 0.25;
                        const by = cy - cellH * 0.2;
                        const A = board.create('point', [ax, ay], { visible: false, fixed: true });
                        const B = board.create('point', [bx, by], { visible: false, fixed: true });
                        board.create('arrow', [A, B], { strokeColor: borderColor, strokeWidth: 2, highlight: false, fixed: true });
                    } else {
                        txt(cx, cy, content, { size: textSize });
                    }
                    if (cell.topLabel) {
                        txt(cx, cy + cellH * 0.35, cell.topLabel, { size: textSize - 3 });
                    }
                    if (cell.bottomLabel) {
                        txt(cx, cy - cellH * 0.35, cell.bottomLabel, { size: textSize - 3 });
                    }
                }
            }

            if (r < numRows - 1) {
                const ly = y0 - headerH - (r + 1) * cellH;
                line(x0, ly, x0 + tableW, ly, 1);
            }
        }

        return { tableW, tableH };
    }

    async function computeVariationTableAutoDataSympy(fExpr, derivativeFactors, variable, intervalMin, intervalMax, forbiddenValues, showDerivativeFactors, derivativeLabel, functionLabel) {
        const parsedFactors = [];
        for (const e of derivativeFactors) {
            if (!e) continue;
            if (typeof e === 'string') parsedFactors.push({ expr: e, label: e, forbidden: false });
            else if (typeof e === 'object') {
                const exprStr = e.expr || e.expression || '';
                if (!exprStr) continue;
                parsedFactors.push({ expr: exprStr, label: e.label || exprStr, forbidden: bool(e.forbidden, false) });
            }
        }

        const internal = [];
        const exactLabels = [];
        function addInternal(x, label) {
            if (!Number.isFinite(x)) return;
            for (let i = 0; i < internal.length; i++) {
                if (Math.abs(internal[i] - x) < 1e-8) {
                    if (label && !exactLabels.some(p => Math.abs(p.x - internal[i]) < 1e-8)) exactLabels.push({ x: internal[i], label });
                    return;
                }
            }
            internal.push(x);
            if (label) exactLabels.push({ x, label });
        }
        function labelForX(x) {
            for (const p of exactLabels) {
                if (Math.abs(p.x - x) < 1e-7) return p.label;
            }
            return '';
        }

        const allForbidden = [];

        const factorRoots = [];
        for (let i = 0; i < parsedFactors.length; i++) {
            const roots = await sympyRootsRealLatex(parsedFactors[i].expr, variable);
            const nums = [];
            for (const r of roots) {
                nums.push(r.x);
                if (r.x > intervalMin && r.x < intervalMax) addInternal(r.x, r.label);
            }
            const denom = await sympyDenomRootsRealLatex(parsedFactors[i].expr, variable);
            for (const r of denom) {
                allForbidden.push(r.x);
                if (r.x > intervalMin && r.x < intervalMax) addInternal(r.x, r.label);
            }
            nums.sort((a, b) => a - b);
            factorRoots.push(nums);
        }
        for (const fv of forbiddenValues) {
            const x = Number(fv);
            if (!Number.isFinite(x)) continue;
            allForbidden.push(x);
            if (x > intervalMin && x < intervalMax) addInternal(x, '');
        }

        const denomRoots = await sympyDenomRootsRealLatex(fExpr, variable);
        for (const r of denomRoots) {
            allForbidden.push(r.x);
            if (r.x > intervalMin && r.x < intervalMax) addInternal(r.x, r.label);
        }

        internal.sort((a, b) => a - b);

        const breakpoints = [intervalMin, ...internal, intervalMax];
        const labels = breakpoints.map(v => {
            if (v === -Infinity) return '-\\infty';
            if (v === Infinity) return '+\\infty';
            const lab = labelForX(v);
            return lab || formatNumber(v);
        });

        const nIntervals = Math.max(1, breakpoints.length - 1);

        function chooseTestPoint(a, b) {
            if (a === -Infinity && b === Infinity) return 0;
            if (a === -Infinity) return (Number.isFinite(b) ? b - 1 : 0);
            if (b === Infinity) return (Number.isFinite(a) ? a + 1 : 0);
            return (a + b) / 2;
        }

        function mulSigns(s1, s2) {
            if (!s1) return s2;
            if (!s2) return s1;
            if (s1 === '?' || s2 === '?') return '?';
            if (s1 === '-' && s2 === '-') return '+';
            if (s1 === '-' && s2 === '+') return '-';
            if (s1 === '+' && s2 === '-') return '-';
            return '+';
        }

        function isForbiddenX(x0) {
            for (const x of allForbidden) {
                if (Math.abs(x - x0) < 1e-7) return true;
            }
            return false;
        }

        function factorMarkAtIndex(j) {
            const x0 = breakpoints[j];
            if (!Number.isFinite(x0)) return '';
            if (isForbiddenX(x0)) return '||';
            let hasZero = false;
            for (let i = 0; i < parsedFactors.length; i++) {
                const roots = factorRoots[i];
                const isRoot = roots.some(r => Math.abs(r - x0) < 1e-7);
                if (isRoot) {
                    if (parsedFactors[i].forbidden) return '||';
                    hasZero = true;
                }
            }
            return hasZero ? '0' : '';
        }

        const rows = [];
        if (showDerivativeFactors) {
            for (let i = 0; i < parsedFactors.length; i++) {
                const ed = parsedFactors[i];
                const intervalSigns = [];
                const pointMarks = {};
                for (let k = 0; k < nIntervals; k++) {
                    const tp = chooseTestPoint(breakpoints[k], breakpoints[k + 1]);
                    const s = await sympySignAt(ed.expr, variable, tp);
                    intervalSigns.push(s || evaluateSign(ed.expr, variable, tp));
                }
                for (let j = 1; j < nIntervals; j++) {
                    const mk = factorMarkAtIndex(j);
                    if (mk) pointMarks[j] = mk;
                }
                rows.push({ type: 'sign', label: ed.label, intervalSigns, pointMarks });
            }
        }

        const fpSigns = [];
        const fpMarks = {};
        for (let k = 0; k < nIntervals; k++) {
            const tp = chooseTestPoint(breakpoints[k], breakpoints[k + 1]);
            let s = '+';
            for (const ed of parsedFactors) {
                const fSign = await sympySignAt(ed.expr, variable, tp);
                s = mulSigns(s, fSign || evaluateSign(ed.expr, variable, tp));
            }
            fpSigns.push(s);
        }
        for (let j = 1; j < nIntervals; j++) {
            const mk = factorMarkAtIndex(j);
            if (mk) fpMarks[j] = mk;
        }
        rows.push({ type: 'sign', label: derivativeLabel || `f'(${variable})`, intervalSigns: fpSigns, pointMarks: fpMarks });

        function fmtVal(v) {
            if (v === null) return '?';
            if (v === Infinity) return '+\\infty';
            if (v === -Infinity) return '-\\infty';
            if (!Number.isFinite(v)) return '?';
            if (Math.abs(v) > 1e6) return v > 0 ? '+\\infty' : '-\\infty';
            return formatNumber(v);
        }

        const values = Array(labels.length).fill(null);
        for (let j = 0; j < breakpoints.length; j++) {
            const x0 = breakpoints[j];
            const mk = j > 0 && j < breakpoints.length - 1 ? (fpMarks[j] || '') : '';

            if (mk === '||') {
                const leftV = await sympyLimitAt(fExpr, variable, x0, '-');
                const rightV = await sympyLimitAt(fExpr, variable, x0, '+');
                values[j] = {
                    type: 'forbidden',
                    left: fmtVal(leftV),
                    right: fmtVal(rightV),
                    leftPos: 'mid',
                    rightPos: 'mid'
                };
                continue;
            }

            if (x0 === -Infinity) {
                const v = await sympyLimitInf(fExpr, variable, '-');
                values[j] = { type: 'finite', text: fmtVal(v), pos: 'mid' };
                continue;
            }
            if (x0 === Infinity) {
                const v = await sympyLimitInf(fExpr, variable, '+');
                values[j] = { type: 'finite', text: fmtVal(v), pos: 'mid' };
                continue;
            }

            const v = await sympyEvalAt(fExpr, variable, x0);
            values[j] = { type: 'finite', text: fmtVal(v), pos: 'mid' };
        }

        for (let j = 1; j < breakpoints.length - 1; j++) {
            const left = fpSigns[j - 1];
            const right = fpSigns[j];
            if (values[j] && values[j].type === 'finite') {
                if (left === '+' && right === '-') values[j].pos = 'top';
                else if (left === '-' && right === '+') values[j].pos = 'bottom';
            }
        }

        const arrows = [];
        for (let k = 0; k < nIntervals; k++) {
            const s = fpSigns[k];
            if (s === '+') arrows.push('up');
            else if (s === '-') arrows.push('down');
            else arrows.push('');
        }

        rows.push({ type: 'variation', label: functionLabel || `f(${variable})`, arrows, values });
        return { breakpoints, labels, rows };
    }

    async function presetVariationTableAuto(board, spec, variable, intervalMin, intervalMax) {
        const fExpr = typeof spec.f === 'string' ? spec.f : (typeof spec.function === 'string' ? spec.function : '');
        const derivativeFactors = Array.isArray(spec.derivativeFactors) ? spec.derivativeFactors
            : (Array.isArray(spec.fpFactors) ? spec.fpFactors
                : (Array.isArray(spec.derivativeExpressions) ? spec.derivativeExpressions : []));

        const showDerivativeFactors = bool(spec.showDerivativeFactors, false);
        const forbiddenValues = Array.isArray(spec.forbiddenValues) ? spec.forbiddenValues : (Array.isArray(spec.forbidden) ? spec.forbidden : []);

        if (!fExpr || derivativeFactors.length === 0) {
            return await presetSignTableAuto(board, spec, variable, derivativeFactors, intervalMin, intervalMax);
        }

        const derivativeLabel = typeof spec.derivativeLabel === 'string' ? spec.derivativeLabel : `f'(${variable})`;
        const functionLabel = typeof spec.functionLabel === 'string' ? spec.functionLabel : `f(${variable})`;

        const engine = typeof spec.engine === 'string' ? spec.engine : '';
        let data = null;
        if (engine === 'sympy') {
            try {
                data = await computeVariationTableAutoDataSympy(
                    fExpr,
                    derivativeFactors,
                    variable,
                    intervalMin,
                    intervalMax,
                    forbiddenValues,
                    showDerivativeFactors,
                    derivativeLabel,
                    functionLabel
                );
            } catch (e) {
                console.warn('[signTable] SymPy variation engine failed, falling back to numeric.', e);
                data = null;
            }
        }
        if (!data) {
            data = computeVariationTableAutoData(
                fExpr,
                derivativeFactors,
                variable,
                intervalMin,
                intervalMax,
                forbiddenValues,
                showDerivativeFactors,
                derivativeLabel,
                functionLabel
            );
        }

        const cellW = typeof spec.cellWidth === 'number' ? spec.cellWidth : 1.2;
        const cellH = typeof spec.cellHeight === 'number' ? spec.cellHeight : 0.8;
        const leftColW = typeof spec.leftColumnWidth === 'number' ? spec.leftColumnWidth : 1.8;
        const headerH = typeof spec.headerHeight === 'number' ? spec.headerHeight : 0.9;

        const borderColor = typeof spec.borderColor === 'string' ? spec.borderColor : '#000000';
        const borderWidth = typeof spec.borderWidth === 'number' ? spec.borderWidth : 2;
        const textSize = typeof spec.textSize === 'number' ? spec.textSize : 16;

        const breakpoints = data.breakpoints;
        const labels = data.labels;
        const nIntervals = Math.max(1, breakpoints.length - 1);
        const rows = data.rows;

        const tableW = leftColW + nIntervals * cellW;
        const tableH = headerH + rows.length * cellH;

        const x0 = 0;
        const y0 = 0;

        function line(x1, y1, x2, y2, w) {
            const A = board.create('point', [x1, y1], { visible: false, fixed: true });
            const B = board.create('point', [x2, y2], { visible: false, fixed: true });
            board.create('segment', [A, B], { strokeColor: borderColor, strokeWidth: w || borderWidth, highlight: false, fixed: true });
        }

        function txt(x, y, content, opts) {
            const size = (opts && opts.size) || textSize;
            const anchor = (opts && opts.anchor) || 'middle';
            board.create('text', [x, y, content], {
                fontSize: size,
                fixed: true,
                highlight: false,
                anchorX: anchor,
                anchorY: 'middle',
                strokeColor: '#000000'
            });
        }

        function drawPointMark(x, y, mark) {
            if (!mark) return;
            if (mark === '0') {
                txt(x, y, '0', { size: textSize });
                return;
            }
            if (mark === '||') {
                const dx = Math.min(0.08, cellW * 0.08);
                line(x - dx, y - cellH * 0.3, x - dx, y + cellH * 0.3, 2);
                line(x + dx, y - cellH * 0.3, x + dx, y + cellH * 0.3, 2);
            }
        }

        line(x0, y0, x0 + tableW, y0, borderWidth);
        line(x0, y0, x0, y0 - tableH, borderWidth);
        line(x0 + tableW, y0, x0 + tableW, y0 - tableH, borderWidth);
        line(x0, y0 - tableH, x0 + tableW, y0 - tableH, borderWidth);

        line(x0 + leftColW, y0, x0 + leftColW, y0 - tableH, borderWidth);
        line(x0, y0 - headerH, x0 + tableW, y0 - headerH, borderWidth);

        for (let i = 0; i <= nIntervals; i++) {
            const lx = x0 + leftColW + i * cellW;
            line(lx, y0, lx, y0 - tableH, i === 0 || i === nIntervals ? borderWidth : 1);
        }

        for (let r = 0; r < rows.length; r++) {
            const ly = y0 - headerH - (r + 1) * cellH;
            line(x0, ly, x0 + tableW, ly, r === rows.length - 1 ? borderWidth : 1);
        }

        txt(x0 + leftColW / 2, y0 - headerH / 2, variable, { size: textSize + 2 });

        for (let i = 0; i < labels.length; i++) {
            const xB = x0 + leftColW + i * cellW;
            const lab = labels[i];
            if (i === 0) {
                txt(xB + 0.12, y0 - headerH / 2, lab, { size: textSize, anchor: 'left' });
            } else if (i === labels.length - 1) {
                txt(xB - 0.12, y0 - headerH / 2, lab, { size: textSize, anchor: 'right' });
            } else {
                txt(xB, y0 - headerH / 2, lab, { size: textSize, anchor: 'middle' });
            }
        }

        for (let r = 0; r < rows.length; r++) {
            const row = rows[r];
            const rowY = y0 - headerH - (r + 0.5) * cellH;
            txt(x0 + leftColW / 2, rowY, row.label || '', { size: textSize });

            if (row.type === 'sign') {
                for (let i = 0; i < nIntervals; i++) {
                    const cx = x0 + leftColW + (i + 0.5) * cellW;
                    txt(cx, rowY, row.intervalSigns[i] || '', { size: textSize });
                }
                for (let i = 1; i < nIntervals; i++) {
                    const xB = x0 + leftColW + i * cellW;
                    drawPointMark(xB, rowY, (row.pointMarks && row.pointMarks[i]) || '');
                }
                continue;
            }

            if (row.type === 'variation') {
                for (let i = 0; i < nIntervals; i++) {
                    const dir = row.arrows[i];
                    if (!dir) continue;
                    const xL = x0 + leftColW + i * cellW;
                    const xR = x0 + leftColW + (i + 1) * cellW;
                    const margin = cellW * 0.18;
                    const ax = xL + margin;
                    const bx = xR - margin;
                    const ay = dir === 'up' ? (rowY - cellH * 0.18) : (rowY + cellH * 0.18);
                    const by = dir === 'up' ? (rowY + cellH * 0.18) : (rowY - cellH * 0.18);
                    const A = board.create('point', [ax, ay], { visible: false, fixed: true });
                    const B = board.create('point', [bx, by], { visible: false, fixed: true });
                    board.create('arrow', [A, B], { strokeColor: borderColor, strokeWidth: 2, highlight: false, fixed: true });
                }

                for (let j = 0; j < labels.length; j++) {
                    const xB = x0 + leftColW + j * cellW;
                    const v = row.values[j];
                    if (!v) continue;

                    if (v.type === 'forbidden') {
                        if (v.left) txt(xB - 0.12, rowY + (v.leftPos === 'top' ? (cellH * 0.28) : (v.leftPos === 'bottom' ? (-cellH * 0.28) : 0)), v.left, { size: textSize - 2, anchor: 'right' });
                        if (v.right) txt(xB + 0.12, rowY + (v.rightPos === 'top' ? (cellH * 0.28) : (v.rightPos === 'bottom' ? (-cellH * 0.28) : 0)), v.right, { size: textSize - 2, anchor: 'left' });
                        continue;
                    }

                    const dy = v.pos === 'top' ? (cellH * 0.28) : (v.pos === 'bottom' ? (-cellH * 0.28) : 0);
                    if (j === 0) txt(xB + 0.12, rowY + dy, v.text, { size: textSize - 2, anchor: 'left' });
                    else if (j === labels.length - 1) txt(xB - 0.12, rowY + dy, v.text, { size: textSize - 2, anchor: 'right' });
                    else txt(xB, rowY + dy, v.text, { size: textSize - 2, anchor: 'middle' });
                }
            }
        }

        return { tableW, tableH };
    }

    function computeVariationTableAutoData(fExpr, derivativeFactors, variable, intervalMin, intervalMax, forbiddenValues, showDerivativeFactors, derivativeLabel, functionLabel) {
        const parsedFactors = [];
        for (const e of derivativeFactors) {
            if (!e) continue;
            if (typeof e === 'string') parsedFactors.push({ expr: e, label: e, forbidden: false });
            else if (typeof e === 'object') {
                const exprStr = e.expr || e.expression || '';
                if (!exprStr) continue;
                parsedFactors.push({ expr: exprStr, label: e.label || exprStr, forbidden: bool(e.forbidden, false) });
            }
        }

        const internal = [];
        const factorRoots = [];
        for (let i = 0; i < parsedFactors.length; i++) {
            const roots = findRoots(parsedFactors[i].expr, variable, intervalMin, intervalMax);
            factorRoots.push(roots);
            for (const r of roots) {
                if (r > intervalMin && r < intervalMax && !internal.some(v => Math.abs(v - r) < 1e-8)) internal.push(r);
            }
        }
        for (const fv of forbiddenValues) {
            const x = Number(fv);
            if (!Number.isFinite(x)) continue;
            if (x > intervalMin && x < intervalMax && !internal.some(v => Math.abs(v - x) < 1e-8)) internal.push(x);
        }
        internal.sort((a, b) => a - b);

        const breakpoints = [intervalMin, ...internal, intervalMax];
        const labels = breakpoints.map(v => {
            if (v === -Infinity) return '-\\infty';
            if (v === Infinity) return '+\\infty';
            return formatNumber(v);
        });

        const nIntervals = Math.max(1, breakpoints.length - 1);

        function chooseTestPoint(a, b) {
            if (a === -Infinity && b === Infinity) return 0;
            if (a === -Infinity) return (Number.isFinite(b) ? b - 1 : 0);
            if (b === Infinity) return (Number.isFinite(a) ? a + 1 : 0);
            return (a + b) / 2;
        }

        function mulSigns(s1, s2) {
            if (!s1) return s2;
            if (!s2) return s1;
            if (s1 === '?' || s2 === '?') return '?';
            if (s1 === '-' && s2 === '-') return '+';
            if (s1 === '-' && s2 === '+') return '-';
            if (s1 === '+' && s2 === '-') return '-';
            return '+';
        }

        function factorMarkAtIndex(j) {
            const x0 = breakpoints[j];
            if (!Number.isFinite(x0)) return '';
            if (forbiddenValues.some(v => Math.abs(Number(v) - x0) < 1e-7)) return '||';
            let hasZero = false;
            for (let i = 0; i < parsedFactors.length; i++) {
                const roots = factorRoots[i];
                const isRoot = roots.some(r => Math.abs(r - x0) < 1e-7);
                if (isRoot) {
                    if (parsedFactors[i].forbidden) return '||';
                    hasZero = true;
                }
            }
            return hasZero ? '0' : '';
        }

        const rows = [];
        if (showDerivativeFactors) {
            for (let i = 0; i < parsedFactors.length; i++) {
                const ed = parsedFactors[i];
                const intervalSigns = [];
                const pointMarks = {};
                for (let k = 0; k < nIntervals; k++) {
                    const tp = chooseTestPoint(breakpoints[k], breakpoints[k + 1]);
                    intervalSigns.push(evaluateSign(ed.expr, variable, tp));
                }
                for (let j = 1; j < nIntervals; j++) {
                    const mk = factorMarkAtIndex(j);
                    if (mk) pointMarks[j] = mk;
                }
                rows.push({ type: 'sign', label: ed.label, intervalSigns, pointMarks });
            }
        }

        const fpSigns = [];
        const fpMarks = {};
        for (let k = 0; k < nIntervals; k++) {
            const tp = chooseTestPoint(breakpoints[k], breakpoints[k + 1]);
            let s = '+';
            for (const ed of parsedFactors) {
                s = mulSigns(s, evaluateSign(ed.expr, variable, tp));
            }
            fpSigns.push(s);
        }
        for (let j = 1; j < nIntervals; j++) {
            const mk = factorMarkAtIndex(j);
            if (mk) fpMarks[j] = mk;
        }
        rows.push({ type: 'sign', label: derivativeLabel || `f'(${variable})`, intervalSigns: fpSigns, pointMarks: fpMarks });

        function safeEval(expr, x) {
            try {
                const v = evaluateExpr(expr, variable, x);
                if (!Number.isFinite(v)) return null;
                return v;
            } catch (e) {
                return null;
            }
        }

        function fmtVal(v) {
            if (v === null) return '?';
            if (v === Infinity) return '+\\infty';
            if (v === -Infinity) return '-\\infty';
            if (!Number.isFinite(v)) return '?';
            if (Math.abs(v) > 1e6) return v > 0 ? '+\\infty' : '-\\infty';
            return formatNumber(v);
        }

        const values = Array(labels.length).fill(null);
        const epsBase = 1e-4;
        const big = 100;

        for (let j = 0; j < breakpoints.length; j++) {
            const x0 = breakpoints[j];
            const mk = j > 0 && j < breakpoints.length - 1 ? (fpMarks[j] || '') : '';
            if (mk === '||') {
                const x = x0;
                const eps = epsBase * Math.max(1, Math.abs(x));
                const leftV = safeEval(fExpr, x - eps);
                const rightV = safeEval(fExpr, x + eps);
                values[j] = {
                    type: 'forbidden',
                    left: fmtVal(leftV),
                    right: fmtVal(rightV),
                    leftPos: 'mid',
                    rightPos: 'mid'
                };
                continue;
            }

            if (x0 === -Infinity) {
                const v = safeEval(fExpr, -big);
                if (v === null) values[j] = { type: 'finite', text: '?', pos: 'mid' };
                else values[j] = { type: 'finite', text: (v > 0 ? '+\\infty' : '-\\infty'), pos: 'mid' };
                continue;
            }
            if (x0 === Infinity) {
                const v = safeEval(fExpr, big);
                if (v === null) values[j] = { type: 'finite', text: '?', pos: 'mid' };
                else values[j] = { type: 'finite', text: (v > 0 ? '+\\infty' : '-\\infty'), pos: 'mid' };
                continue;
            }

            const v = safeEval(fExpr, x0);
            values[j] = { type: 'finite', text: fmtVal(v), pos: 'mid' };
        }

        for (let j = 1; j < breakpoints.length - 1; j++) {
            const left = fpSigns[j - 1];
            const right = fpSigns[j];
            if (values[j] && values[j].type === 'finite') {
                if (left === '+' && right === '-') values[j].pos = 'top';
                else if (left === '-' && right === '+') values[j].pos = 'bottom';
            }
        }

        const arrows = [];
        for (let k = 0; k < nIntervals; k++) {
            const s = fpSigns[k];
            if (s === '+') arrows.push('up');
            else if (s === '-') arrows.push('down');
            else arrows.push('');
        }

        rows.push({ type: 'variation', label: functionLabel || `f(${variable})`, arrows, values });

        return { breakpoints, labels, rows };
    }

    async function computeSignTableAutoDataSympy(expressions, variable, intervalMin, intervalMax, finalLabel) {
        const parsed = [];
        for (const e of expressions) {
            if (!e) continue;
            if (typeof e === 'string') {
                parsed.push({ expr: e, label: e, forbidden: false });
                continue;
            }
            if (typeof e === 'object') {
                const exprStr = e.expr || e.expression || '';
                if (!exprStr) continue;
                parsed.push({ expr: exprStr, label: e.label || exprStr, forbidden: bool(e.forbidden, false) });
            }
        }

        const internal = [];
        const exactLabels = [];
        function addInternal(x, label) {
            if (!Number.isFinite(x)) return;
            for (let i = 0; i < internal.length; i++) {
                if (Math.abs(internal[i] - x) < 1e-8) {
                    if (label && !exactLabels.some(p => Math.abs(p.x - internal[i]) < 1e-8)) exactLabels.push({ x: internal[i], label });
                    return;
                }
            }
            internal.push(x);
            if (label) exactLabels.push({ x, label });
        }
        function labelForX(x) {
            for (const p of exactLabels) {
                if (Math.abs(p.x - x) < 1e-7) return p.label;
            }
            return '';
        }

        const exprRoots = [];
        const exprDenoms = [];
        for (let i = 0; i < parsed.length; i++) {
            const denomPairs = await sympyDenomRootsRealLatex(parsed[i].expr, variable);
            const denoms = denomPairs
                .map(r => r.x)
                .filter(x => Number.isFinite(x) && x > intervalMin && x < intervalMax)
                .sort((a, b) => a - b);
            exprDenoms.push(denoms);
            for (const r of denomPairs) {
                if (r.x > intervalMin && r.x < intervalMax) addInternal(r.x, r.label);
            }

            const rootsPairs = await sympyRootsRealLatex(parsed[i].expr, variable);
            const roots = rootsPairs
                .map(r => r.x)
                .filter(x => Number.isFinite(x) && x > intervalMin && x < intervalMax)
                .sort((a, b) => a - b);
            exprRoots.push(roots);
            for (const r of rootsPairs) {
                if (r.x > intervalMin && r.x < intervalMax) addInternal(r.x, r.label);
            }
        }

        internal.sort((a, b) => a - b);

        const breakpoints = [intervalMin, ...internal, intervalMax];
        const labels = breakpoints.map((v) => {
            if (v === -Infinity) return '-\\infty';
            if (v === Infinity) return '+\\infty';
            const lab = labelForX(v);
            return lab || formatNumber(v);
        });

        const nIntervals = Math.max(1, breakpoints.length - 1);

        function chooseTestPoint(a, b) {
            if (a === -Infinity && b === Infinity) return 0;
            if (a === -Infinity) return (Number.isFinite(b) ? b - 1 : 0);
            if (b === Infinity) return (Number.isFinite(a) ? a + 1 : 0);
            return (a + b) / 2;
        }

        function mulSigns(s1, s2) {
            if (!s1) return s2;
            if (!s2) return s1;
            if (s1 === '?' || s2 === '?') return '?';
            if (s1 === '-' && s2 === '-') return '+';
            if (s1 === '-' && s2 === '+') return '-';
            if (s1 === '+' && s2 === '-') return '-';
            return '+';
        }

        const rows = [];
        for (let i = 0; i < parsed.length; i++) {
            const ed = parsed[i];
            const roots = exprRoots[i];
            const denoms = exprDenoms[i];
            const intervalSigns = [];
            const pointMarks = {};

            for (let k = 0; k < nIntervals; k++) {
                const tp = chooseTestPoint(breakpoints[k], breakpoints[k + 1]);
                const s = await sympySignAt(ed.expr, variable, tp);
                intervalSigns.push(s || evaluateSign(ed.expr, variable, tp));
            }

            for (let j = 1; j < nIntervals; j++) {
                const x0 = breakpoints[j];
                if (!Number.isFinite(x0)) continue;
                const isDenom = denoms.some(r => Math.abs(r - x0) < 1e-7);
                if (isDenom) {
                    pointMarks[j] = '||';
                    continue;
                }
                const isRoot = roots.some(r => Math.abs(r - x0) < 1e-7);
                if (isRoot) {
                    pointMarks[j] = ed.forbidden ? '||' : '0';
                }
            }

            rows.push({ label: ed.label, intervalSigns, pointMarks, forbidden: ed.forbidden });
        }

        if (rows.length > 0) {
            const intervalSigns = Array(nIntervals).fill('+');
            const pointMarks = {};
            for (let k = 0; k < nIntervals; k++) {
                let s = '+';
                for (const r of rows) {
                    s = mulSigns(s, r.intervalSigns[k]);
                }
                intervalSigns[k] = s;
            }
            for (let j = 1; j < nIntervals; j++) {
                const hasForbidden = rows.some(r => r.pointMarks && r.pointMarks[j] === '||');
                if (hasForbidden) {
                    pointMarks[j] = '||';
                } else {
                    const hasZero = rows.some(r => r.pointMarks && r.pointMarks[j] === '0');
                    if (hasZero) pointMarks[j] = '0';
                }
            }
            rows.push({ label: finalLabel || `f(${variable})`, intervalSigns, pointMarks });
        }

        return { breakpoints, labels, rows };
    }

    async function presetSignTableAuto(board, spec, variable, expressions, intervalMin, intervalMax) {
        const finalLabel = typeof spec.finalLabel === 'string' ? spec.finalLabel : `f(${variable})`;
        const engine = typeof spec.engine === 'string' ? spec.engine : '';
        let data = null;
        if (engine === 'sympy') {
            try {
                data = await computeSignTableAutoDataSympy(expressions, variable, intervalMin, intervalMax, finalLabel);
            } catch (e) {
                console.warn('[signTable] SymPy sign engine failed, falling back to numeric.', e);
                data = null;
            }
        }
        if (!data) {
            data = computeSignTableAutoData(expressions, variable, intervalMin, intervalMax, finalLabel);
        }
        const breakpoints = data.breakpoints;
        const rows = data.rows;

        const cellW = typeof spec.cellWidth === 'number' ? spec.cellWidth : 1.2;
        const cellH = typeof spec.cellHeight === 'number' ? spec.cellHeight : 0.8;
        const leftColW = typeof spec.leftColumnWidth === 'number' ? spec.leftColumnWidth : 1.8;
        const headerH = typeof spec.headerHeight === 'number' ? spec.headerHeight : 0.9;

        const borderColor = typeof spec.borderColor === 'string' ? spec.borderColor : '#000000';
        const borderWidth = typeof spec.borderWidth === 'number' ? spec.borderWidth : 2;
        const textSize = typeof spec.textSize === 'number' ? spec.textSize : 16;

        const nIntervals = Math.max(1, breakpoints.length - 1);
        const numRows = rows.length;

        const tableW = leftColW + nIntervals * cellW;
        const tableH = headerH + numRows * cellH;

        const x0 = 0;
        const y0 = 0;

        function line(x1, y1, x2, y2, w) {
            const A = board.create('point', [x1, y1], { visible: false, fixed: true });
            const B = board.create('point', [x2, y2], { visible: false, fixed: true });
            board.create('segment', [A, B], { strokeColor: borderColor, strokeWidth: w || borderWidth, highlight: false, fixed: true });
        }

        function txt(x, y, content, opts) {
            const size = (opts && opts.size) || textSize;
            const anchor = (opts && opts.anchor) || 'middle';
            board.create('text', [x, y, content], {
                fontSize: size,
                fixed: true,
                highlight: false,
                anchorX: anchor,
                anchorY: 'middle',
                strokeColor: '#000000'
            });
        }

        function drawPointMark(x, y, mark) {
            if (!mark) return;
            if (mark === '0') {
                txt(x, y, '0', { size: textSize });
                return;
            }
            if (mark === '||') {
                const dx = Math.min(0.08, cellW * 0.08);
                line(x - dx, y - cellH * 0.3, x - dx, y + cellH * 0.3, 2);
                line(x + dx, y - cellH * 0.3, x + dx, y + cellH * 0.3, 2);
            }
        }

        line(x0, y0, x0 + tableW, y0, borderWidth);
        line(x0, y0, x0, y0 - tableH, borderWidth);
        line(x0 + tableW, y0, x0 + tableW, y0 - tableH, borderWidth);
        line(x0, y0 - tableH, x0 + tableW, y0 - tableH, borderWidth);

        line(x0 + leftColW, y0, x0 + leftColW, y0 - tableH, borderWidth);
        line(x0, y0 - headerH, x0 + tableW, y0 - headerH, borderWidth);

        for (let i = 0; i <= nIntervals; i++) {
            const lx = x0 + leftColW + i * cellW;
            line(lx, y0, lx, y0 - tableH, i === 0 || i === nIntervals ? borderWidth : 1);
        }

        for (let r = 0; r < numRows; r++) {
            const ly = y0 - headerH - (r + 1) * cellH;
            line(x0, ly, x0 + tableW, ly, r === numRows - 1 ? borderWidth : 1);
        }

        txt(x0 + leftColW / 2, y0 - headerH / 2, variable, { size: textSize + 2 });

        const labels = data.labels;
        for (let i = 0; i < labels.length; i++) {
            const xB = x0 + leftColW + i * cellW;
            const lab = labels[i];
            if (i === 0) {
                txt(xB + 0.12, y0 - headerH / 2, lab, { size: textSize, anchor: 'left' });
            } else if (i === labels.length - 1) {
                txt(xB - 0.12, y0 - headerH / 2, lab, { size: textSize, anchor: 'right' });
            } else {
                txt(xB, y0 - headerH / 2, lab, { size: textSize, anchor: 'middle' });
            }
        }

        for (let r = 0; r < rows.length; r++) {
            const row = rows[r];
            const rowY = y0 - headerH - (r + 0.5) * cellH;
            txt(x0 + leftColW / 2, rowY, row.label || '', { size: textSize });

            const intervalSigns = Array.isArray(row.intervalSigns) ? row.intervalSigns : [];
            for (let i = 0; i < nIntervals; i++) {
                const cx = x0 + leftColW + (i + 0.5) * cellW;
                const sign = intervalSigns[i] || '';
                txt(cx, rowY, sign, { size: textSize });
            }

            const pointMarks = row.pointMarks || {};
            for (let i = 1; i < nIntervals; i++) {
                const xB = x0 + leftColW + i * cellW;
                const mk = pointMarks[i] || '';
                drawPointMark(xB, rowY, mk);
            }
        }

        return { tableW, tableH };
    }

    function computeSignTableAutoData(expressions, variable, intervalMin, intervalMax, finalLabel) {
        const parsed = [];
        for (const e of expressions) {
            if (!e) continue;
            if (typeof e === 'string') {
                parsed.push({ expr: e, label: e, forbidden: false });
                continue;
            }
            if (typeof e === 'object') {
                const exprStr = e.expr || e.expression || '';
                if (!exprStr) continue;
                parsed.push({ expr: exprStr, label: e.label || exprStr, forbidden: bool(e.forbidden, false) });
            }
        }

        const internal = [];
        const exprRoots = [];
        for (let i = 0; i < parsed.length; i++) {
            const roots = findRoots(parsed[i].expr, variable).filter(x => x > intervalMin && x < intervalMax);
            exprRoots.push(roots);
            for (const r of roots) {
                if (!internal.some(v => Math.abs(v - r) < 1e-8)) internal.push(r);
            }
        }
        internal.sort((a, b) => a - b);

        const breakpoints = [intervalMin, ...internal, intervalMax];
        const labels = breakpoints.map((v) => {
            if (v === -Infinity) return '-\\infty';
            if (v === Infinity) return '+\\infty';
            return formatNumber(v);
        });

        const nIntervals = Math.max(1, breakpoints.length - 1);

        function chooseTestPoint(a, b) {
            if (a === -Infinity && b === Infinity) return 0;
            if (a === -Infinity) return (Number.isFinite(b) ? b - 1 : 0);
            if (b === Infinity) return (Number.isFinite(a) ? a + 1 : 0);
            return (a + b) / 2;
        }

        function mulSigns(s1, s2) {
            if (!s1) return s2;
            if (!s2) return s1;
            if (s1 === '?' || s2 === '?') return '?';
            if (s1 === '-' && s2 === '-') return '+';
            if (s1 === '-' && s2 === '+') return '-';
            if (s1 === '+' && s2 === '-') return '-';
            return '+';
        }

        const rows = [];
        for (let i = 0; i < parsed.length; i++) {
            const ed = parsed[i];
            const roots = exprRoots[i];
            const intervalSigns = [];
            const pointMarks = {};

            for (let k = 0; k < nIntervals; k++) {
                const tp = chooseTestPoint(breakpoints[k], breakpoints[k + 1]);
                intervalSigns.push(evaluateSign(ed.expr, variable, tp));
            }

            for (let j = 1; j < nIntervals; j++) {
                const x0 = breakpoints[j];
                if (!Number.isFinite(x0)) continue;
                const isRoot = roots.some(r => Math.abs(r - x0) < 1e-7);
                if (isRoot) {
                    pointMarks[j] = ed.forbidden ? '||' : '0';
                }
            }

            rows.push({ label: ed.label, intervalSigns, pointMarks, forbidden: ed.forbidden });
        }

        if (rows.length > 0) {
            const intervalSigns = Array(nIntervals).fill('+');
            const pointMarks = {};
            for (let k = 0; k < nIntervals; k++) {
                let s = '+';
                for (const r of rows) {
                    s = mulSigns(s, r.intervalSigns[k]);
                }
                intervalSigns[k] = s;
            }
            for (let j = 1; j < nIntervals; j++) {
                const hasForbidden = rows.some(r => r.pointMarks && r.pointMarks[j] === '||');
                if (hasForbidden) {
                    pointMarks[j] = '||';
                } else {
                    const hasZero = rows.some(r => r.pointMarks && r.pointMarks[j] === '0');
                    if (hasZero) pointMarks[j] = '0';
                }
            }
            rows.push({ label: finalLabel || `f(${variable})`, intervalSigns, pointMarks });
        }

        return { breakpoints, labels, rows };
    }

    function computeSignTable(expressions, variable, intervalMin, intervalMax) {
        const roots = [];
        const exprData = [];

        for (let i = 0; i < expressions.length; i++) {
            const expr = expressions[i];
            let exprStr = '';
            let label = '';
            let forbidden = false;

            if (typeof expr === 'string') {
                exprStr = expr;
                label = expr;
            } else if (typeof expr === 'object') {
                exprStr = expr.expr || expr.expression || '';
                label = expr.label || exprStr;
                forbidden = bool(expr.forbidden, false);
            }

            if (!exprStr) continue;

            const exprRoots = findRoots(exprStr, variable);
            const validRoots = exprRoots.filter(r => r > intervalMin && r < intervalMax);

            exprData.push({
                expr: exprStr,
                label: label,
                roots: validRoots,
                forbidden: forbidden,
                index: i
            });

            for (const r of validRoots) {
                if (!roots.some(x => Math.abs(x - r) < 1e-9)) {
                    roots.push(r);
                }
            }
        }

        roots.sort((a, b) => a - b);

        const intervals = [];
        const numIntervals = roots.length + 1;

        intervals.push(intervalMin === -Infinity ? '-\\infty' : String(intervalMin));
        for (const r of roots) {
            intervals.push(formatNumber(r));
        }
        intervals.push(intervalMax === Infinity ? '+\\infty' : String(intervalMax));

        const rows = [];
        for (const ed of exprData) {
            const cells = [];
            for (let i = 0; i < numIntervals; i++) {
                let testPoint;
                if (i === 0) {
                    testPoint = roots.length > 0 ? roots[0] - 1 : 0;
                    if (intervalMin !== -Infinity && testPoint < intervalMin) {
                        testPoint = intervalMin + 0.1;
                    }
                } else {
                    testPoint = roots[i - 1] + 0.00001;
                }

                const sign = evaluateSign(ed.expr, variable, testPoint);
                cells.push(sign);

                if (i < roots.length) {
                    const isRootOfThisExpr = ed.roots.some(r => Math.abs(r - roots[i]) < 1e-9);
                    if (isRootOfThisExpr) {
                        cells.push(ed.forbidden ? '||' : '0');
                    } else {
                        cells.push('');
                    }
                }
            }
            rows.push({ label: ed.label, cells: cells });
        }

        if (exprData.length > 1) {
            const conclusionCells = [];
            for (let i = 0; i < numIntervals; i++) {
                let sign = '+';
                for (const ed of exprData) {
                    const cellIdx = i * 2;
                    const exprSign = rows[ed.index].cells[cellIdx];
                    if (exprSign === '-') {
                        sign = sign === '+' ? '-' : '+';
                    }
                }
                conclusionCells.push(sign);

                if (i < roots.length) {
                    const hasForbidden = exprData.some(ed => {
                        return ed.forbidden && ed.roots.some(r => Math.abs(r - roots[i]) < 1e-9);
                    });
                    conclusionCells.push(hasForbidden ? '||' : '0');
                }
            }
            rows.push({ label: 'f(' + variable + ')', cells: conclusionCells });
        }

        return { intervals, rows };
    }

    function findRoots(exprStr, variable) {
        const roots = [];
        try {
            const cleaned = exprStr.replace(/\s/g, '');
            const testPoints = [-10, -5, -2, -1, -0.5, 0, 0.5, 1, 2, 5, 10];
            const signs = [];

            for (const pt of testPoints) {
                try {
                    const val = evaluateExpr(cleaned, variable, pt);
                    if (Math.abs(val) < 1e-10) {
                        if (!roots.some(r => Math.abs(r - pt) < 1e-9)) {
                            roots.push(pt);
                        }
                    }
                    signs.push({ x: pt, sign: val > 0 ? 1 : -1 });
                } catch (e) {
                    continue;
                }
            }

            for (let i = 0; i < signs.length - 1; i++) {
                if (signs[i].sign !== signs[i + 1].sign) {
                    const root = bisectionMethod(cleaned, variable, signs[i].x, signs[i + 1].x);
                    if (root !== null && !roots.some(r => Math.abs(r - root) < 1e-9)) {
                        roots.push(root);
                    }
                }
            }
        } catch (e) {
            console.warn('[signTable] Failed to find roots:', e);
        }
        return roots.sort((a, b) => a - b);
    }

    function bisectionMethod(exprStr, variable, a, b, maxIter = 50) {
        try {
            for (let i = 0; i < maxIter; i++) {
                const mid = (a + b) / 2;
                const fMid = evaluateExpr(exprStr, variable, mid);

                if (Math.abs(fMid) < 1e-10 || Math.abs(b - a) < 1e-10) {
                    return mid;
                }

                const fA = evaluateExpr(exprStr, variable, a);
                if (fA * fMid < 0) {
                    b = mid;
                } else {
                    a = mid;
                }
            }
            return (a + b) / 2;
        } catch (e) {
            return null;
        }
    }

    function evaluateExpr(exprStr, variable, value) {
        let expr = exprStr.replace(/\^/g, '**');
        expr = expr.replace(/(\d)([a-zA-Z(])/g, '$1*$2');
        expr = expr.replace(/([)])(\d|[a-zA-Z])/g, '$1*$2');
        expr = expr.replace(new RegExp(`\\b${variable}\\b`, 'g'), `(${value})`);
        expr = expr.replace(/sqrt\(([^)]+)\)/g, 'Math.sqrt($1)');
        expr = expr.replace(/abs\(([^)]+)\)/g, 'Math.abs($1)');
        expr = expr.replace(/exp\(([^)]+)\)/g, 'Math.exp($1)');
        expr = expr.replace(/ln\(([^)]+)\)/g, 'Math.log($1)');
        expr = expr.replace(/log\(([^)]+)\)/g, 'Math.log10($1)');
        return eval(expr);
    }

    function evaluateSign(exprStr, variable, value) {
        try {
            const result = evaluateExpr(exprStr, variable, value);
            if (Math.abs(result) < 1e-10) return '0';
            return result > 0 ? '+' : '-';
        } catch (e) {
            return '?';
        }
    }

    function formatNumber(num) {
        if (Math.abs(num) < 1e-10) return '0';
        if (Number.isInteger(num)) return String(num);
        const rounded = Math.round(num * 1000) / 1000;
        if (Math.abs(rounded - num) < 1e-6) return String(rounded);
        return num.toFixed(3);
    }

    async function applyPreset(board, spec, opts) {
        const preset = spec.preset || 'axes';

        if (bool(spec.axes, true)) {
            presetAxes(board, spec);
        }

        if (bool(spec.grid, false)) {
            board.create('grid', [], { strokeColor: '#e2e8f0' });
        }

        if (preset === 'axes') return;
        if (preset === 'parabola') return presetParabola(board, spec);
        if (preset === 'function') return presetFunction(board, spec);
        if (preset === 'line') return presetLine(board, spec);
        if (preset === 'triangle') return presetTriangle(board, spec);
        if (preset === 'circle') return presetCircle(board, spec);
        if (preset === 'lawnMower') return presetLawnMower(board, spec);
        if (preset === 'photoAnnotate') return presetPhotoAnnotate(board, spec);
        if (preset === 'cometTebbutt') return presetCometTebbutt(board, spec);
        if (preset === 'windVectors') return presetWindVectors(board, spec);
        if (preset === 'inequalityRegion') return presetInequalityRegion(board, spec);
        if (preset === 'signTable') return await presetSignTable(board, spec);
        if (preset === 'scene') return presetScene(board, spec);
    }

    async function waitForNonZeroSize(el) {
        for (let i = 0; i < 120; i++) {
            const r = el.getBoundingClientRect();
            if (r.width > 2 && r.height > 2) return;
            await new Promise(res => setTimeout(res, 20));
        }
    }

    function blockRightClickPan(el) {
        if (!el || el.getAttribute('data-jxg-rc-block') === '1') return;
        el.setAttribute('data-jxg-rc-block', '1');
        el.oncontextmenu = (e) => { try { e.preventDefault(); } catch (_) { } return false; };
        const handler = (e) => {
            if (e && e.button === 2) {
                try { e.preventDefault(); } catch (_) { }
                try { e.stopImmediatePropagation(); } catch (_) { try { e.stopPropagation(); } catch (_) { } }
            }
        };
        el.addEventListener('pointerdown', handler, true);
        el.addEventListener('mousedown', handler, true);
    }

    async function renderOne(el, opts) {
        const spec = decodeSpec(el.getAttribute('data-jxg')) || {};
        let mode = spec.mode || (opts && opts.mode) || 'interactive';
        if (spec.preset === 'windVectors' && typeof spec.mode === 'undefined') {
            mode = 'static';
        }
        const bb = getBBox(spec);

        await ensureJsxGraph();

        state.counter += 1;
        const id = el.id || `jxgbox_${state.counter}`;
        el.id = id;

        el.style.width = typeof spec.width === 'number' ? `${spec.width}px` : (spec.width || '100%');
        el.style.height = typeof spec.height === 'number' ? `${spec.height}px` : (spec.height || '260px');
        el.style.maxWidth = el.style.maxWidth || '100%';
        el.style.margin = el.style.margin || '10px auto';
        el.style.border = el.style.border || '1px solid #e2e8f0';
        el.style.borderRadius = el.style.borderRadius || '8px';
        el.style.background = el.style.background || '#ffffff';

        if (mode !== 'interactive') {
            el.style.pointerEvents = 'none';
        }

        if (spec.preset === 'windVectors') {
            blockRightClickPan(el);
        }

        await waitForNonZeroSize(el);

        const board = window.JXG.JSXGraph.initBoard(id, {
            boundingbox: bb,
            keepaspectratio: bool(spec.keepAspectRatio, true),
            showCopyright: false,
            showNavigation: false,
            axis: false,
            pan: { enabled: mode === 'interactive' && spec.preset !== 'windVectors' && bool(spec.pan, false) },
            zoom: {
                enabled: mode === 'interactive' && spec.preset !== 'windVectors' && bool(spec.zoom, false),
                wheel: mode === 'interactive' && spec.preset !== 'windVectors' && bool(spec.zoomWheel, false),
                needshift: false
            },
            renderer: 'svg'
        });

        await applyPreset(board, spec, { mode });
        return board;
    }

    async function renderAll(root, opts) {
        const r = root || document;
        const els = Array.from(r.querySelectorAll('.jxg-diagram[data-jxg]'));
        if (!els.length) return;

        try {
            await ensureJsxGraph();
        } catch (e) {
            console.warn('[Diagrams] JSXGraph not available. Add files at', LOCAL_JS, 'and', LOCAL_CSS, 'or allow online loading.');
            return;
        }

        for (const el of els) {
            if (el.getAttribute('data-jxg-rendered') === '1') continue;
            el.setAttribute('data-jxg-rendered', '1');
            try {
                await renderOne(el, opts);
            } catch (e) {
                console.warn('[Diagrams] Failed to render diagram', e);
            }
        }
    }

    window.Diagrams = {
        renderAll
    };
})();
