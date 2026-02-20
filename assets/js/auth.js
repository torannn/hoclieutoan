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

  async function getFirebaseAuth(){
    if(!isFirebaseConfigured()) throw new Error('Firebase not configured');
    await ensureFirebase();
    if(!(window.firebase && firebase.auth)) throw new Error('Firebase Auth SDK not loaded');
    if(!firebase.apps.length){ firebase.initializeApp(cfg.firebase); }
    return firebase.auth();
  }

  async function linkGoogle(){
    const auth = await getFirebaseAuth();
    const user = auth.currentUser;
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

  let _initPromise = null;
  let _authListenerRegistered = false;

  async function init(){
    if(_initPromise) return _initPromise;
    _initPromise = _doInit();
    return _initPromise;
  }

  async function _doInit(){
    if(isFirebaseConfigured()){
      const auth = await getFirebaseAuth();
      
      // Handle redirect result (useful if returning from signInWithRedirect)
      try {
        await auth.getRedirectResult();
      } catch (e) {
        console.warn('Redirect sign-in error:', e);
        if(window.Swal) window.Swal.fire('Lỗi đăng nhập (Redirect)', e.message || 'Không thể hoàn tất đăng nhập.', 'error');
      }

      if(!_authListenerRegistered){
        _authListenerRegistered = true;
        return new Promise(resolve => {
          auth.onAuthStateChanged(u=>{
            currentUser = u ? { uid: u.uid, displayName: u.displayName || '', email: u.email || '', phoneNumber: u.phoneNumber || '' } : null;
            emit();
            resolve();
          });
        });
      }
      return;
    }
    const savedName = localStorage.getItem('local_user_name');
    currentUser = savedName ? { uid: 'local:'+getDeviceId(), displayName: savedName, isLocal: true } : null;
    emit();
  }

  function getUser(){ return currentUser; }

  async function signInWithGoogle(){
    if(isFirebaseConfigured()){
      const auth = await getFirebaseAuth();
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      // Detect in-app browsers (Messenger, Zalo, Facebook, Instagram)
      const ua = navigator.userAgent || '';
      const isInApp = /FBAN|FBAV|Zalo|Instagram/i.test(ua);
      
      // In-app browsers often block popups or show white screens -> Force redirect
      if (isInApp) {
        await auth.signInWithRedirect(provider);
        return;
      }

      try {
        await auth.signInWithPopup(provider);
      } catch (e) {
        console.warn('Google signInWithPopup error:', e);
        const code = (e && e.code) ? String(e.code) : '';
        if (code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request' || code === 'auth/popup-closed-by-user') {
          console.log('Popup blocked or closed, falling back to redirect...');
          await auth.signInWithRedirect(provider);
          return;
        }
        throw e;
      }
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
    if(isFirebaseConfigured()){
      const auth = await getFirebaseAuth();
      const provider = new firebase.auth.FacebookAuthProvider();
      
      const ua = navigator.userAgent || '';
      const isInApp = /FBAN|FBAV|Zalo|Instagram/i.test(ua);
      
      if (isInApp) {
        await auth.signInWithRedirect(provider);
        return;
      }
      
      try {
        await auth.signInWithPopup(provider);
      } catch (e) {
        const code = (e && e.code) ? String(e.code) : '';
        if (code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request') {
          await auth.signInWithRedirect(provider);
          return;
        }
        throw e;
      }
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
    if(isFirebaseConfigured()){
      const auth = await getFirebaseAuth();
      const phone = inputPhone || (typeof window.swalPromptPhone === 'function' ? await window.swalPromptPhone() : prompt('Nhập số điện thoại (định dạng +84...):'));
      if(!phone) return;
      ensureRecaptcha('recaptcha-container');
      const confirmation = await auth.signInWithPhoneNumber(phone, recaptchaVerifier);
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
    if(isFirebaseConfigured()){
      const auth = await getFirebaseAuth();
      await auth.signOut();
      return;
    }
    currentUser = null;
    emit();
  }

  function onChange(cb){ if(typeof cb === 'function') listeners.push(cb); }

  async function linkPhoneNumber(phone){
    const auth = await getFirebaseAuth();
    const user = auth.currentUser;
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
