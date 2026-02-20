window.APP_CONFIG = {
  authProvider: "firebase",
  // Luôn trỏ về backend local port 3001 trừ khi đã deploy lên domain thật
  apiBaseUrl: (location.hostname.includes('firebaseapp.com') || location.hostname.includes('vercel.app')) 
    ? '' 
    : 'http://localhost:3001',
  firebase: {
    apiKey: "AIzaSyApy7eUYpOc_iz9UREFdVG_aJ1NiCk2PNg",
    authDomain: "hoclieutoan-4dbc6.firebaseapp.com",
    projectId: "hoclieutoan-4dbc6",
    appId: "1:27574926329:web:7589c485e15b3204065b28"
  },
  adminEmails: [
     "dauvanhuyhoang2001@gmail.com"
  ],
  adminLocalNames: [
    "dauvanhuyhoang2001"
  ]
};

console.log('✅ APP_CONFIG loaded. API Base URL:', window.APP_CONFIG.apiBaseUrl); 
