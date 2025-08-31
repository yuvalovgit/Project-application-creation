/***********************
 * create-group.js
 * - Open groups: anyone can join
 * - Join/Leave button swaps instantly after action
 ***********************/
const backendURL = 'http://localhost:5000';
const token = localStorage.getItem('token');
const userId = localStorage.getItem('userId');

/* ===================== Media helpers (same behavior as feed) ===================== */
// Default avatar as data URI (no network errors)
const DEFAULT_AVATAR_DATAURI =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="%23222222"/><circle cx="60" cy="45" r="22" fill="%23999"/><rect x="25" y="76" width="70" height="24" rx="12" fill="%23999"/></svg>';

function fixImageUrl(url, type = 'generic') {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;           // absolute http(s)
  if (url.startsWith('/uploads')) return backendURL + url;
  if (url.startsWith('uploads'))  return backendURL + '/' + url;

  const folder =
    type === 'avatar'     ? '/uploads/avatars/' :
    type === 'groupCover' ? '/uploads/covers/'  :
                             '/uploads/posts/';

  return backendURL + folder + url;
}

function avatarUrl(raw) {
  if (!raw || raw === 'null' || raw === 'undefined') return DEFAULT_AVATAR_DATAURI;
  if (/^(data:|blob:|https?:\/\/)/i.test(raw)) return raw;
  return fixImageUrl(raw, 'avatar');
}

const groupCover = (g) => fixImageUrl(g.image || g.cover || '/uploads/default-cover.jpg', 'groupCover');

// (Optional) tiny HTML escape
const escapeHtml = (str='') =>
  String(str).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
             .replaceAll('"','&quot;').replaceAll("'",'&#39;');


/* ===================== Generic helpers ===================== */
const authHeaders = (extra = {}) => ({ ...extra, Authorization: `Bearer ${token}` });
const mustBeLoggedIn = () => {
  if (!token || !userId) { alert('Please log in first.'); return false; }
  return true;
};
const safeJson = (res) => res.json().catch(() => ({})).then(data => ({ ok: res.ok, status: res.status, data }));
const isMember = (group, uid) => (group.members || []).map(String).includes(String(uid));


/* ===================== Modal (Create Group) ===================== */
const modal = document.getElementById('groupModal');
const openBtn = document.getElementById('openModalBtn');
const closeBtn = document.getElementById('closeModalBtn');

if (openBtn) openBtn.addEventListener('click', () => { if (mustBeLoggedIn()) modal.style.display = 'block'; });
if (closeBtn) closeBtn.addEventListener('click', () => (modal.style.display = 'none'));
window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

const createForm = document.getElementById('createGroupForm');
if (createForm) {
  createForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!mustBeLoggedIn()) return;

    const name = document.getElementById('group-name').value.trim();
    const description = document.getElementById('group-description').value.trim();
    const topic = document.getElementById('group-topic').value;
    const image = document.getElementById('group-image').files[0];

    if (!name || !description || !topic) return alert('Please fill all required fields.');

    const fd = new FormData();
    fd.append('name', name);
    fd.append('description', description);
    fd.append('topic', topic);
    if (image) fd.append('groupImage', image);

    try {
      const res = await fetch(`${backendURL}/api/groups/create`, {
        method: 'POST',
        headers: authHeaders(), // don't set Content-Type with FormData
        body: fd,
      });
      const { ok, data, status } = await safeJson(res);
      if (!ok) return alert(data?.error || `Failed to create group (status ${status})`);

      alert('Group created successfully');
      createForm.reset();
      modal.style.display = 'none';
      await loadGroups();
    } catch (err) {
      console.error('Create group error:', err);
      alert('Server error');
    }
  });
}


/* ===================== Render groups as horizontal shelves ===================== */
const topicsContainer = document.getElementById('topicsContainer');

// סדר הופעה מועדף; מה שלא ברשימה ייכנס ל-"other"
const TOPIC_ORDER = ['sports', 'music', 'technology', 'travel', 'general'];

function groupByTopic(groups){
  const map = new Map();
  for (const g of groups){
    const key = (g.topic || 'general').toLowerCase();
    const k = TOPIC_ORDER.includes(key) ? key : 'other';
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(g);
  }
  // סדר: לפי TOPIC_ORDER ואז other
  const sorted = [];
  for (const t of TOPIC_ORDER){ if (map.has(t)) sorted.push([t, map.get(t)]); }
  if (map.has('other')) sorted.push(['other', map.get('other')]);
  return sorted;
}

