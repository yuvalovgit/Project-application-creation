/***********************
 * create-group.js
 * - Open groups: anyone can join
 * - Join/Leave button swaps instantly after action
 ***********************/
const backendURL = 'http://localhost:5000';
const token = localStorage.getItem('token');
const userId = localStorage.getItem('userId');

// ------------ helpers ------------
const authHeaders = (extra = {}) => ({ ...extra, Authorization: `Bearer ${token}` });
const mustBeLoggedIn = () => {
  if (!token || !userId) { alert('Please log in first.'); return false; }
  return true;
};
const safeJson = (res) => res.json().catch(() => ({})).then(data => ({ ok: res.ok, status: res.status, data }));
const isMember = (group, uid) => (group.members || []).map(String).includes(String(uid));
const imgSrc = (group) => group.image ? backendURL + group.image : backendURL + '/uploads/default-avatar.png';

// ------------ modal ------------
const modal = document.getElementById('groupModal');
const openBtn = document.getElementById('openModalBtn');
const closeBtn = document.getElementById('closeModalBtn');

if (openBtn) openBtn.addEventListener('click', () => { if (mustBeLoggedIn()) modal.style.display = 'block'; });
if (closeBtn) closeBtn.addEventListener('click', () => (modal.style.display = 'none'));
window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

// ------------ create group ------------
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
    if (image) fd.append('image', image);

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

// ------------ render groups ------------
const container = document.getElementById('group-list');

function groupCardHTML(group) {
  const member = isMember(group, userId);
  return `
    <div class="group-item" data-id="${group._id}">
      <img src="${imgSrc(group)}" class="group-image" />
      <div class="group-name">
        <a class="open-group-link" href="create-post.html?groupId=${group._id}">
          ${group.name}
        </a>
      </div>
      <div class="group-category">#${group.topic || 'general'}</div>

      <div class="group-buttons">
        <button class="desc-btn">Show Description</button>
        ${member
          ? `<button class="leave-btn">Leave Group</button>`
          : `<button class="join-btn">Join Group</button>`}
        <button class="open-btn">Open Group</button>
      </div>

      <div class="group-description-box" style="display:none;">
        ${group.description || 'No description'}
      </div>
    </div>
  `;
}

async function loadGroups() {
  if (!container) return;
  try {
    const res = await fetch(`${backendURL}/api/groups`, { headers: authHeaders() });
    const { ok, data, status } = await safeJson(res);
    if (!ok) return alert(data?.error || `Failed to load groups (status ${status})`);

    const groups = Array.isArray(data) ? data : [];
    container.innerHTML = groups.map(groupCardHTML).join('');
  } catch (err) {
    console.error('Load groups error:', err);
    alert('Server error');
  }
}

// ------------ event delegation for Join/Leave/Open/Desc ------------
if (container) {
  container.addEventListener('click', async (e) => {
    const card = e.target.closest('.group-item');
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
        // swap button without full reload
        e.target.outerHTML = `<button class="leave-btn">Leave Group</button>`;
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
        // swap button without full reload
        e.target.outerHTML = `<button class="join-btn">Join Group</button>`;
        alert('Left group successfully');
      } catch (err) {
        console.error('Leave group error:', err);
        alert('Server error');
      }
    }
  });
}

// ------------ init ------------
document.addEventListener('DOMContentLoaded', loadGroups);
