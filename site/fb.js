// Firebase 구글 로그인 + Firestore 즐겨찾기 (모든 페이지 공용). 페이지는 window.onUserChange(u, favList) 를 정의.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
const app = initializeApp({
  apiKey: 'AIzaSyCKZqX7BuB2lLbBHfzgWQBuj4sFA4AGXxM',
  authDomain: 'patchnotes-web.firebaseapp.com',
  projectId: 'patchnotes-web',
  storageBucket: 'patchnotes-web.firebasestorage.app',
  messagingSenderId: '656526578409',
  appId: '1:656526578409:web:6846bafe40eac8881cd678'
});
const auth = getAuth(app), db = getFirestore(app);
let uid = null;
window.FB = {
  login: () => signInWithPopup(auth, new GoogleAuthProvider()),
  logout: () => signOut(auth),
  saveFavs: (list) => uid ? setDoc(doc(db, 'users', uid), { favs: list }, { merge: true }) : Promise.resolve()
};
onAuthStateChanged(auth, async (u) => {
  uid = u ? u.uid : null;
  let list = [];
  if (u) { try { const s = await getDoc(doc(db, 'users', u.uid)); list = (s.exists() && s.data().favs) || []; } catch (e) { console.error('즐겨찾기 불러오기 실패', e); } }
  window.__fbUser = [u, list];
  if (window.onUserChange) window.onUserChange(u, list);
});
