// UMI — Registro / Login de clientes con Google + Firestore
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCzwcCVQ0xPeGZbpjYT3CLsxYMqof6KyCE",
  authDomain: "umi-clientes.firebaseapp.com",
  projectId: "umi-clientes",
  storageBucket: "umi-clientes.firebasestorage.app",
  messagingSenderId: "103545801738",
  appId: "1:103545801738:web:4079b9f8ae474516f9a3f3",
  measurementId: "G-PS7JT1F1NV"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);
const provider = new GoogleAuthProvider();

// Estado del cliente actual (perfil de Firestore)
let currentUser = null;
let currentProfile = null;

// ── Helpers de UI ──────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
function showView(view) {
  ['authViewLogin', 'authViewProfile', 'authViewDone'].forEach(v => {
    const el = $(v); if (el) el.style.display = (v === view) ? 'block' : 'none';
  });
}
function setErr(msg) {
  ['authErr', 'authErr2'].forEach(id => { const e = $(id); if (e) e.textContent = msg || ''; });
}

window.umiOpenAuth = function () {
  const m = $('authModal'); if (!m) return;
  m.classList.add('open');
  // Elegir vista según estado
  if (!currentUser) showView('authViewLogin');
  else if (!currentProfile) prefillProfile();
  else showDone();
};
window.umiCloseAuth = function () { const m = $('authModal'); if (m) m.classList.remove('open'); };

window.umiLoginGoogle = async function () {
  setErr('');
  const btn = $('authGoogleBtn'); if (btn) btn.disabled = true;
  try {
    await signInWithPopup(auth, provider);
    // onAuthStateChanged se encarga del resto
  } catch (e) {
    console.error('[AUTH] login error:', e.code, e.message);
    setErr('No se pudo iniciar sesión. Intenta de nuevo.');
  } finally {
    if (btn) btn.disabled = false;
  }
};

window.umiLogout = async function () {
  try { await signOut(auth); } catch (e) { console.error('[AUTH] logout:', e.message); }
  window.umiCloseAuth();
};

function prefillProfile() {
  if ($('authName'))  $('authName').value  = currentUser.displayName || '';
  if ($('authEmail')) $('authEmail').value = currentUser.email || '';
  if ($('authWhats') && currentProfile && currentProfile.whatsapp) $('authWhats').value = currentProfile.whatsapp;
  showView('authViewProfile');
}

window.umiCompleteProfile = async function () {
  setErr('');
  const whats = ($('authWhats').value || '').trim();
  const promos = $('authPromos').checked;
  const terms  = $('authTerms').checked;

  const digits = whats.replace(/\D/g, '');
  if (digits.length < 8) { setErr('Ingresa un WhatsApp válido (con código de país).'); return; }
  if (!terms) { setErr('Debes aceptar los términos para registrarte.'); return; }

  const btn = $('authSubmitBtn'); if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }
  try {
    const ref = doc(db, 'clientes', currentUser.uid);
    await setDoc(ref, {
      uid: currentUser.uid,
      name: currentUser.displayName || '',
      email: currentUser.email || '',
      whatsapp: whats,
      acceptsPromos: promos,
      acceptedTerms: true,
      points: (currentProfile && currentProfile.points) || 0,
      createdAt: (currentProfile && currentProfile.createdAt) || serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });

    currentProfile = { uid: currentUser.uid, name: currentUser.displayName, email: currentUser.email, whatsapp: whats, acceptsPromos: promos, points: (currentProfile && currentProfile.points) || 0 };
    updateAccountBtn();
    showDone();
  } catch (e) {
    console.error('[AUTH] save error:', e.code, e.message);
    setErr('No se pudo guardar tu registro. Intenta de nuevo.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Completar registro'; }
  }
};

function showDone() {
  if ($('authDoneTitle')) $('authDoneTitle').textContent = '¡Hola, ' + (firstName(currentProfile && currentProfile.name) || '') + '! 👋';
  if ($('authDoneSub'))   $('authDoneSub').textContent = 'Tu cuenta UMI está activa.';
  if ($('authPoints'))    $('authPoints').textContent = (currentProfile && currentProfile.points ? currentProfile.points : 0) + ' puntos UMI';
  showView('authViewDone');
}

function firstName(n) { return (n || '').trim().split(' ')[0]; }

function updateAccountBtn() {
  const btn = $('ntbAccount');
  const mob = $('mobAccount');
  const label = currentProfile ? ('Hola, ' + (firstName(currentProfile.name) || 'cuenta')) : (currentUser ? 'Completar registro' : 'Iniciar sesión');
  if (btn) btn.textContent = label;
  if (mob) mob.textContent = label;
}

// ── Estado de sesión ───────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  currentProfile = null;
  if (user) {
    try {
      const snap = await getDoc(doc(db, 'clientes', user.uid));
      if (snap.exists()) currentProfile = snap.data();
    } catch (e) { console.error('[AUTH] perfil:', e.message); }
    updateAccountBtn();
    // Si el modal está abierto, avanzar a la vista correcta
    const m = $('authModal');
    if (m && m.classList.contains('open')) {
      if (currentProfile) showDone(); else prefillProfile();
    }
  } else {
    updateAccountBtn();
  }
});

// Exponer estado para el resto del sitio (ej. checkout / puntos en el futuro)
window.umiGetUser = () => currentUser;
window.umiGetProfile = () => currentProfile;
window.umiIsRegistered = () => !!(currentUser && currentProfile);
