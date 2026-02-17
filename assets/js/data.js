(function(){
  const cfg = window.APP_CONFIG || {};

  // Use shared utilities from firebase-utils.js
  const ensureFirebase = () => window.FirebaseUtils?.ensureFirebase() || Promise.resolve();

  function getLocalAttemptsKey(uid){
    return 'attempts:'+uid;
  }

  function getLocalUserKey(uid){
    return 'user:'+uid;
  }

  async function saveAttemptLocal(uid, attempt){
    try{
      const key = getLocalAttemptsKey(uid);
      const raw = localStorage.getItem(key);
      const arr = raw ? JSON.parse(raw) : [];
      arr.push(attempt);
      localStorage.setItem(key, JSON.stringify(arr));
      return { ok: true, local: true };
    }catch(e){
      console.warn('saveAttemptLocal failed', e);
      return { ok: false, error: String(e) };
    }
  }

  async function saveAttemptFirebase(uid, attempt){
    await ensureFirebase();
    if(!firebase.apps.length){ firebase.initializeApp(cfg.firebase); }
    const db = firebase.firestore();
    const docId = uid+':'+attempt.startedAt;
    await db.collection('attempts').doc(docId).set(attempt);
    return { ok: true, id: docId };
  }

  async function saveAttempt(attempt){
    const user = window.Auth && Auth.getUser ? Auth.getUser() : null;
    const uid = user ? user.uid : 'guest';
    attempt.uid = uid;
    attempt.userName = user && user.displayName ? user.displayName : '';
    attempt.userEmail = user && user.email ? user.email : '';
    try{
      if(uid && uid !== 'guest'){
        const prof = await getUserProfile(uid);
        if(prof){
          attempt.userFullName = prof.fullName || '';
          attempt.userGrade = prof.grade || '';
          attempt.userSchool = prof.school || '';
        }
      }
    }catch(e){ /* ignore profile enrichment errors */ }
    if(cfg.authProvider === 'firebase' && cfg.firebase && cfg.firebase.apiKey && user && !user.isLocal){
      try { return await saveAttemptFirebase(uid, attempt); } catch(e){ console.warn('saveAttemptFirebase failed', e); }
    }
    return await saveAttemptLocal(uid, attempt);
  }

  async function listAttempts(){
    const user = window.Auth && Auth.getUser ? Auth.getUser() : null;
    const uid = user ? user.uid : 'guest';
    if(cfg.authProvider === 'firebase' && cfg.firebase && cfg.firebase.apiKey && user && !user.isLocal){
      try{
        await ensureFirebase();
        if(!firebase.apps.length){ firebase.initializeApp(cfg.firebase); }
        const db = firebase.firestore();
        const snap = await db.collection('attempts')
          .where('uid','==',uid)
          .limit(200)
          .get();
        const arr = snap.docs.map(d=>d.data());
        arr.sort((a,b)=> (b.startedAt||0) - (a.startedAt||0));
        return arr;
      }catch(e){ console.warn('listAttempts firebase failed', e); }
    }
    try{
      const raw = localStorage.getItem(getLocalAttemptsKey(uid));
      return raw ? JSON.parse(raw) : [];
    }catch(e){ return []; }
  }

  function isAdmin(){
    try{
      const u = window.Auth && Auth.getUser ? Auth.getUser() : null;
      const emails = (cfg && Array.isArray(cfg.adminEmails)) ? cfg.adminEmails : [];
      const localNames = (cfg && Array.isArray(cfg.adminLocalNames)) ? cfg.adminLocalNames : [];
      const isEmailAdmin = !!(u && u.email && emails.includes(u.email));
      const isLocalAdmin = !!(u && u.isLocal && u.displayName && localNames.includes(u.displayName));
      return isEmailAdmin || isLocalAdmin;
    }catch(e){ return false; }
  }

  async function listAllAttempts(limitN = 500){
    if(cfg.authProvider === 'firebase' && cfg.firebase && cfg.firebase.apiKey && isAdmin()){
      try{
        await ensureFirebase();
        if(!firebase.apps.length){ firebase.initializeApp(cfg.firebase); }
        const db = firebase.firestore();
        try{
          const snap = await db.collection('attempts').orderBy('submittedAt','desc').limit(limitN).get();
          return snap.docs.map(d=>d.data());
        }catch(e){
          console.warn('listAllAttempts ordered query failed, fallback without order', e);
          const snap2 = await db.collection('attempts').limit(limitN).get();
          const arr = snap2.docs.map(d=>d.data());
          arr.sort((a,b)=> (b.submittedAt||0) - (a.submittedAt||0));
          return arr;
        }
      }catch(e){ console.warn('listAllAttempts firebase failed', e); return []; }
    }
    return [];
  }

  async function addSelfAsAdmin(){
    try{
      const user = window.Auth && Auth.getUser ? Auth.getUser() : null;
      if(!user || user.isLocal){ throw new Error('Bạn cần đăng nhập Google để đăng ký admin.'); }
      await ensureFirebase();
      if(!firebase.apps.length){ firebase.initializeApp(cfg.firebase); }
      const db = firebase.firestore();
      const payload = { email: user.email || '', createdAt: (firebase.firestore && firebase.firestore.FieldValue && firebase.firestore.FieldValue.serverTimestamp) ? firebase.firestore.FieldValue.serverTimestamp() : Date.now() };
      await db.collection('admins').doc(user.uid).set(payload, { merge: true });
      return { ok: true };
    }catch(e){
      console.warn('addSelfAsAdmin failed', e);
      return { ok: false, error: String(e) };
    }
  }

  async function getUserProfile(uid){
    if(!uid) return null;
    if(cfg.authProvider === 'firebase' && cfg.firebase && cfg.firebase.apiKey){
      try{
        await ensureFirebase();
        if(!firebase.apps.length){ firebase.initializeApp(cfg.firebase); }
        const db = firebase.firestore();
        const doc = await db.collection('users').doc(uid).get();
        if(doc.exists) return doc.data();
      }catch(e){ console.warn('getUserProfile firebase failed', e); }
    }
    try{
      const raw = localStorage.getItem(getLocalUserKey(uid));
      return raw ? JSON.parse(raw) : null;
    }catch(e){ return null; }
  }

  async function upsertUserProfile(uid, profile){
    if(!uid) throw new Error('Missing uid');
    const data = Object.assign({}, profile || {}, { uid });
    if(cfg.authProvider === 'firebase' && cfg.firebase && cfg.firebase.apiKey){
      try{
        await ensureFirebase();
        if(!firebase.apps.length){ firebase.initializeApp(cfg.firebase); }
        const db = firebase.firestore();
        await db.collection('users').doc(uid).set(data, { merge: true });
        return { ok: true };
      }catch(e){ console.warn('upsertUserProfile firebase failed', e); }
    }
    try{
      localStorage.setItem(getLocalUserKey(uid), JSON.stringify(data));
      return { ok: true, local: true };
    }catch(e){ return { ok: false, error: String(e) }; }
  }

  async function ensureUserDoc(uid, defaults){
    const existing = await getUserProfile(uid);
    if(existing) return existing;
    await upsertUserProfile(uid, Object.assign({ createdAt: Date.now() }, defaults||{}));
    return await getUserProfile(uid);
  }

  window.DataStore = { saveAttempt, listAttempts, listAllAttempts, isAdmin, addSelfAsAdmin, getUserProfile, upsertUserProfile, ensureUserDoc };
})();
