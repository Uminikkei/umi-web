// UMI — Registro / Login de clientes con Google + Firestore
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, getDocs
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

// ── Cupones de descuento (gestionados desde el panel) ───────────────────────
window.umiCupones = {};
(async function loadCupones(){
  try {
    const snap = await getDocs(collection(db, 'cupones'));
    snap.forEach(d => {
      const c = d.data();
      const codigo = String(c.codigo || d.id || '').trim().toUpperCase();
      if (codigo && c.active !== false) {
        window.umiCupones[codigo] = Number(c.descuento) || 0;
      }
    });
  } catch(e){ console.warn('[UMI] No se pudieron cargar cupones de Firestore', e); }
})();

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
  if ($('authBday')  && currentProfile && currentProfile.birthday) $('authBday').value = currentProfile.birthday;
  showView('authViewProfile');
}

const WELCOME_POINTS = 2000; // puntos de bienvenida por registrarse (una sola vez)

window.umiCompleteProfile = async function () {
  setErr('');
  const whats = ($('authWhats').value || '').trim();
  const bday  = ($('authBday').value || '').trim();
  const promos = $('authPromos').checked;
  const terms  = $('authTerms').checked;

  const digits = whats.replace(/\D/g, '');
  if (digits.length < 8) { setErr('Ingresa un WhatsApp válido (con código de país).'); return; }
  if (!bday) { setErr('Ingresa tu fecha de cumpleaños.'); return; }
  if (!terms) { setErr('Debes aceptar los términos para registrarte.'); return; }

  const isNew = !currentProfile;
  const points = isNew ? WELCOME_POINTS : (currentProfile.points || 0);

  const btn = $('authSubmitBtn'); if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }
  try {
    const ref = doc(db, 'clientes', currentUser.uid);
    await setDoc(ref, {
      uid: currentUser.uid,
      name: currentUser.displayName || '',
      email: currentUser.email || '',
      whatsapp: whats,
      birthday: bday,
      acceptsPromos: promos,
      acceptedTerms: true,
      points: points,
      welcomeGiven: true,
      createdAt: (currentProfile && currentProfile.createdAt) || serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });

    currentProfile = { uid: currentUser.uid, name: currentUser.displayName, email: currentUser.email, whatsapp: whats, birthday: bday, acceptsPromos: promos, points: points };
    updateAccountBtn();
    showDone(isNew);
  } catch (e) {
    console.error('[AUTH] save error:', e.code, e.message);
    setErr('No se pudo guardar tu registro. Intenta de nuevo.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Completar registro'; }
  }
};

// Suma puntos ganados y resta los canjeados tras una compra. Devuelve el nuevo saldo.
window.umiAddPoints = async function (earned, redeemed) {
  if (!currentUser || !currentProfile) return null;
  earned = Math.max(0, Math.round(earned || 0));
  redeemed = Math.max(0, Math.round(redeemed || 0));
  const nuevo = Math.max(0, (currentProfile.points || 0) - redeemed + earned);
  try {
    await updateDoc(doc(db, 'clientes', currentUser.uid), { points: nuevo, updatedAt: serverTimestamp() });
    currentProfile.points = nuevo;
    updateAccountBtn();
    return nuevo;
  } catch (e) {
    console.error('[AUTH] addPoints:', e.message);
    return null;
  }
};

function showDone(justRegistered) {
  if ($('authDoneTitle')) $('authDoneTitle').textContent = '¡Hola, ' + (firstName(currentProfile && currentProfile.name) || '') + '! 👋';
  if ($('authDoneSub'))   $('authDoneSub').textContent = justRegistered
    ? '¡Bienvenido! Te regalamos 2.000 puntos de bienvenida 🎉'
    : 'Tu cuenta UMI está activa.';
  if ($('authPoints'))    $('authPoints').textContent = '⭐ ' + ((currentProfile && currentProfile.points ? currentProfile.points : 0)).toLocaleString('es-CL') + ' puntos UMI';
  showView('authViewDone');
}

function firstName(n) { return (n || '').trim().split(' ')[0]; }

function updateAccountBtn() {
  const btn = $('ntbAccount');
  const mob = $('mobAccount');
  let label;
  if (currentProfile) {
    const pts = (currentProfile.points || 0).toLocaleString('es-CL');
    label = firstName(currentProfile.name) + ' · ⭐ ' + pts;
  } else if (currentUser) {
    label = 'Completar registro';
  } else {
    label = 'Iniciar sesión';
  }
  if (btn) {
    // Con perfil activo, el ícono de persona reemplaza al texto en el topbar
    btn.style.display = currentProfile ? 'none' : '';
    btn.textContent = label;
    btn.classList.toggle('ntb-account--pts', !!currentProfile);
  }
  // Puntos en dorado junto al ícono de persona
  const pts = $('ntbUserPts');
  if (pts) {
    if (currentProfile) {
      pts.textContent = '⭐ ' + (currentProfile.points || 0).toLocaleString('es-CL');
      pts.classList.remove('hidden');
    } else {
      pts.classList.add('hidden');
    }
  }
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
