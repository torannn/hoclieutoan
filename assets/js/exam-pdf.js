/* exam-pdf.js
 * Xuất đề ra PDF với template đẹp như LaTeX, nhiều tuỳ chọn:
 *  - Layout: 1 cột / 2 cột / có cột ghi chú bên phải (Quick Note)
 *  - Kiểu A/B/C/D: plain, tròn tô đen, tròn viền, vuông viền
 *  - Khoảng cách: compact / normal / working (chèn dòng kẻ trống)
 *  - Khung tiêu đề: simple / box (viền kép)
 *  - Co tự động vừa N trang (mặc định 2)
 *  - Xem trước trên màn hình + in
 * Tận dụng DOM đã render trong #exam-questions-container (giữ MathJax + JSXGraph).
 */
(function () {
  'use strict';

  const PRINT_ROOT_ID = 'exam-pdf-print-root';
  const STYLE_ID      = 'exam-pdf-print-style';
  const TOOLBAR_ID    = 'exam-pdf-toolbar';
  const MODAL_ID      = 'exam-pdf-modal';
  const PREFS_KEY     = 'examPdfPrefsV1';

  const A4 = { w: 210, h: 297 };
  const A5 = { w: 148, h: 210 };
  const MM = 3.7795275591;

  const DEFAULTS = {
    paper: 'A4',
    margin: 12,
    layout: 'single',          // 'single' | 'two-col' | 'side-note'
    answerStyle: 'plain',      // 'plain' | 'circle-filled' | 'circle-outline' | 'square'
    spacing: 'normal',         // 'compact' | 'normal' | 'working'
    workingLines: 2,
    titleStyle: 'box',         // 'simple' | 'box'
    showInfoFields: true,
    showSchool: true,
    schoolName: 'Học Liệu Toán',
    schoolSub: 'BÀI KIỂM TRA',
    fitPages: 2,               // 0 = tắt
    sideNoteTitle: 'QUICK NOTE'
  };

  function loadPrefs() {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (!raw) return Object.assign({}, DEFAULTS);
      const parsed = JSON.parse(raw);
      return Object.assign({}, DEFAULTS, parsed);
    } catch (_) { return Object.assign({}, DEFAULTS); }
  }
  function savePrefs(p) {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch (_) {}
  }

  // ===== Modal tuỳ chọn =====
  function showOptionsModal() {
    return new Promise((resolve) => {
      const old = document.getElementById(MODAL_ID); if (old) old.remove();
      const p = loadPrefs();
      const wrap = document.createElement('div');
      wrap.id = MODAL_ID;
      wrap.innerHTML = `
        <div class="pdfm-backdrop"></div>
        <div class="pdfm-card" role="dialog" aria-modal="true">
          <div class="pdfm-head">
            <div>
              <div class="pdfm-title">Tuỳ chỉnh xuất PDF</div>
              <div class="pdfm-sub">Chọn template trước khi xuất ra file in.</div>
            </div>
            <button class="pdfm-x" aria-label="Đóng">×</button>
          </div>
          <div class="pdfm-body">
            <div class="pdfm-grid">
              <fieldset>
                <legend>Bố cục</legend>
                <label><input type="radio" name="layout" value="single" ${p.layout==='single'?'checked':''}/> 1 cột (truyền thống)</label>
                <label><input type="radio" name="layout" value="two-col" ${p.layout==='two-col'?'checked':''}/> 2 cột tiết kiệm giấy</label>
                <label><input type="radio" name="layout" value="side-note" ${p.layout==='side-note'?'checked':''}/> Có cột ghi chú bên phải (Quick Note)</label>
              </fieldset>
              <fieldset>
                <legend>Kiểu đáp án A · B · C · D</legend>
                <label><input type="radio" name="answerStyle" value="plain" ${p.answerStyle==='plain'?'checked':''}/> Chữ thường: <b>A.</b></label>
                <label><input type="radio" name="answerStyle" value="circle-filled" ${p.answerStyle==='circle-filled'?'checked':''}/> Tròn tô đen</label>
                <label><input type="radio" name="answerStyle" value="circle-outline" ${p.answerStyle==='circle-outline'?'checked':''}/> Tròn viền</label>
                <label><input type="radio" name="answerStyle" value="square" ${p.answerStyle==='square'?'checked':''}/> Vuông viền</label>
              </fieldset>
              <fieldset>
                <legend>Khoảng cách</legend>
                <label><input type="radio" name="spacing" value="compact" ${p.spacing==='compact'?'checked':''}/> Gọn (vừa nhiều câu)</label>
                <label><input type="radio" name="spacing" value="normal" ${p.spacing==='normal'?'checked':''}/> Chuẩn</label>
                <label><input type="radio" name="spacing" value="working" ${p.spacing==='working'?'checked':''}/> Chừa dòng kẻ trống cho học sinh
                  <input type="number" name="workingLines" min="1" max="6" value="${p.workingLines}" style="width:48px;margin-left:4px"/> dòng/câu
                </label>
              </fieldset>
              <fieldset>
                <legend>Khung tiêu đề</legend>
                <label><input type="radio" name="titleStyle" value="simple" ${p.titleStyle==='simple'?'checked':''}/> Đơn giản, có gạch chân</label>
                <label><input type="radio" name="titleStyle" value="box" ${p.titleStyle==='box'?'checked':''}/> Khung viền kép</label>
                <label><span class="pdfm-lbl">Tên trường / nhóm</span><input type="text" name="schoolName" value="${esc(p.schoolName)}" /></label>
                <label><span class="pdfm-lbl">Phụ đề trên</span><input type="text" name="schoolSub" value="${esc(p.schoolSub)}" /></label>
                <label><input type="checkbox" name="showSchool" ${p.showSchool?'checked':''}/> Hiển thị header trường</label>
                <label><input type="checkbox" name="showInfoFields" ${p.showInfoFields?'checked':''}/> Ô Họ tên / Lớp / SBD</label>
              </fieldset>
              <fieldset>
                <legend>Trang giấy</legend>
                <label><span class="pdfm-lbl">Khổ</span>
                  <select name="paper">
                    <option value="A4" ${p.paper==='A4'?'selected':''}>A4 (210 × 297 mm)</option>
                    <option value="A5" ${p.paper==='A5'?'selected':''}>A5 (148 × 210 mm)</option>
                  </select>
                </label>
                <label><span class="pdfm-lbl">Lề (mm)</span><input type="number" name="margin" min="6" max="25" value="${p.margin}"/></label>
                <label><span class="pdfm-lbl">Co vừa số trang</span>
                  <select name="fitPages">
                    <option value="0" ${p.fitPages==0?'selected':''}>Không co (chảy tự nhiên)</option>
                    <option value="1" ${p.fitPages==1?'selected':''}>1 trang</option>
                    <option value="2" ${p.fitPages==2?'selected':''}>2 trang (mặc định)</option>
                    <option value="3" ${p.fitPages==3?'selected':''}>3 trang</option>
                    <option value="4" ${p.fitPages==4?'selected':''}>4 trang</option>
                  </select>
                </label>
                <label><span class="pdfm-lbl">Tiêu đề cột Note</span><input type="text" name="sideNoteTitle" value="${esc(p.sideNoteTitle)}" /></label>
              </fieldset>
            </div>
          </div>
          <div class="pdfm-foot">
            <button class="pdfm-btn pdfm-secondary" data-act="reset">Khôi phục mặc định</button>
            <div style="flex:1"></div>
            <button class="pdfm-btn pdfm-secondary" data-act="cancel">Huỷ</button>
            <button class="pdfm-btn pdfm-primary" data-act="ok">Tạo PDF</button>
          </div>
        </div>
      `;
      document.body.appendChild(wrap);

      const close = (val) => { wrap.remove(); resolve(val); };
      wrap.querySelector('.pdfm-backdrop').addEventListener('click', () => close(null));
      wrap.querySelector('.pdfm-x').addEventListener('click', () => close(null));
      wrap.querySelector('[data-act="cancel"]').addEventListener('click', () => close(null));
      wrap.querySelector('[data-act="reset"]').addEventListener('click', () => {
        savePrefs(DEFAULTS);
        wrap.remove();
        showOptionsModal().then(close);
      });
      wrap.querySelector('[data-act="ok"]').addEventListener('click', () => {
        const f = wrap.querySelector('.pdfm-card');
        const get = (n) => f.querySelector(`[name="${n}"]`);
        const getRadio = (n) => f.querySelector(`input[name="${n}"]:checked`);
        const out = {
          layout: getRadio('layout')?.value || 'single',
          answerStyle: getRadio('answerStyle')?.value || 'plain',
          spacing: getRadio('spacing')?.value || 'normal',
          workingLines: clampInt(get('workingLines')?.value, 1, 6, 2),
          titleStyle: getRadio('titleStyle')?.value || 'box',
          schoolName: get('schoolName')?.value?.trim() || DEFAULTS.schoolName,
          schoolSub: get('schoolSub')?.value?.trim() || DEFAULTS.schoolSub,
          showSchool: !!get('showSchool')?.checked,
          showInfoFields: !!get('showInfoFields')?.checked,
          paper: get('paper')?.value || 'A4',
          margin: clampInt(get('margin')?.value, 6, 25, 12),
          fitPages: clampInt(get('fitPages')?.value, 0, 4, 2),
          sideNoteTitle: get('sideNoteTitle')?.value?.trim() || DEFAULTS.sideNoteTitle
        };
        savePrefs(out);
        close(out);
      });
    });
  }

  function clampInt(v, mn, mx, def) {
    const n = parseInt(v, 10);
    if (isNaN(n)) return def;
    return Math.max(mn, Math.min(mx, n));
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // ===== CSS động theo tuỳ chọn =====
  function buildStyle(opts) {
    const paper = opts.paper === 'A5' ? A5 : A4;
    const M = opts.margin;
    const contentW = paper.w - M * 2;

    // Bubble cho A/B/C/D theo style
    let bubbleCSS = '';
    if (opts.answerStyle === 'circle-filled') {
      bubbleCSS = `.opt-key{display:inline-block;min-width:1.5em;height:1.5em;line-height:1.5em;text-align:center;border-radius:50%;background:#111;color:#fff;font-weight:700;font-size:.82em;vertical-align:middle;margin-right:.25em;padding:0 .25em;}`;
    } else if (opts.answerStyle === 'circle-outline') {
      bubbleCSS = `.opt-key{display:inline-block;min-width:1.5em;height:1.5em;line-height:1.4em;text-align:center;border-radius:50%;border:1.1pt solid #111;color:#111;font-weight:700;font-size:.82em;vertical-align:middle;margin-right:.25em;padding:0 .25em;box-sizing:border-box;}`;
    } else if (opts.answerStyle === 'square') {
      bubbleCSS = `.opt-key{display:inline-block;min-width:1.5em;height:1.5em;line-height:1.4em;text-align:center;border:1.1pt solid #111;color:#111;font-weight:700;font-size:.82em;vertical-align:middle;margin-right:.25em;padding:0 .25em;box-sizing:border-box;}`;
    } else {
      bubbleCSS = `.opt-key{font-weight:700;color:#111;margin-right:.15em;}`;
    }

    // Layout
    let layoutCSS = '';
    if (opts.layout === 'two-col') {
      layoutCSS = `
        #${PRINT_ROOT_ID} .pdf-content{column-count:2;column-gap:8mm;column-rule:0.5pt dashed #cbd5e1;}
        #${PRINT_ROOT_ID} h2.pdf-sec{column-span:all;-webkit-column-span:all;}
        #${PRINT_ROOT_ID} .pdf-q{break-inside:avoid;page-break-inside:avoid;}`;
    } else if (opts.layout === 'side-note') {
      layoutCSS = `
        #${PRINT_ROOT_ID} .pdf-main-wrap{display:grid;grid-template-columns:1fr 38mm;gap:5mm;}
        #${PRINT_ROOT_ID} .pdf-side{border-left:1.5pt solid #111;padding-left:3mm;position:relative;}
        #${PRINT_ROOT_ID} .pdf-side .side-title{background:#111;color:#fff;text-align:center;font-weight:800;letter-spacing:1pt;font-size:11pt;padding:5pt 0;margin-bottom:6pt;}
        #${PRINT_ROOT_ID} .pdf-side .side-line{border-bottom:.6pt solid #94a3b8;height:1.55em;}`;
    }

    // Khung tiêu đề
    let titleCSS = '';
    if (opts.titleStyle === 'box') {
      titleCSS = `
        #${PRINT_ROOT_ID} .pdf-titlebox{border:1.5pt solid #111;padding:6pt 12pt;text-align:center;margin:6pt auto 8pt;display:inline-block;position:relative;}
        #${PRINT_ROOT_ID} .pdf-titlebox::before,#${PRINT_ROOT_ID} .pdf-titlebox::after{content:"";position:absolute;left:2pt;right:2pt;height:0;border-top:.5pt solid #111;}
        #${PRINT_ROOT_ID} .pdf-titlebox::before{top:2pt;}
        #${PRINT_ROOT_ID} .pdf-titlebox::after{bottom:2pt;}
        #${PRINT_ROOT_ID} .pdf-titlebox h1{font-size:14pt;margin:2pt 0;text-transform:uppercase;font-weight:800;letter-spacing:.5pt;}
        #${PRINT_ROOT_ID} .pdf-titlebox .pdf-time{font-style:italic;font-size:10.5pt;margin-top:1pt;}
        #${PRINT_ROOT_ID} .pdf-titlewrap{text-align:center;}`;
    } else {
      titleCSS = `
        #${PRINT_ROOT_ID} .pdf-titlewrap{text-align:center;border-bottom:1.2pt solid #111;padding-bottom:5pt;margin-bottom:6pt;}
        #${PRINT_ROOT_ID} .pdf-titlewrap h1{font-size:14pt;margin:2pt 0;text-transform:uppercase;font-weight:800;letter-spacing:.5pt;}
        #${PRINT_ROOT_ID} .pdf-titlewrap .pdf-time{font-style:italic;font-size:10.5pt;}`;
    }

    // Spacing
    const qSpacing = opts.spacing === 'compact' ? '2pt' : (opts.spacing === 'working' ? '4pt' : '3pt');
    const stemMargin = opts.spacing === 'compact' ? '1pt' : '1.5pt';

    return `
@page{size:${opts.paper}; margin:${M}mm ${M}mm;}
html.exam-pdf-printing,html.exam-pdf-printing body{background:#fff !important;}
#${PRINT_ROOT_ID}{position:fixed;left:-10000px;top:0;width:${contentW}mm;background:#fff;color:#000;font-family:'TeX Gyre Pagella','Latin Modern Roman','Palatino Linotype','Book Antiqua',Palatino,'Lora',Georgia,serif;font-size:11pt;line-height:1.34;z-index:-1;}
#${PRINT_ROOT_ID} *{box-sizing:border-box;}
#${PRINT_ROOT_ID} .pdf-school{display:flex;justify-content:space-between;align-items:flex-start;font-size:10.5pt;margin-bottom:4pt;}
#${PRINT_ROOT_ID} .pdf-school .left{text-align:center;flex:1;}
#${PRINT_ROOT_ID} .pdf-school .right{text-align:center;flex:1;font-style:italic;}
#${PRINT_ROOT_ID} .pdf-school .left .name{font-weight:800;text-transform:uppercase;}
#${PRINT_ROOT_ID} .pdf-school .left .sub{font-size:10pt;}
#${PRINT_ROOT_ID} .pdf-school hr{border:0;border-top:.6pt solid #111;width:60%;margin:2pt auto;}
${titleCSS}
#${PRINT_ROOT_ID} .pdf-info{display:flex;gap:8mm;margin:4pt 0 6pt;font-size:10pt;}
#${PRINT_ROOT_ID} .pdf-info > div{flex:1;border-bottom:.8pt dotted #555;padding:1pt 0;}
#${PRINT_ROOT_ID} .pdf-info > div b{font-weight:700;}
#${PRINT_ROOT_ID} h2.pdf-sec{font-size:11.5pt;font-weight:800;margin:7pt 0 3pt;text-transform:uppercase;letter-spacing:.3pt;border-bottom:.6pt solid #111;padding-bottom:1pt;}
#${PRINT_ROOT_ID} .pdf-q{margin:0 0 ${qSpacing};page-break-inside:avoid;break-inside:avoid;}
#${PRINT_ROOT_ID} .pdf-num{font-weight:700;margin-right:4pt;}
#${PRINT_ROOT_ID} .pdf-stem{display:inline;}
#${PRINT_ROOT_ID} .pdf-stem-wrap{margin-bottom:${stemMargin};}
#${PRINT_ROOT_ID} .pdf-opts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));column-gap:6pt;row-gap:1.5pt;margin:1.5pt 0 1.5pt 4mm;}
#${PRINT_ROOT_ID} .pdf-opts.cols-2{grid-template-columns:repeat(2,minmax(0,1fr));}
#${PRINT_ROOT_ID} .pdf-opts.cols-3{grid-template-columns:repeat(3,minmax(0,1fr));}
#${PRINT_ROOT_ID} .pdf-opt{break-inside:avoid;}
${bubbleCSS}
#${PRINT_ROOT_ID} .pdf-tf{list-style:none;padding:0;margin:1pt 0 1pt 4mm;}
#${PRINT_ROOT_ID} .pdf-tf li{margin:.5pt 0;}
#${PRINT_ROOT_ID} .pdf-tf li .opt-key{margin-right:.4em;}
#${PRINT_ROOT_ID} .pdf-sa{margin:1pt 0 1pt 4mm;display:flex;gap:6pt;align-items:flex-end;}
#${PRINT_ROOT_ID} .pdf-sa .lbl{font-style:italic;}
#${PRINT_ROOT_ID} .pdf-sa .pdf-dots{flex:1;border-bottom:.7pt dotted #555;height:1.1em;}
#${PRINT_ROOT_ID} .pdf-essay .pdf-line{border-bottom:.7pt dotted #888;height:1.55em;margin:1pt 0;}
#${PRINT_ROOT_ID} .pdf-work{margin:2pt 0 4pt 4mm;}
#${PRINT_ROOT_ID} .pdf-work .work-line{border-bottom:.6pt dotted #94a3b8;height:1.55em;margin:1pt 0;}
#${PRINT_ROOT_ID} mjx-container{margin:0 !important;}
#${PRINT_ROOT_ID} mjx-container[display="true"]{margin:2pt 0 !important;display:block !important;text-align:center;}
#${PRINT_ROOT_ID} img,#${PRINT_ROOT_ID} svg{max-width:100%;}
#${PRINT_ROOT_ID} .jxgbox{page-break-inside:avoid;break-inside:avoid;margin:auto;}
${layoutCSS}

/* Toolbar */
#${TOOLBAR_ID}{position:fixed;right:16px;bottom:16px;z-index:99999;background:#0f172a;color:#e2e8f0;padding:10px 14px;border-radius:14px;box-shadow:0 12px 32px rgba(0,0,0,.35);display:flex;gap:8px;align-items:center;font-family:system-ui,sans-serif;font-size:13px;}
#${TOOLBAR_ID} button{background:#3b82f6;color:#fff;border:0;padding:7px 12px;border-radius:8px;cursor:pointer;font-weight:600;}
#${TOOLBAR_ID} button.secondary{background:#475569;}
#${TOOLBAR_ID} button.warn{background:#b45309;}
#${TOOLBAR_ID} #pdfFitInfo{color:#94a3b8;}

/* Preview trên màn hình */
body.exam-pdf-preview::before{content:"";position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:99980;}
body.exam-pdf-preview #${PRINT_ROOT_ID}{
  left:50%;transform:translateX(-50%);top:24px;
  z-index:99990;
  padding:${M}mm;
  width:${paper.w}mm;
  background:#fff;
  box-shadow:0 18px 60px rgba(0,0,0,.5);
  border:1px solid #cbd5e1;
  max-height:calc(100vh - 90px);
  overflow:auto;
}
body.exam-pdf-preview #${TOOLBAR_ID}{z-index:99999;}

/* Print */
@media print{
  body.exam-pdf-printing > *:not(#${PRINT_ROOT_ID}){display:none !important;}
  body.exam-pdf-printing::before{display:none !important;}
  body.exam-pdf-printing #${PRINT_ROOT_ID}{
    position:static !important;left:auto !important;top:auto !important;transform:none !important;
    width:100% !important;max-height:none !important;overflow:visible !important;
    box-shadow:none !important;border:0 !important;padding:0 !important;
  }
  body.exam-pdf-printing #${TOOLBAR_ID}{display:none !important;}
}

/* Modal style */
#${MODAL_ID}{position:fixed;inset:0;z-index:99970;font-family:system-ui,'Segoe UI',sans-serif;}
#${MODAL_ID} .pdfm-backdrop{position:absolute;inset:0;background:rgba(15,23,42,.55);}
#${MODAL_ID} .pdfm-card{position:relative;width:min(720px,94vw);max-height:90vh;overflow:auto;margin:5vh auto;background:#fff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.35);display:flex;flex-direction:column;}
#${MODAL_ID} .pdfm-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:18px 20px 8px;border-bottom:1px solid #e2e8f0;}
#${MODAL_ID} .pdfm-title{font-size:18px;font-weight:700;color:#0f172a;}
#${MODAL_ID} .pdfm-sub{font-size:13px;color:#64748b;margin-top:2px;}
#${MODAL_ID} .pdfm-x{background:transparent;border:0;font-size:24px;cursor:pointer;color:#64748b;line-height:1;}
#${MODAL_ID} .pdfm-body{padding:14px 20px;}
#${MODAL_ID} .pdfm-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
@media (max-width:640px){#${MODAL_ID} .pdfm-grid{grid-template-columns:1fr;}}
#${MODAL_ID} fieldset{border:1px solid #e2e8f0;border-radius:10px;padding:8px 12px 10px;}
#${MODAL_ID} legend{padding:0 6px;font-size:13px;font-weight:700;color:#334155;}
#${MODAL_ID} label{display:flex;align-items:center;gap:6px;font-size:13.5px;color:#334155;margin:4px 0;flex-wrap:wrap;}
#${MODAL_ID} label .pdfm-lbl{min-width:120px;}
#${MODAL_ID} input[type=text],#${MODAL_ID} input[type=number],#${MODAL_ID} select{border:1px solid #cbd5e1;border-radius:6px;padding:4px 8px;font-size:13px;background:#fff;flex:1;min-width:80px;}
#${MODAL_ID} .pdfm-foot{display:flex;align-items:center;gap:8px;padding:12px 20px;border-top:1px solid #e2e8f0;}
#${MODAL_ID} .pdfm-btn{padding:8px 14px;border:0;border-radius:8px;font-weight:600;cursor:pointer;font-size:14px;}
#${MODAL_ID} .pdfm-primary{background:#2563eb;color:#fff;}
#${MODAL_ID} .pdfm-primary:hover{background:#1d4ed8;}
#${MODAL_ID} .pdfm-secondary{background:#f1f5f9;color:#334155;}
#${MODAL_ID} .pdfm-secondary:hover{background:#e2e8f0;}
`;
  }

  function injectStyle(opts) {
    const old = document.getElementById(STYLE_ID); if (old) old.remove();
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = buildStyle(opts);
    document.head.appendChild(s);
  }

  // ===== DOM helpers =====
  function cleanNode(el) {
    el.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
    el.querySelectorAll('input,textarea,select,button').forEach(n => n.remove());
  }
  function detectType(qContainer) {
    const a = qContainer.querySelector('.answer-input-container');
    if (!a) return 'unknown';
    const radios = a.querySelectorAll('input[type="radio"]');
    if (radios.length) {
      const names = new Set(Array.from(radios).map(r => r.name));
      return names.size > 1 ? 'tf' : 'mc';
    }
    if (a.querySelector('textarea')) return 'essay';
    if (a.querySelector('input')) return 'sa';
    return 'unknown';
  }
  // Tách "A. " ra khỏi nội dung lựa chọn để bọc bằng .opt-key tuỳ style
  function extractOptionLetter(html) {
    // Tìm pattern <span class="option-letter">X.</span> hoặc plain "A. "
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const spanLetter = tmp.querySelector('.option-letter');
    if (spanLetter) {
      const letter = (spanLetter.textContent || '').replace(/[\.\s]/g, '');
      spanLetter.remove();
      // Loại trừ ký tự "." có thể còn lại đầu chuỗi
      let rest = tmp.innerHTML.replace(/^\s*\.\s*/, '').replace(/^&nbsp;\s*/i, '');
      return { letter: letter || '', rest: rest.trim() };
    }
    return { letter: '', rest: html };
  }
  function getOptionData(lbl) {
    const txt = lbl.querySelector('.leading-relaxed') || lbl;
    const c = txt.cloneNode(true);
    cleanNode(c);
    return extractOptionLetter(c.innerHTML);
  }
  function getTFItem(row) {
    const txt = row.querySelector('.flex-1');
    if (!txt) return null;
    const c = txt.cloneNode(true);
    cleanNode(c);
    return extractOptionLetter(c.innerHTML);
  }

  // ===== Build print root =====
  function buildRoot(title, examData, opts) {
    const live = document.getElementById('exam-questions-container');
    if (!live || !live.children.length) return null;
    const ex = document.getElementById(PRINT_ROOT_ID); if (ex) ex.remove();

    const root = document.createElement('div');
    root.id = PRINT_ROOT_ID;

    // ===== Header (school + title + info) =====
    const headerWrap = document.createElement('div');

    if (opts.showSchool) {
      const sc = document.createElement('div');
      sc.className = 'pdf-school';
      const sub = esc(opts.schoolSub || '');
      const name = esc(opts.schoolName || '');
      sc.innerHTML = `
        <div class="left">
          <div class="name">${name}</div>
          <hr/>
          <div class="sub">${sub}</div>
        </div>
        <div class="right">
          <div><b>${esc(title || 'ĐỀ KIỂM TRA')}</b></div>
          ${examData && examData.duration ? `<div>(<i>Thời gian: ${esc(examData.duration)} phút, không kể thời gian phát đề</i>)</div>` : ''}
        </div>`;
      headerWrap.appendChild(sc);
    }

    const tWrap = document.createElement('div');
    tWrap.className = 'pdf-titlewrap';
    if (opts.titleStyle === 'box') {
      const box = document.createElement('div');
      box.className = 'pdf-titlebox';
      box.innerHTML = `
        <h1>${esc(title || 'ĐỀ KIỂM TRA')}</h1>
        ${examData && examData.duration ? `<div class="pdf-time">Thời gian làm bài: ${esc(examData.duration)} phút, không kể thời gian phát đề</div>` : ''}
      `;
      tWrap.appendChild(box);
    } else {
      tWrap.innerHTML = `
        <h1>${esc(title || 'ĐỀ KIỂM TRA')}</h1>
        ${examData && examData.duration ? `<div class="pdf-time">Thời gian làm bài: ${esc(examData.duration)} phút</div>` : ''}
      `;
    }
    // Khi đã có header school 2 cột, ẩn title trùng lặp ở giữa
    if (!opts.showSchool) headerWrap.appendChild(tWrap);

    if (opts.showInfoFields) {
      const info = document.createElement('div');
      info.className = 'pdf-info';
      info.innerHTML = '<div><b>Họ và tên:</b> </div><div><b>Lớp:</b> </div><div><b>SBD:</b> </div>';
      headerWrap.appendChild(info);
    }

    root.appendChild(headerWrap);

    // ===== Wrapper main + side note nếu có =====
    let contentMount;
    if (opts.layout === 'side-note') {
      const wrap = document.createElement('div');
      wrap.className = 'pdf-main-wrap';
      const main = document.createElement('div');
      main.className = 'pdf-main pdf-content';
      const side = document.createElement('div');
      side.className = 'pdf-side';
      side.innerHTML = `<div class="side-title">${esc(opts.sideNoteTitle || 'QUICK NOTE')}</div>`
        + Array(28).fill('<div class="side-line"></div>').join('');
      wrap.appendChild(main);
      wrap.appendChild(side);
      root.appendChild(wrap);
      contentMount = main;
    } else {
      contentMount = document.createElement('div');
      contentMount.className = 'pdf-content';
      root.appendChild(contentMount);
    }

    // ===== Câu hỏi =====
    let n = 1;
    Array.from(live.children).forEach(node => {
      if (node.tagName === 'H2') {
        const h = document.createElement('h2');
        h.className = 'pdf-sec';
        h.textContent = node.textContent || '';
        contentMount.appendChild(h);
        return;
      }
      if (!node.classList || !node.classList.contains('question-container')) return;

      const stemEl = node.querySelector('.question-text');
      if (!stemEl) return;
      const area = node.querySelector('.answer-input-container');
      const type = detectType(node);

      const stemClone = stemEl.cloneNode(true);
      cleanNode(stemClone);

      const q = document.createElement('div');
      q.className = 'pdf-q';

      const stemLine = document.createElement('div');
      stemLine.className = 'pdf-stem-wrap';
      stemLine.innerHTML = `<span class="pdf-num">Câu ${n}.</span><span class="pdf-stem"></span>`;
      stemLine.querySelector('.pdf-stem').appendChild(stemClone);
      q.appendChild(stemLine);

      if (type === 'mc' && area) {
        const labels = Array.from(area.querySelectorAll('label'));
        const opts2 = labels.map(getOptionData);
        if (opts2.length) {
          const grid = document.createElement('div');
          const colsClass = opts2.length === 2 ? 'cols-2' : (opts2.length === 3 ? 'cols-3' : '');
          grid.className = 'pdf-opts ' + colsClass;
          opts2.forEach(({ letter, rest }) => {
            const cell = document.createElement('div');
            cell.className = 'pdf-opt';
            const keyHTML = letter ? `<span class="opt-key">${esc(letter)}</span>` : '';
            cell.innerHTML = `${keyHTML} ${rest}`;
            grid.appendChild(cell);
          });
          q.appendChild(grid);
        }
      } else if (type === 'tf' && area) {
        const items = Array.from(area.children).map(getTFItem).filter(Boolean);
        if (items.length) {
          const ol = document.createElement('ol');
          ol.className = 'pdf-tf';
          items.forEach(({ letter, rest }) => {
            const li = document.createElement('li');
            const keyHTML = letter ? `<span class="opt-key">${esc(letter)}</span>` : '';
            li.innerHTML = `${keyHTML}${rest}`;
            ol.appendChild(li);
          });
          q.appendChild(ol);
        }
      } else if (type === 'sa') {
        const sa = document.createElement('div');
        sa.className = 'pdf-sa';
        sa.innerHTML = `<span class="lbl">Đáp số:</span><span class="pdf-dots"></span>`;
        q.appendChild(sa);
      } else if (type === 'essay') {
        const e = document.createElement('div');
        e.className = 'pdf-essay';
        e.innerHTML = '<div class="pdf-line"></div>'.repeat(4);
        q.appendChild(e);
      }

      // Working space (dòng kẻ trống cho học sinh viết)
      if (opts.spacing === 'working' && type !== 'essay') {
        const w = document.createElement('div');
        w.className = 'pdf-work';
        w.innerHTML = '<div class="work-line"></div>'.repeat(opts.workingLines || 2);
        q.appendChild(w);
      }

      n++;
      contentMount.appendChild(q);
    });

    document.body.appendChild(root);
    return root;
  }

  // ===== Auto-fit theo số trang =====
  async function autoFit(root, opts, info) {
    if (!opts.fitPages) {
      if (info) info.textContent = 'Không co — chảy tự nhiên';
      return null;
    }
    const paper = opts.paper === 'A5' ? A5 : A4;
    const targetPx = (paper.h * opts.fitPages - opts.margin * 2 * opts.fitPages) * MM;
    const sizes = [12, 11.5, 11, 10.5, 10, 9.5, 9, 8.7, 8.4, 8.1, 7.8, 7.5, 7.2, 7];
    let chosen = sizes[sizes.length - 1];
    for (const s of sizes) {
      root.style.fontSize = s + 'pt';
      void root.offsetHeight;
      // Đợi ngắn cho MathJax/JSXGraph rescale layout
      await new Promise(r => requestAnimationFrame(r));
      const h = root.getBoundingClientRect().height;
      if (h <= targetPx + 4) { chosen = s; break; }
      chosen = s;
    }
    if (info) info.textContent = `Co vừa ${opts.fitPages} trang — cỡ chữ ${chosen}pt`;
    return chosen;
  }

  // ===== Toolbar =====
  function showToolbar(handlers) {
    const old = document.getElementById(TOOLBAR_ID); if (old) old.remove();
    const bar = document.createElement('div');
    bar.id = TOOLBAR_ID;
    bar.innerHTML =
      '<span id="pdfFitInfo">Đang chuẩn bị...</span>'
      + '<button id="pdfTogglePreview" class="secondary">Ẩn xem trước</button>'
      + '<button id="pdfReopen" class="warn">Đổi tuỳ chọn</button>'
      + '<button id="pdfPrint">In / Lưu PDF</button>'
      + '<button id="pdfClose" class="secondary">Đóng</button>';
    document.body.appendChild(bar);
    bar.querySelector('#pdfPrint').addEventListener('click', handlers.onPrint);
    bar.querySelector('#pdfClose').addEventListener('click', handlers.onClose);
    bar.querySelector('#pdfTogglePreview').addEventListener('click', () => {
      const on = document.body.classList.toggle('exam-pdf-preview');
      bar.querySelector('#pdfTogglePreview').textContent = on ? 'Ẩn xem trước' : 'Xem trước';
    });
    bar.querySelector('#pdfReopen').addEventListener('click', handlers.onReopen);
    return bar;
  }

  function cleanup() {
    document.documentElement.classList.remove('exam-pdf-printing');
    document.body.classList.remove('exam-pdf-preview', 'exam-pdf-printing');
    const r = document.getElementById(PRINT_ROOT_ID); if (r) r.remove();
    const t = document.getElementById(TOOLBAR_ID); if (t) t.remove();
    const s = document.getElementById(STYLE_ID); if (s) s.remove();
  }

  // ===== Main =====
  async function exportExamPdf(examData, title) {
    if (!examData || !Array.isArray(examData.questions) || !examData.questions.length) {
      alert('Chưa có dữ liệu đề để xuất PDF.'); return;
    }
    const live = document.getElementById('exam-questions-container');
    if (!live || !live.children.length) {
      alert('Không tìm thấy nội dung đề đã render. Hãy bắt đầu làm đề trước khi xuất PDF.'); return;
    }

    const opts = await showOptionsModal();
    if (!opts) return; // huỷ

    await renderWith(examData, title, opts);
  }

  async function renderWith(examData, title, opts) {
    // Dọn cũ trước khi vẽ mới
    const oldRoot = document.getElementById(PRINT_ROOT_ID); if (oldRoot) oldRoot.remove();
    const oldBar  = document.getElementById(TOOLBAR_ID);    if (oldBar) oldBar.remove();

    injectStyle(opts);
    const root = buildRoot(title, examData, opts);
    if (!root) { alert('Lỗi tạo nội dung PDF.'); return; }

    const bar = showToolbar({
      onPrint: async () => {
        document.body.classList.add('exam-pdf-printing');
        document.documentElement.classList.add('exam-pdf-printing');
        // Bỏ preview để khi in không bị chèn backdrop
        document.body.classList.remove('exam-pdf-preview');
        await new Promise(r => setTimeout(r, 80));
        window.print();
        setTimeout(() => {
          document.body.classList.remove('exam-pdf-printing');
          document.documentElement.classList.remove('exam-pdf-printing');
        }, 600);
      },
      onClose: cleanup,
      onReopen: async () => {
        const newOpts = await showOptionsModal();
        if (!newOpts) return;
        await renderWith(examData, title, newOpts);
      }
    });
    const info = bar.querySelector('#pdfFitInfo');

    if (window.MathJax && window.MathJax.typesetPromise) {
      try { await window.MathJax.typesetPromise([root]); } catch (_) {}
    }
    await new Promise(r => setTimeout(r, 60));
    await autoFit(root, opts, info);

    // Mặc định bật preview
    document.body.classList.add('exam-pdf-preview');
    bar.querySelector('#pdfTogglePreview').textContent = 'Ẩn xem trước';
  }

  window.exportExamPdf = exportExamPdf;
})();
