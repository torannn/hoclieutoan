/* exam-pdf.js - Xuất đề ra PDF (in qua trình duyệt), tận dụng DOM đã render. */
(function () {
  'use strict';

  const PRINT_ROOT_ID = 'exam-pdf-print-root';
  const STYLE_ID = 'exam-pdf-print-style';
  const TOOLBAR_ID = 'exam-pdf-toolbar';
  const A4_W_MM = 210, A4_H_MM = 297, MARGIN_MM = 12;
  const MM = 3.7795275591;
  const TWO_PAGES_PX = (A4_H_MM * 2 - MARGIN_MM * 4) * MM;

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const css = `
#${PRINT_ROOT_ID}{position:fixed;left:-10000px;top:0;width:${A4_W_MM - MARGIN_MM*2}mm;background:#fff;color:#000;font-family:'TeX Gyre Pagella','Palatino Linotype','Book Antiqua',Palatino,'Lora',Georgia,serif;font-size:11pt;line-height:1.32;z-index:-1;}
#${PRINT_ROOT_ID} .pdf-header{text-align:center;border-bottom:1.2pt solid #000;padding-bottom:4pt;margin-bottom:6pt;}
#${PRINT_ROOT_ID} .pdf-header .school{font-size:10pt;text-transform:uppercase;letter-spacing:.3pt;}
#${PRINT_ROOT_ID} .pdf-header h1{font-size:14pt;margin:2pt 0 1pt;text-transform:uppercase;font-weight:700;}
#${PRINT_ROOT_ID} .pdf-header .meta{font-size:9.5pt;font-style:italic;}
#${PRINT_ROOT_ID} .pdf-info{display:flex;gap:10mm;margin:4pt 0 6pt;font-size:10pt;}
#${PRINT_ROOT_ID} .pdf-info>div{flex:1;border-bottom:1px dotted #444;padding-bottom:1pt;}
#${PRINT_ROOT_ID} h2.pdf-sec{font-size:11pt;font-weight:700;margin:6pt 0 3pt;text-transform:uppercase;border-bottom:.6pt solid #000;padding-bottom:1pt;}
#${PRINT_ROOT_ID} .pdf-q{margin:0 0 3pt;page-break-inside:avoid;break-inside:avoid;}
#${PRINT_ROOT_ID} .pdf-num{font-weight:700;margin-right:4pt;}
#${PRINT_ROOT_ID} .pdf-stem{display:inline;}
#${PRINT_ROOT_ID} .pdf-opts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));column-gap:6pt;row-gap:1pt;margin:1pt 0 1pt 4mm;}
#${PRINT_ROOT_ID} .pdf-opts.cols-2{grid-template-columns:repeat(2,minmax(0,1fr));}
#${PRINT_ROOT_ID} .pdf-opts.cols-3{grid-template-columns:repeat(3,minmax(0,1fr));}
#${PRINT_ROOT_ID} .pdf-tf{list-style:none;padding:0;margin:1pt 0 1pt 4mm;}
#${PRINT_ROOT_ID} .pdf-tf li{margin:.5pt 0;}
#${PRINT_ROOT_ID} .pdf-sa{margin:1pt 0 1pt 4mm;}
#${PRINT_ROOT_ID} .pdf-sa .pdf-dots{display:inline-block;width:60mm;border-bottom:1px dotted #555;height:1em;vertical-align:bottom;}
#${PRINT_ROOT_ID} .pdf-essay .pdf-line{border-bottom:1px dotted #888;height:1.4em;margin:1pt 0;}
#${PRINT_ROOT_ID} mjx-container{margin:0 !important;}
#${PRINT_ROOT_ID} mjx-container[display="true"]{margin:2pt 0 !important;display:block !important;text-align:center;}
#${PRINT_ROOT_ID} img,#${PRINT_ROOT_ID} svg{max-width:100%;}
#${PRINT_ROOT_ID} .jxgbox{page-break-inside:avoid;break-inside:avoid;}
#${TOOLBAR_ID}{position:fixed;right:16px;bottom:16px;z-index:99999;background:#1e293b;color:#fff;padding:10px 14px;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.25);display:flex;gap:8px;align-items:center;font-family:system-ui,sans-serif;font-size:13px;}
#${TOOLBAR_ID} button{background:#3b82f6;color:#fff;border:0;padding:6px 12px;border-radius:8px;cursor:pointer;font-weight:600;}
#${TOOLBAR_ID} button.secondary{background:#475569;}
#${TOOLBAR_ID} #pdfFitInfo{color:#cbd5e1;}
body.exam-pdf-preview #${PRINT_ROOT_ID}{left:50%;transform:translateX(-50%);top:80px;z-index:99990;padding:${MARGIN_MM}mm;box-shadow:0 10px 40px rgba(0,0,0,.25);border:1px solid #cbd5e1;max-height:calc(100vh - 120px);overflow:auto;}
body.exam-pdf-preview>*:not(#${PRINT_ROOT_ID}):not(#${TOOLBAR_ID}):not(script):not(style){filter:blur(2px);pointer-events:none;}
@media print{
  @page{size:A4;margin:${MARGIN_MM}mm ${MARGIN_MM}mm;}
  body.exam-pdf-printing>*:not(#${PRINT_ROOT_ID}){display:none !important;}
  body.exam-pdf-printing #${PRINT_ROOT_ID}{position:static !important;left:auto !important;top:auto !important;transform:none !important;width:100% !important;max-height:none !important;overflow:visible !important;box-shadow:none !important;border:0 !important;padding:0 !important;}
  body.exam-pdf-printing #${TOOLBAR_ID}{display:none !important;}
}`;
    const s = document.createElement('style');
    s.id = STYLE_ID; s.textContent = css;
    document.head.appendChild(s);
  }

  function cleanNode(el) {
    el.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
    el.querySelectorAll('input,textarea,select,button').forEach(n => n.remove());
  }

  function detectType(q) {
    const a = q.querySelector('.answer-input-container');
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

  function getOptionHtml(lbl) {
    const txt = lbl.querySelector('.leading-relaxed') || lbl;
    const c = txt.cloneNode(true);
    c.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
    c.querySelectorAll('input').forEach(n => n.remove());
    return c.innerHTML;
  }

  function getTFItemHtml(row) {
    const txt = row.querySelector('.flex-1');
    if (!txt) return '';
    const c = txt.cloneNode(true);
    c.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
    c.querySelectorAll('input').forEach(n => n.remove());
    return c.innerHTML;
  }

  function buildRoot(title, examData) {
    const live = document.getElementById('exam-questions-container');
    if (!live || !live.children.length) return null;
    const existing = document.getElementById(PRINT_ROOT_ID);
    if (existing) existing.remove();

    const root = document.createElement('div');
    root.id = PRINT_ROOT_ID;

    const total = live.querySelectorAll('.question-container').length;
    const dur = examData && examData.duration ? `Thời gian: ${examData.duration} phút` : '';
    const header = document.createElement('div');
    header.className = 'pdf-header';
    header.innerHTML = `<div class="school">Học liệu Toán</div><h1></h1><div class="meta"></div>`;
    header.querySelector('h1').textContent = title || 'Đề kiểm tra';
    header.querySelector('.meta').textContent = (dur ? dur + '  |  ' : '') + 'Tổng số câu: ' + total;
    root.appendChild(header);

    const info = document.createElement('div');
    info.className = 'pdf-info';
    info.innerHTML = '<div>Họ và tên: </div><div>Lớp: </div><div>SBD: </div>';
    root.appendChild(info);

    let n = 1;
    Array.from(live.children).forEach(node => {
      if (node.tagName === 'H2') {
        const h = document.createElement('h2');
        h.className = 'pdf-sec';
        h.textContent = node.textContent || '';
        root.appendChild(h);
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

      const line = document.createElement('div');
      line.innerHTML = `<span class="pdf-num">Câu ${n}.</span><span class="pdf-stem"></span>`;
      line.querySelector('.pdf-stem').appendChild(stemClone);
      q.appendChild(line);

      if (type === 'mc' && area) {
        const labels = Array.from(area.querySelectorAll('label'));
        const opts = labels.map(getOptionHtml).filter(Boolean);
        if (opts.length) {
          const g = document.createElement('div');
          const cls = opts.length === 2 ? 'cols-2' : (opts.length === 3 ? 'cols-3' : '');
          g.className = 'pdf-opts ' + cls;
          opts.forEach(h => {
            const d = document.createElement('div');
            d.className = 'pdf-opt';
            d.innerHTML = h;
            g.appendChild(d);
          });
          q.appendChild(g);
        }
      } else if (type === 'tf' && area) {
        const items = Array.from(area.children).map(getTFItemHtml).filter(Boolean);
        if (items.length) {
          const ol = document.createElement('ol');
          ol.className = 'pdf-tf';
          items.forEach(h => {
            const li = document.createElement('li');
            li.innerHTML = h;
            ol.appendChild(li);
          });
          q.appendChild(ol);
        }
      } else if (type === 'sa') {
        const s = document.createElement('div');
        s.className = 'pdf-sa';
        s.innerHTML = 'Đáp số: <span class="pdf-dots"></span>';
        q.appendChild(s);
      } else if (type === 'essay') {
        const e = document.createElement('div');
        e.className = 'pdf-essay';
        e.innerHTML = '<div class="pdf-line"></div>'.repeat(4);
        q.appendChild(e);
      }

      n++;
      root.appendChild(q);
    });

    document.body.appendChild(root);
    return root;
  }

  async function autoFit(root, info) {
    const sizes = [11.5, 11, 10.5, 10, 9.5, 9, 8.7, 8.4, 8.1, 7.8, 7.5, 7.2, 7];
    let chosen = sizes[sizes.length - 1];
    for (const s of sizes) {
      root.style.fontSize = s + 'pt';
      // buộc reflow
      void root.offsetHeight;
      const h = root.getBoundingClientRect().height;
      if (h <= TWO_PAGES_PX + 4) { chosen = s; break; }
      chosen = s;
    }
    if (info) info.textContent = 'Cỡ chữ: ' + chosen + 'pt';
    return chosen;
  }

  function cleanup() {
    document.body.classList.remove('exam-pdf-preview', 'exam-pdf-printing');
    const r = document.getElementById(PRINT_ROOT_ID); if (r) r.remove();
    const t = document.getElementById(TOOLBAR_ID); if (t) t.remove();
  }

  function showToolbar(onPrint, onClose, onPreview) {
    const old = document.getElementById(TOOLBAR_ID); if (old) old.remove();
    const bar = document.createElement('div');
    bar.id = TOOLBAR_ID;
    bar.innerHTML = '<span id="pdfFitInfo">Đang chuẩn bị...</span>'
      + '<button id="pdfPreview" class="secondary">Xem trước</button>'
      + '<button id="pdfPrint">In / Lưu PDF</button>'
      + '<button id="pdfClose" class="secondary">Đóng</button>';
    document.body.appendChild(bar);
    bar.querySelector('#pdfPrint').addEventListener('click', onPrint);
    bar.querySelector('#pdfClose').addEventListener('click', onClose);
    bar.querySelector('#pdfPreview').addEventListener('click', onPreview);
    return bar;
  }

  async function exportExamPdf(examData, title) {
    if (!examData || !Array.isArray(examData.questions) || !examData.questions.length) {
      alert('Chưa có dữ liệu đề để xuất PDF.');
      return;
    }
    injectStyle();
    const root = buildRoot(title, examData);
    if (!root) {
      alert('Không tìm thấy nội dung đề đã render. Hãy bắt đầu làm đề trước khi xuất PDF.');
      return;
    }

    const bar = showToolbar(
      async () => {
        document.body.classList.add('exam-pdf-printing');
        setTimeout(() => {
          window.print();
          setTimeout(cleanup, 500);
        }, 100);
      },
      cleanup,
      () => document.body.classList.toggle('exam-pdf-preview')
    );
    const info = bar.querySelector('#pdfFitInfo');

    // Chờ MathJax hoàn tất typeset cho mjx-container nhân bản (nếu cần)
    if (window.MathJax && window.MathJax.typesetPromise) {
      try { await window.MathJax.typesetPromise([root]); } catch (e) {}
    }
    // Cho JSXGraph bên trong có thời gian reflow (đã được clone DOM sẵn, chỉ cần layout)
    await new Promise(r => setTimeout(r, 50));
    await autoFit(root, info);

    // Bật preview mặc định để user thấy kết quả
    document.body.classList.add('exam-pdf-preview');
  }

  window.exportExamPdf = exportExamPdf;
})();