function groupCardHTML(group) {
  const member = isMember(group, userId);
  return `
    <div class="group-card" data-id="${group._id}">
      <img class="cover" src="${groupCover(group)}" alt="${escapeHtml(group.name || 'Group')}" />
      <div class="name" title="${escapeHtml(group.name)}">${escapeHtml(group.name)}</div>
      <div class="topic">#${escapeHtml(group.topic || 'general')}</div>

      <div class="btns">
        <button class="btn secondary desc-btn">Show Description</button>
        ${member
          ? `<button class="btn leave-btn">Leave</button>`
          : `<button class="btn join-btn">Join</button>`}
        <button class="btn secondary open-btn">Open</button>
      </div>

      <div class="group-description-box" style="display:none; text-align:center; color:#ccc; font-size:13px;">
        ${escapeHtml(group.description || 'No description')}
      </div>
    </div>
  `;
}

function rowHTML(topicKey, groups){
  const label = topicKey === 'other' ? 'other' : topicKey;
  const rowId  = `row-${topicKey}`;
  return `
    <div class="topic-row" data-topic="${topicKey}">
      <div class="row-header">
        <h3>#${escapeHtml(label)}</h3>
        <div class="count">${groups.length} groups</div>
      </div>
      <button class="scroll-btn left"  data-target="${rowId}" aria-label="Scroll left">‹</button>
      <button class="scroll-btn right" data-target="${rowId}" aria-label="Scroll right">›</button>
      <div class="scroller" id="${rowId}">
        ${groups.map(groupCardHTML).join('')}
      </div>
    </div>
  `;
}

async function loadGroups() {
  if (!topicsContainer) return;
  try {
    const res = await fetch(`${backendURL}/api/groups`, { headers: authHeaders() });
    const { ok, data, status } = await safeJson(res);
    if (!ok) return alert(data?.error || `Failed to load groups (status ${status})`);

    const groups = Array.isArray(data) ? data : [];
    const byTopic = groupByTopic(groups);
    topicsContainer.innerHTML = byTopic.map(([topic, list]) => rowHTML(topic, list)).join('');

    // לחבר גלילת עכבר/Drag וחצים לכל שורה
    document.querySelectorAll('.topic-row .scroller').forEach(wireHorizontalScroll);
    document.querySelectorAll('.topic-row .scroll-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-target');
        const el = document.getElementById(id);
        if (!el) return;
        const amount = Math.ceil(el.clientWidth * 0.8);
        el.scrollBy({ left: btn.classList.contains('left') ? -amount : amount, behavior: 'smooth' });
      });
    });

  } catch (err) {
    console.error('Load groups error:', err);
    alert('Server error');
  }
}

/* גלילה אופקית עם גלגלת + Drag with mouse */
function wireHorizontalScroll(el){
  // גלילה עם גלגלת (ממירה גלילה אנכית לאופקית)
  el.addEventListener('wheel', (evt) => {
    if (Math.abs(evt.deltaY) > Math.abs(evt.deltaX)) {
      el.scrollLeft += evt.deltaY;
      evt.preventDefault();
    }
  }, { passive:false });

  // Drag with mouse
  let isDown = false, startX = 0, scrollLeft = 0;
  el.addEventListener('mousedown', (e)=>{
    isDown = true; el.classList.add('dragging');
    startX = e.pageX - el.offsetLeft; scrollLeft = el.scrollLeft;
  });
  el.addEventListener('mouseleave', ()=>{ isDown=false; el.classList.remove('dragging'); });
  el.addEventListener('mouseup',   ()=>{ isDown=false; el.classList.remove('dragging'); });
  el.addEventListener('mousemove', (e)=>{
    if(!isDown) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX) * 1.2;
    el.scrollLeft = scrollLeft - walk;
  });
}

