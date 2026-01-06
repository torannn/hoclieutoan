/**
 * firebase-utils.js - Shared Firebase initialization utilities
 * Consolidates duplicate code from auth.js and data.js
 */
(function() {
  'use strict';

  const FIREBASE_VERSION = '10.12.2';
  const FIREBASE_BASE_URL = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;

  // Track loaded scripts to prevent duplicate loading
  const loadedScripts = new Set();
  const scriptPromises = new Map();
  let ensurePromise = null;

  function waitFor(testFn, timeoutMs) {
    const limit = typeof timeoutMs === 'number' ? timeoutMs : 15000;
    const start = Date.now();
    return new Promise((resolve, reject) => {
      const tick = () => {
        try {
          if (testFn()) return resolve();
        } catch (e) {
        }
        if (Date.now() - start >= limit) return reject(new Error('Timed out'));
        setTimeout(tick, 50);
      };
      tick();
    });
  }

  /**
   * Load an external script dynamically
   * @param {string} src - Script URL
   * @returns {Promise<void>}
   */
  function loadScript(src) {
    if (loadedScripts.has(src)) {
      return Promise.resolve();
    }
    if (scriptPromises.has(src)) {
      return scriptPromises.get(src);
    }
    const p = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        if (existing.getAttribute('data-loaded') === '1') {
          loadedScripts.add(src);
          resolve();
          return;
        }
        const onLoad = () => {
          try { existing.setAttribute('data-loaded', '1'); } catch (e) {}
          loadedScripts.add(src);
          resolve();
        };
        const onError = () => {
          scriptPromises.delete(src);
          reject(new Error('Failed to load ' + src));
        };
        existing.addEventListener('load', onLoad, { once: true });
        existing.addEventListener('error', onError, { once: true });
        waitFor(() => existing.getAttribute('data-loaded') === '1', 15000).then(resolve).catch(() => {
          scriptPromises.delete(src);
          reject(new Error('Timed out loading ' + src));
        });
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => {
        try { s.setAttribute('data-loaded', '1'); } catch (e) {}
        loadedScripts.add(src);
        resolve();
      };
      s.onerror = () => {
        scriptPromises.delete(src);
        reject(new Error('Failed to load ' + src));
      };
      document.head.appendChild(s);
      waitFor(() => loadedScripts.has(src), 15000).then(resolve).catch(() => {
        scriptPromises.delete(src);
        reject(new Error('Timed out loading ' + src));
      });
    });
    scriptPromises.set(src, p);
    return p;
  }

  /**
   * Ensure Firebase SDK is loaded
   * @returns {Promise<void>}
   */
  async function ensureFirebase() {
    if (window.firebase && firebase.apps) return;
    if (ensurePromise) return ensurePromise;
    ensurePromise = (async () => {
      await loadScript(`${FIREBASE_BASE_URL}/firebase-app-compat.js`);
      await waitFor(() => window.firebase && firebase.apps, 15000);
      await loadScript(`${FIREBASE_BASE_URL}/firebase-auth-compat.js`);
      await waitFor(() => window.firebase && firebase.auth, 15000);
      await loadScript(`${FIREBASE_BASE_URL}/firebase-firestore-compat.js`);
      await waitFor(() => window.firebase && firebase.firestore, 15000);
    })();
    try {
      await ensurePromise;
    } catch (e) {
      ensurePromise = null;
      throw e;
    }
  }

  /**
   * Initialize Firebase app if not already initialized
   * @param {object} config - Firebase configuration
   * @returns {firebase.app.App}
   */
  function initializeApp(config) {
    if (!window.firebase) {
      console.warn('Firebase SDK not loaded');
      return null;
    }
    if (!firebase.apps.length) {
      return firebase.initializeApp(config);
    }
    return firebase.apps[0];
  }

  /**
   * Check if Firebase is properly configured
   * @param {object} cfg - App config object
   * @returns {boolean}
   */
  function isFirebaseConfigured(cfg) {
    const f = cfg && cfg.firebase;
    const ok = !!(f && f.apiKey && f.projectId && f.appId);
    const hasPlaceholder = typeof f?.apiKey === 'string' && f.apiKey.startsWith('YOUR_');
    return cfg.authProvider === 'firebase' && ok && !hasPlaceholder;
  }

  /**
   * Get or generate a device ID for local identification
   * @returns {string}
   */
  function getDeviceId() {
    try {
      let id = localStorage.getItem('device_id');
      if (!id) {
        id = Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem('device_id', id);
      }
      return id;
    } catch (e) {
      return 'dev-' + Math.random().toString(36).slice(2);
    }
  }

  // Expose utilities globally
  window.FirebaseUtils = {
    loadScript,
    ensureFirebase,
    initializeApp,
    isFirebaseConfigured,
    getDeviceId
  };
})();
