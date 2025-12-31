(function(){
  const cfg = window.APP_CONFIG || {};
  let currentUser = null;
  const listeners = [];

  // Use shared utilities from firebase-utils.js
  const getDeviceId = () => window.FirebaseUtils?.getDeviceId() || 'local-' + Math.random().toString(36).slice(2);
  const ensureFirebase = () => window.FirebaseUtils?.ensureFirebase() || Promise.resolve();

  function emit(){
    listeners.forEach(cb=>{ try { cb(currentUser); } catch(e){} });
  }

  async function linkGoogle(){
    if(!(isFirebaseConfigured() && window.firebase && firebase.auth)) throw new Error('Firebase not configured');
    const user = firebase.auth().currentUser;
    if(!user) throw new Error('No authenticated user');
    const provider = new firebase.auth.GoogleAuthProvider();
    await user.linkWithPopup(provider);
    return true;
  }

  function isFirebaseConfigured(){
    const f = cfg && cfg.firebase;
    const ok = !!(f && f.apiKey && f.projectId && f.appId);
    const hasPlaceholder = typeof f?.apiKey === 'string' && f.apiKey.startsWith('YOUR_');
    return cfg.authProvider === 'firebase' && ok && !hasPlaceholder;
  }

  async function init(){
    if(isFirebaseConfigured()){
      await ensureFirebase();
      if(!firebase.apps.length){ firebase.initializeApp(cfg.firebase); }
      const auth = firebase.auth();
      auth.onAuthStateChanged(u=>{
        currentUser = u ? { uid: u.uid, displayName: u.displayName || '', email: u.email || '', phoneNumber: u.phoneNumber || '' } : null;
        emit();
      });
      return;
    }
    const savedName = localStorage.getItem('local_user_name');
    currentUser = savedName ? { uid: 'local:'+getDeviceId(), displayName: savedName, isLocal: true } : null;
    emit();
  }

  function getUser(){ return currentUser; }

  async function signInWithGoogle(){
    if(isFirebaseConfigured() && window.firebase && firebase.auth){
      const provider = new firebase.auth.GoogleAuthProvider();
      await firebase.auth().signInWithPopup(provider);
      return;
    }
    const name = prompt('Nhập tên của bạn để lưu kết quả trên thiết bị này:');
    if(name && name.trim()){
      currentUser = { uid: 'local:'+getDeviceId(), displayName: name.trim(), isLocal: true };
      localStorage.setItem('local_user_name', currentUser.displayName);
      emit();
    }
  }

  async function signInWithFacebook(){
    if(isFirebaseConfigured() && window.firebase && firebase.auth){
      const provider = new firebase.auth.FacebookAuthProvider();
      await firebase.auth().signInWithPopup(provider);
      return;
    }
    return signInWithGoogle();
  }

  let recaptchaVerifier = null;
  function ensureRecaptcha(containerId){
    const id = containerId || 'recaptcha-container';
    let el = document.getElementById(id);
    if(!el){
      el = document.createElement('div');
      el.id = id;
      el.style.position = 'fixed';
      el.style.bottom = '8px';
      el.style.right = '8px';
      el.style.zIndex = '2147483647';
      el.style.opacity = '0.01';
      document.body.appendChild(el);
    }
    if(!recaptchaVerifier){
      try{
        recaptchaVerifier = new firebase.auth.RecaptchaVerifier(id, { size: 'invisible' });
      }catch(e){ /* may already exist */ }
    }
    return recaptchaVerifier;
  }

  async function signInWithPhone(inputPhone){
    if(isFirebaseConfigured() && window.firebase && firebase.auth){
      const phone = inputPhone || (typeof window.swalPromptPhone === 'function' ? await window.swalPromptPhone() : prompt('Nhập số điện thoại (định dạng +84...):'));
      if(!phone) return;
      ensureRecaptcha('recaptcha-container');
      const confirmation = await firebase.auth().signInWithPhoneNumber(phone, recaptchaVerifier);
      const code = typeof window.swalPromptCode === 'function' ? await window.swalPromptCode() : prompt('Nhập mã xác minh (SMS) đã gửi tới số của bạn:');
      if(!code) return;
      await confirmation.confirm(code);
      return;
    }
    return signInWithGoogle();
  }

  async function signIn(){
    return signInWithGoogle();
  }

  async function signOut(){
    if(isFirebaseConfigured() && window.firebase && firebase.auth){
      await firebase.auth().signOut();
      return;
    }
    currentUser = null;
    emit();
  }

  function onChange(cb){ if(typeof cb === 'function') listeners.push(cb); }

  async function linkPhoneNumber(phone){
    if(!(isFirebaseConfigured() && window.firebase && firebase.auth)) throw new Error('Firebase not configured');
    const user = firebase.auth().currentUser;
    if(!user) throw new Error('No authenticated user');
    ensureRecaptcha('recaptcha-container');
    const confirmation = await user.linkWithPhoneNumber(phone, recaptchaVerifier);
    // Ask for code using prompt; higher-level UI may override with SweetAlert
    const code = typeof window.swalPromptCode === 'function' ? await window.swalPromptCode() : prompt('Nhập mã xác minh (SMS):');
    if(!code) throw new Error('Missing verification code');
    await confirmation.confirm(code);
    return true;
  }

  window.Auth = { init, getUser, signIn, signOut, onChange, signInWithGoogle, signInWithFacebook, signInWithPhone, linkPhoneNumber, linkGoogle };
})();
