// Firebase 구글 로그인 + Firestore 즐겨찾기 (모든 페이지 공용). 페이지는 window.onUserChange(u, favList) 를 정의.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, getDocs, collection, query, orderBy, limit, serverTimestamp, deleteField, writeBatch, where } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
const app = initializeApp({
  apiKey: 'AIzaSyCKZqX7BuB2lLbBHfzgWQBuj4sFA4AGXxM',
  authDomain: 'patchnotes-web.firebaseapp.com',
  projectId: 'patchnotes-web',
  storageBucket: 'patchnotes-web.firebasestorage.app',
  messagingSenderId: '656526578409',
  appId: '1:656526578409:web:6846bafe40eac8881cd678'
});
const auth = getAuth(app), db = getFirestore(app);
let admin = false, uid = null, prof = { nick: '', country: '' };
// 국가 = 접속 IP 로 서버(geo/ Cloudflare Worker)가 판정해 profiles/{uid}.country 에 기록. 사용자는 고를 수 없음
const GEO_URL = 'https://patchnotes-geo.famire-patchnotes.workers.dev';
async function detectCountry(u) {
  try {
    const r = await fetch(GEO_URL, { method: 'POST', headers: { authorization: 'Bearer ' + await u.getIdToken() } });
    const j = await r.json(); if (r.ok) return j.country || '';
    console.error('국가 판정 실패', j.error);
  } catch (e) { console.error('국가 판정 실패', e); }
  try { const s = await getDoc(doc(db, 'profiles', u.uid)); return (s.exists() && s.data().country) || ''; } catch (e) { return ''; }
}
window.FB = {
  login: () => signInWithPopup(auth, new GoogleAuthProvider()),
  logout: () => signOut(auth),
  saveFavs: (list) => uid ? setDoc(doc(db, 'users', uid), { favs: list }, { merge: true }) : Promise.resolve(),
  // 커뮤니티: patches/{pid}.stars = {uid: 1~5}, patches/{pid}/comments/{cid} = {uid,name,text,ts,up:{uid:true},down:{uid:true}}
  uid: () => uid,
  // 닉네임: users/{uid}.nick (활동은 닉네임으로만), 국가: profiles/{uid}.country (서버가 기록)
  profile: () => prof,
  isAdmin: () => admin,
  // 닉네임 중복 막기: nicks/{소문자 닉네임} = {uid} 를 같이 씀. 이미 남이 쓰면 규칙이 거절 → 'taken'
  saveProfile: async (nick) => {
    const key = nick.toLowerCase(), old = (prof.nick || '').toLowerCase();
    const cur = await getDoc(doc(db, 'nicks', key));
    if (cur.exists() && cur.data().uid !== uid) throw new Error('taken');
    const b = writeBatch(db);
    if (!cur.exists()) b.set(doc(db, 'nicks', key), { uid });
    if (old && old !== key) b.delete(doc(db, 'nicks', old));
    b.set(doc(db, 'users', uid), { nick }, { merge: true });
    try { await b.commit(); } catch (e) { if ((await getDoc(doc(db, 'nicks', key))).data()?.uid !== uid) throw new Error('taken'); throw e; }
    prof = { ...prof, nick };
  },
  getStars: async (pid) => { const s = await getDoc(doc(db, 'patches', pid)); const d = s.exists() ? s.data() : {}; return { stars: d.stars || {}, ctry: d.ctry || {} }; },
  // n = 0 이면 내 별점 취소
  rate: (pid, n) => n ? setDoc(doc(db, 'patches', pid), { stars: { [uid]: n }, ctry: { [uid]: prof.country || '' } }, { merge: true }) : updateDoc(doc(db, 'patches', pid), { ['stars.' + uid]: deleteField(), ['ctry.' + uid]: deleteField() }),
  comments: async (pid) => (await getDocs(query(collection(db, 'patches', pid, 'comments'), orderBy('ts', 'desc'), limit(200)))).docs.map(d => ({ id: d.id, ...d.data() })),
  // 평가(댓글)는 계정당 패치마다 1개: 문서 이름 = 내 uid. 이미 있으면 내용만 고침
  addComment: (pid, text) => setDoc(doc(db, 'patches', pid, 'comments', uid), { uid, name: prof.nick, country: prof.country || '', text, ts: serverTimestamp(), up: {}, down: {} }),
  // 평가 = 글 + 별점을 한 번에 (별점은 글이 있어야만 저장됨, 규칙도 검사)
  postReview: (pid, text, n, edit) => {
    const b = writeBatch(db), c = doc(db, 'patches', pid, 'comments', uid);
    if (edit) b.update(c, { text, ts: serverTimestamp() });
    else b.set(c, { uid, name: prof.nick, country: prof.country || '', text, ts: serverTimestamp(), up: {}, down: {} });
    b.set(doc(db, 'patches', pid), { stars: { [uid]: n }, ctry: { [uid]: prof.country || '' } }, { merge: true });
    return b.commit();
  },
  // 내 평가 지우기 = 글 + 별점 같이
  delMine: async (pid) => {
    const b = writeBatch(db);
    b.delete(doc(db, 'patches', pid, 'comments', uid));
    if ((await getDoc(doc(db, 'patches', pid))).data()?.stars?.[uid]) b.update(doc(db, 'patches', pid), { ['stars.' + uid]: deleteField(), ['ctry.' + uid]: deleteField() });
    return b.commit();
  },
  editComment: (pid, text) => updateDoc(doc(db, 'patches', pid, 'comments', uid), { text, ts: serverTimestamp() }),
  // 신고: reports/{pid~cid~내uid} (한 사람이 같은 글은 한 번만)
  report: (pid, cid, why) => setDoc(doc(db, 'reports', pid + '~' + cid + '~' + uid), { pid, cid, by: uid, why: why || '', ts: serverTimestamp() }),
  // 관리자: 신고 목록, 신고 지우기, 계정 정지(banned/{uid}) 와 해제
  reports: async () => (await getDocs(query(collection(db, 'reports'), orderBy('ts', 'desc'), limit(300)))).docs.map(d => ({ id: d.id, ...d.data() })),
  getComment: async (pid, cid) => { const s = await getDoc(doc(db, 'patches', pid, 'comments', cid)); return s.exists() ? { id: s.id, ...s.data() } : null; },
  delReport: (id) => deleteDoc(doc(db, 'reports', id)),
  ban: (who, why) => setDoc(doc(db, 'banned', who), { why: why || '', by: uid, ts: serverTimestamp() }),
  unban: (who) => deleteDoc(doc(db, 'banned', who)),
  bans: async () => (await getDocs(collection(db, 'banned'))).docs.map(d => ({ id: d.id, ...d.data() })),
  isBanned: () => prof.banned,
  delComment: (pid, cid) => deleteDoc(doc(db, 'patches', pid, 'comments', cid)),
  // v = 1 좋아요, -1 싫어요, 0 취소 (한 사람은 둘 중 하나만)
  vote: (pid, cid, v) => updateDoc(doc(db, 'patches', pid, 'comments', cid), { ['up.' + uid]: v === 1 ? true : deleteField(), ['down.' + uid]: v === -1 ? true : deleteField() })
};
onAuthStateChanged(auth, async (u) => {
  uid = u ? u.uid : null; prof = { nick: '', country: '' };
  let list = [];
  if (u) { try { const s = await getDoc(doc(db, 'users', u.uid)); const d = s.exists() ? s.data() : {}; list = d.favs || []; prof = { nick: d.nick || '', country: '' }; } catch (e) { console.error('즐겨찾기 불러오기 실패', e); } }
  admin = false;
  if (u) { try { prof.banned = (await getDoc(doc(db, 'banned', u.uid))).exists(); } catch (e) {} }
  if (u) { try { await getDoc(doc(db, 'admin', 'check')); admin = true; } catch (e) {} }
  if (u) prof.country = await detectCountry(u);
  window.__fbUser = [u, list];
  if (window.onUserChange) window.onUserChange(u, list);
});