/* ===================== Events: Join / Leave / Open / Description (delegation) ===================== */
document.addEventListener('click', async (e) => {
  const card = e.target.closest('.group-card');
  if (!card) return;
  const groupId = card.dataset.id;

  // Toggle description
  if (e.target.classList.contains('desc-btn')) {
    const box = card.querySelector('.group-description-box');
    const visible = box.style.display === 'block';
    box.style.display = visible ? 'none' : 'block';
    e.target.textContent = visible ? 'Show Description' : 'Hide Description';
    return;
  }

  // Open group
  if (e.target.classList.contains('open-btn')) {
    window.location.href = `create-post.html?groupId=${groupId}`;
    return;
  }

  // Join
  if (e.target.classList.contains('join-btn')) {
    if (!mustBeLoggedIn()) return;
    try {
      const res = await fetch(`${backendURL}/api/groups/join`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ groupId }),
      });
      const { ok, data, status } = await safeJson(res);
      if (!ok) return alert(data?.error || `Failed to join group (status ${status})`);
      e.target.outerHTML = `<button class="btn leave-btn">Leave</button>`;
      alert('Joined group successfully');
    } catch (err) {
      console.error('Join group error:', err);
      alert('Server error');
    }
    return;
  }

  // Leave
  if (e.target.classList.contains('leave-btn')) {
    if (!mustBeLoggedIn()) return;
    try {
      const res = await fetch(`${backendURL}/api/groups/leave`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ groupId }),
      });
      const { ok, data, status } = await safeJson(res);
      if (!ok) return alert(data?.error || `Failed to leave group (status ${status})`);
      e.target.outerHTML = `<button class="btn join-btn">Join</button>`;
      alert('Left group successfully');
    } catch (err) {
      console.error('Leave group error:', err);
      alert('Server error');
    }
  }
});



/* ===================== Init ===================== */
document.addEventListener('DOMContentLoaded', loadGroups);


/* ===================== Search Drawer (Instagram-like) ===================== */
let searchMode = 'users'; // 'users' | 'groups'
let searchDebounceTimer = null;
let searchAbort = null;

function openUserSearchModal() {
  const overlay = document.getElementById('modalOverlay');
  const drawer  = document.getElementById('searchDrawer');
  if (!overlay || !drawer) return;

  overlay.style.display = 'block';
  drawer.style.display = 'flex';

  setActiveTab('users');

  const input = document.getElementById('searchInput');
  if (input) {
    input.value = '';
    const clr = document.getElementById('searchClearBtn');
    if (clr) clr.style.display = 'none';
    renderResults([], 'Start typing to search…');
    setTimeout(() => input.focus(), 0);
  }
}

function closeUserSearchModal() {
  const overlay = document.getElementById('modalOverlay');
  const drawer  = document.getElementById('searchDrawer');
  if (overlay) overlay.style.display = 'none';
  if (drawer)  drawer.style.display = 'none';
  renderResults([]);
}

function setActiveTab(type){
  searchMode = type;
  document.getElementById('tabUsers')?.classList.toggle('active', type==='users');
  document.getElementById('tabGroups')?.classList.toggle('active', type==='groups');
  const q = document.getElementById('searchInput')?.value.trim() || '';
  if (q) doSearch(q, searchMode); else renderResults([], 'Search '+type+'…');
}

// tab clicks
document.getElementById('tabUsers')?.addEventListener('click', () => setActiveTab('users'));
document.getElementById('tabGroups')?.addEventListener('click', () => setActiveTab('groups'));

// input & clear
document.getElementById('searchInput')?.addEventListener('input', (e)=>{
  const q = e.target.value;
  const clr = document.getElementById('searchClearBtn');
  if (clr) clr.style.display = q ? 'block' : 'none';
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(()=> doSearch(q.trim(), searchMode), 250);
});
document.getElementById('searchClearBtn')?.addEventListener('click', ()=>{
  const input = document.getElementById('searchInput');
  if (input) {
    input.value = '';
    document.getElementById('searchClearBtn').style.display = 'none';
    input.focus();
    renderResults([], 'Start typing to search…');
  }
});

async function doSearch(query, mode){
  if (!query){
    renderResults([], 'Start typing to search…');
    return;
  }

  if (searchAbort) searchAbort.abort();
  searchAbort = new AbortController();

  renderResults([], 'Searching…');

  try {
    const url = mode === 'groups'
      ? `${backendURL}/api/groups/search?name=${encodeURIComponent(query)}`
      : `${backendURL}/api/users/search?username=${encodeURIComponent(query)}`;

    const res = await fetch(url, { headers: authHeaders(), signal: searchAbort.signal });
    if (!res.ok) throw new Error('Search failed');
    const data = await res.json();
    renderResults(Array.isArray(data) ? data : [], (data && data.length) ? '' : 'No results.');
  } catch(e){
    if (e.name !== 'AbortError') {
      renderResults([], 'Error while searching.');
      console.error(e);
    }
  }
}

