// firebase.js (ESM via CDN - sem build)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyDu23Yi1cn7gRxqvWrlauDkys676ti2dHc",
  authDomain: "roupinhas-atila.firebaseapp.com",
  projectId: "roupinhas-atila",
  storageBucket: "roupinhas-atila.firebasestorage.app",
  messagingSenderId: "345310836516",
  appId: "1:345310836516:web:3abde6eb393c3c610ca5b1",
  measurementId: "G-MNCC7DHQYH"
};

export const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Analytics pode falhar localmente (file://). Em produção funciona.
// Então protegemos com try/catch para não quebrar o app.
export let analytics = null;
try {
  analytics = getAnalytics(app);
} catch (e) {
  // ok
}
