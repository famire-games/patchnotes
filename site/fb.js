// Firebase 구글 로그인 + Firestore 즐겨찾기 (모든 페이지 공용). 페이지는 window.onUserChange(u, favList) 를 정의.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, getDocs, collection, query, orderBy, limit, serverTimestamp, deleteField } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
const app = initializeApp({
  apiKey: 'AIzaSyCKZqX7BuB2lLbBHfzgWQBuj4sFA4AGXxM',
  authDomain: 'patchnotes-web.firebaseapp.com',
  projectId: 'patchnotes-web',
  storageBucket: 'patchnotes-web.firebasestorage.app',
  messagingSenderId: '656526578409',
  appId: '1:656526578409:web:6846bafe40eac8881cd678'
});
const auth = getAuth(app), db = getFirestore(app);
let uid = null, uname = '';
window.FB = {
  login: () => signInWithPopup(auth, new GoogleAuthProvider()),
  logout: () => signOut(auth),
  saveFavs: (list) => uid ? setDoc(doc(db, 'users', uid), { favs: list }, { merge: true }) : Promise.resolve(),
  // 커뮤니티: patches/{pid}.stars = {uid: 1~5}, patches/{pid}/comments/{cid} = {uid,name,text,ts,up:{uid:true},down:{uid:true}}
  uid: () => uid,
  getStars: async (pid) => { const s = await getDoc(doc(db, 'patches', pid)); return (s.exists() && s.data().stars) || {}; },
  // n = 0 이면 내 별점 취소
  rate: (pid, n) => n ? setDoc(doc(db, 'patches', pid), { stars: { [uid]: n } }, { merge: true }) : updateDoc(doc(db, 'patches', pid), { ['stars.' + uid]: deleteField() }),
  comments: async (pid) => (await getDocs(query(collection(db, 'patches', pid, 'comments'), orderBy('ts', 'desc'), limit(200)))).docs.map(d => ({ id: d.id, ...d.data() })),
  addComment: (pid, text) => addDoc(collection(db, 'patches', pid, 'comments'), { uid, name: uname, text, ts: serverTimestamp(), up: {}, down: {} }),
  delComment: (pid, cid) => deleteDoc(doc(db, 'patches', pid, 'comments', cid)),
  // v = 1 좋아요, -1 싫어요, 0 취소 (한 사람은 둘 중 하나만)
  vote: (pid, cid, v) => updateDoc(doc(db, 'patches', pid, 'comments', cid), { ['up.' + uid]: v === 1 ? true : deleteField(), ['down.' + uid]: v === -1 ? true : deleteField() })
};
onAuthStateChanged(auth, async (u) => {
  uid = u ? u.uid : null; uname = u ? (u.displayName || '사용자') : '';
  let list = [];
  if (u) { try { const s = await getDoc(doc(db, 'users', u.uid)); list = (s.exists() && s.data().favs) || []; } catch (e) { console.error('즐겨찾기 불러오기 실패', e); } }
  window.__fbUser = [u, list];
  if (window.onUserChange) window.onUserChange(u, list);
});