function renderResults(items, emptyMsg){
  const list = document.getElementById('searchResultsList');
  if (!list) return;

  if (!items || !items.length){
    list.innerHTML = `<div class="empty">${emptyMsg || 'No results.'}</div>`;
    return;
  }

  const rows = items.map(item => {
    if (searchMode === 'groups'){
      const cover = groupCover(item);
      const members = item.members?.length || 0;
      const href = `create-post.html?groupId=${encodeURIComponent(item._id)}`;
      return `
        <a class="result-row" href="${href}">
          <img class="result-avatar" src="${cover}" alt="${escapeHtml(item.name || 'Group')}" />
          <div class="result-meta">
            <div class="result-title">${escapeHtml(item.name || 'Group')}</div>
            <div class="result-sub">${members} members</div>
          </div>
        </a>`;
    } else {
      const avatar = avatarUrl(item.profileImage || item.avatar || item.image);
      const href   = `profile.html?userId=${encodeURIComponent(item._id)}`;
      return `
        <a class="result-row" href="${href}">
          <img class="result-avatar" src="${avatar}" alt="${escapeHtml(item.username || 'user')}" />
          <div class="result-meta">
            <div class="result-title">${escapeHtml(item.username || 'user')}</div>
            <div class="result-sub">${escapeHtml(item.fullName || item.bio || '')}</div>
          </div>
        </a>`;
    }
  }).join('');

  list.innerHTML = rows;
}/* ===================== My Groups Modal ===================== */
const myGroupsModal = document.getElementById('myGroupsModal');
const openMyGroupsBtn = document.getElementById('openMyGroupsBtn');
const closeMyGroupsBtn = document.getElementById('closeMyGroupsBtn');
const adminGroupsList = document.getElementById('adminGroupsList');
const joinedGroupsList = document.getElementById('joinedGroupsList');

// פתח את המודל
openMyGroupsBtn?.addEventListener('click', async () => {
  if (!mustBeLoggedIn()) return;
  myGroupsModal.style.display = 'block';
  await loadMyGroups();
});

// סגור את המודל
closeMyGroupsBtn?.addEventListener('click', () => {
  myGroupsModal.style.display = 'none';
});
window.addEventListener('click', (e) => {
  if (e.target === myGroupsModal) myGroupsModal.style.display = 'none';
});
// שליפת הקבוצות של המשתמש
async function loadMyGroups() {
  try {
    // 🔹 קריאה לקבוצות שאני אדמין
    const adminRes = await fetch(`${backendURL}/api/groups/admin`, { headers: authHeaders() });
    const { ok: okAdmin, data: dataAdmin } = await safeJson(adminRes);

    if (!okAdmin) {
      adminGroupsList.innerHTML = `<p style="color:#999;">Failed to load admin groups</p>`;
    } else {
      const adminGroups = Array.isArray(dataAdmin) ? dataAdmin : [];
      adminGroupsList.innerHTML = adminGroups.length
        ? adminGroups.map(renderGroupItem).join('')
        : `<p style="color:#999;">You haven’t created any groups yet</p>`;
    }

    // 🔹 קריאה לקבוצות שאני חבר בהן (אבל לא אדמין)
    const joinedRes = await fetch(`${backendURL}/api/groups/mine`, { headers: authHeaders() });
    const { ok: okJoined, data: dataJoined } = await safeJson(joinedRes);

    if (!okJoined) {
      joinedGroupsList.innerHTML = `<p style="color:#999;">Failed to load joined groups</p>`;
    } else {
      const joinedGroups = Array.isArray(dataJoined) ? dataJoined : [];

      // ✅ סינון החוצה קבוצות שאני האדמין שלהן
      const filteredJoined = joinedGroups.filter(g => String(g.admin) !== String(userId));

      joinedGroupsList.innerHTML = filteredJoined.length
        ? filteredJoined.map(renderGroupItem).join('')
        : `<p style="color:#999;">You haven’t joined any groups yet</p>`;
    }
  } catch (err) {
    console.error('❌ loadMyGroups error:', err);
    adminGroupsList.innerHTML = `<p style="color:#999;">Error loading groups</p>`;
    joinedGroupsList.innerHTML = `<p style="color:#999;">Error loading groups</p>`;
  }
}

// פונקציית עזר ליצירת HTML של קבוצה
function renderGroupItem(g) {
  const href = `create-post.html?groupId=${encodeURIComponent(g._id)}`;
  return `
    <div class="my-group-item">
      <img src="${groupCover(g)}" alt="${escapeHtml(g.name)}" class="my-group-cover"/>
      <div class="my-group-info">
        <div class="my-group-name">${escapeHtml(g.name)}</div>
        <div class="my-group-topic">#${escapeHtml(g.topic || 'general')}</div>
      </div>
      <a href="${href}" class="btn small">Open</a>
    </div>
  `;
}
