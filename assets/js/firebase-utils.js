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

  /**
   * Load an external script dynamically
   * @param {string} src - Script URL
   * @returns {Promise<void>}
   */
  function loadScript(src) {
    if (loadedScripts.has(src)) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        loadedScripts.add(src);
        resolve();
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => {
        loadedScripts.add(src);
        resolve();
      };
      s.onerror = () => reject(new Error('Failed to load ' + src));
      document.head.appendChild(s);
    });
  }

  /**
   * Ensure Firebase SDK is loaded
   * @returns {Promise<void>}
   */
  async function ensureFirebase() {
    if (window.firebase && firebase.apps) return;
    await loadScript(`${FIREBASE_BASE_URL}/firebase-app-compat.js`);
    await loadScript(`${FIREBASE_BASE_URL}/firebase-auth-compat.js`);
    await loadScript(`${FIREBASE_BASE_URL}/firebase-firestore-compat.js`);
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
