(function(){
  // Tailwind-based interactive input rendering (experimental override)
  // Lightweight ripple for any [data-ripple] element
  document.addEventListener('click', function(e){
    const el = e.target.closest('[data-ripple]');
    if(!el) return;
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size/2;
    const y = e.clientY - rect.top - size/2;
    const span = document.createElement('span');
    span.style.position = 'absolute';
    span.style.left = x + 'px';
    span.style.top = y + 'px';
    span.style.width = span.style.height = size + 'px';
    span.style.borderRadius = '9999px';
    span.style.background = 'radial-gradient(circle, rgba(59,130,246,0.25) 0%, rgba(59,130,246,0.15) 40%, rgba(59,130,246,0) 70%)';
    span.style.pointerEvents = 'none';
    span.style.transform = 'scale(0)';
    span.style.opacity = '1';
    span.style.transition = 'transform 450ms ease, opacity 650ms ease';
    (el.classList.contains('relative') ? el : el).appendChild(span);
    requestAnimationFrame(()=>{ span.style.transform = 'scale(1)'; span.style.opacity = '0'; });
    setTimeout(()=>{ try{ span.remove(); }catch(_){} }, 700);
  }, true);

  function setMCSelected(qId, key){
    try{
      document.querySelectorAll(`.ans-choice[data-qid="${qId}"]`).forEach(btn=>{
        const k = btn.getAttribute('data-choice');
        const bullet = btn.querySelector('.choice-bullet');
        if(!bullet) return;
        if(String(k) === String(key)){
          bullet.classList.add('bg-blue-600','text-white','border-blue-600','shadow');
          bullet.classList.remove('border-slate-300','text-slate-700','bg-transparent');
        } else {
          bullet.classList.remove('bg-blue-600','text-white','border-blue-600','shadow');
          bullet.classList.add('border-slate-300','text-slate-700','bg-transparent');
        }
      });
    }catch(e){}
  }

  function setTFSelected(qId, key, val){
    try{
      const trueBtn = document.querySelector(`.tf-choice[data-qid="${qId}"][data-idx="${key}"][data-val="true"]`);
      const falseBtn = document.querySelector(`.tf-choice[data-qid="${qId}"][data-idx="${key}"][data-val="false"]`);
      if(trueBtn){
        if(val === true){
          trueBtn.classList.add('bg-green-50','border-green-500','text-green-700');
          trueBtn.classList.remove('border-slate-300');
        } else {
          trueBtn.classList.remove('bg-green-50','border-green-500','text-green-700');
          trueBtn.classList.add('border-slate-300');
        }
      }
      if(falseBtn){
        if(val === false){
          falseBtn.classList.add('bg-red-50','border-red-500','text-red-700');
          falseBtn.classList.remove('border-slate-300');
        } else {
          falseBtn.classList.remove('bg-red-50','border-red-500','text-red-700');
          falseBtn.classList.add('border-slate-300');
        }
      }
    }catch(e){}
  }

  window.selectMC = function(qId, key){
    try { if(typeof saveAnswer === 'function') saveAnswer(qId, key); } catch(e){}
    setMCSelected(qId, key);
    try{ if(window.updateQuestionPalette) updateQuestionPalette(); }catch(e){}
  };

  window.selectTF = function(qId, key, val){
    try { if(typeof saveTrueFalseAnswer === 'function') saveTrueFalseAnswer(qId, key, val); } catch(e){}
    setTFSelected(qId, key, val);
    try{ if(window.updateQuestionPalette) updateQuestionPalette(); }catch(e){}
  };

  // Override renderInputElement to Tailwind blocks
  window.renderInputElement = function(question, parentType){
    if (typeof examMode !== 'undefined' && examMode !== 'interactive') return '';
    const qId = question.q_id;
    const qType = question.type || parentType;

    if (qType === 'multiple_choice') {
      const parsed = (typeof getMCParsed === 'function') ? getMCParsed(question) : { options: [] };
      if (!parsed.options.length) return '';
      const buttons = parsed.options.map(opt=>
        `<button type="button" data-ripple class="ans-choice relative overflow-hidden w-full text-left border border-slate-200 rounded-xl p-3 hover:border-blue-300 hover:bg-blue-50 transition flex gap-3 items-center active:scale-95" data-qid="${qId}" data-choice="${opt.key}" onclick="selectMC('${qId}','${opt.key}')">
           <span class="choice-bullet inline-flex items-center justify-center w-8 h-8 rounded-full border-2 border-slate-300 text-slate-700 font-semibold flex-shrink-0">${opt.key}</span>
           <span class="leading-relaxed text-slate-800">${opt.text||''}</span>
         </button>`
      ).join('');
      return `<div class="answer-input-container mt-3 grid gap-2">${buttons}</div>`;
    }

    if (qType === 'true_false') {
      const parsed = (typeof getTFParsed === 'function') ? getTFParsed(question) : { items: [] };
      if (!parsed.items.length) return '';
      const rows = parsed.items.map(it=>
        `<div class="flex items-start justify-between gap-4 p-2 bg-slate-50 rounded">
           <div class="flex-1"><span class="option-letter font-medium">${it.key})</span> ${it.text||''}</div>
           <div class="flex items-center gap-2">
             <button type="button" data-ripple class="tf-choice relative overflow-hidden px-3 py-1 rounded-lg border border-slate-300 active:scale-95" data-qid="${qId}" data-idx="${it.key}" data-val="true" onclick="selectTF('${qId}','${it.key}', true)">Đúng</button>
             <button type="button" data-ripple class="tf-choice relative overflow-hidden px-3 py-1 rounded-lg border border-slate-300 active:scale-95" data-qid="${qId}" data-idx="${it.key}" data-val="false" onclick="selectTF('${qId}','${it.key}', false)">Sai</button>
           </div>
         </div>`
      ).join('');
      return `<div class="answer-input-container mt-3 grid gap-2">${rows}</div>`;
    }

    if (qType === 'short') {
      return `<div class="answer-input-container mt-3">
        <input type="text" id="${qId}" inputmode="decimal" class="w-full p-3 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition" placeholder="Nhập đáp án (chỉ số, dùng dấu phẩy hoặc chấm)" oninput="saveAnswer('${qId}', this.value); if(window.updateQuestionPalette) updateQuestionPalette();" />
      </div>`;
    }

    return '';
  };

  // Override applySavedAnswersToUI to update Tailwind blocks
  window.applySavedAnswersToUI = function(){
    try{
      Object.entries(studentAnswers||{}).forEach(([qId, val])=>{
        if(typeof val === 'string' || typeof val === 'number'){
          const key = (typeof val === 'number') ? (function(v){ const letter = (typeof letterFromIndex==='function')?letterFromIndex(v):v; return letter; })(val) : val;
          setMCSelected(qId, key);
          const input = document.getElementById(qId);
          if(input && typeof val === 'string') input.value = val;
        }else if(typeof val === 'object' && val){
          Object.entries(val).forEach(([k,v])=> setTFSelected(qId, k, v));
        }
      });
    }catch(e){}
  };

  // Override getStudentAnswerDisplay with color status chips
  window.getStudentAnswerDisplay = function(question){
    const qId = question.q_id;
    const answer = (typeof studentAnswers !== 'undefined') ? studentAnswers[qId] : undefined;
    const ansText = (typeof answersMap !== 'undefined') ? (answersMap[qId] || question.model_answer || '') : (question.model_answer || '');
    const t = question.type || '';

    function chip(text, kind){
      if(kind==='ok') return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-sm bg-green-50 text-green-700 border border-green-200">${text}</span>`;
      if(kind==='bad') return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-sm bg-red-50 text-red-700 border border-red-200">${text}</span>`;
      return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-sm bg-yellow-50 text-yellow-700 border border-yellow-200">${text}</span>`;
    }

    if(t === 'multiple_choice'){
      let userKey = '';
      if(typeof answer === 'number' && typeof letterFromIndex === 'function') userKey = letterFromIndex(answer);
      else userKey = String(answer||'').toUpperCase();
      const expIdx = (typeof getExpectedMCIndex==='function') ? getExpectedMCIndex(question, ansText) : -1;
      const expKey = (expIdx>=0 && typeof letterFromIndex==='function') ? letterFromIndex(expIdx) : '';
      let status = 'warn', label='Chưa làm';
      if(userKey){ status = (expKey && userKey===expKey) ? 'ok' : 'bad'; label = (status==='ok')?'Đúng':'Sai'; }
      return `<div class="mt-2">
        <div class="mb-1">${chip(label, status)}</div>
        <div class="text-sm text-slate-700">Bạn chọn: <span class="font-medium">${userKey||'-'}</span> • Đáp án đúng: <span class="text-green-700 font-semibold">${expKey||'-'}</span></div>
      </div>`;
    }

    if(t === 'true_false'){
      const parsed = (typeof getTFParsed==='function') ? getTFParsed(question) : {items:[]};
      const expected = (typeof getExpectedTFArray==='function') ? getExpectedTFArray(question, ansText) : [];
      const st = (typeof studentAnswers !== 'undefined') ? studentAnswers[qId] : undefined;
      const items = parsed.items||[];
      const rows = items.map((it, i)=>{
        const u = Array.isArray(st) ? st[i] : (st ? st[String.fromCharCode(97+i)] : undefined);
        const ok = (typeof expected[i]==='boolean' && typeof u==='boolean' && u===expected[i]);
        const text = `${it.key}) ${u===true?'Đúng':(u===false?'Sai':'-')}`;
        return `<div class="text-sm">${chip(ok?'Đúng':'Sai', ok?'ok':(typeof u==='boolean'?'bad':'warn'))} <span class="ml-2">${text}</span></div>`;
      }).join('');
      return `<div class="mt-2 space-y-1">${rows}</div>`;
    }

    if(t === 'short'){
      const userVal = (typeof answer==='string') ? answer : '';
      return `<div class="mt-2 text-sm">Bạn trả lời: <span class="font-medium">${(userVal||'-').replace('.',',')}</span></div>`;
    }

    return '';
  };
})();
