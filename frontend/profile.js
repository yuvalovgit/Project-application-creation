/* =========================================
   profile.js  —  Full, clean and working
   ========================================= */
const backendURL = 'http://localhost:5000';

/* -------- Shared media/search helpers -------- */
const DEFAULT_AVATAR_DATAURI =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="%23222222"/><circle cx="60" cy="45" r="22" fill="%23999"/><rect x="25" y="76" width="70" height="24" rx="12" fill="%23999"/></svg>';

function fixImageUrl(url, type = 'generic') {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
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

function escapeHtml(str='') {
  return String(str)
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#39;');
}

const authHeaders = (extra = {}) => ({ ...extra, Authorization: `Bearer ${localStorage.getItem('token')}` });
const groupCover = (g) => fixImageUrl(g.image || g.cover || '/uploads/default-cover.jpg', 'groupCover');
function isGroupPost(p){
  return !!(p?.group || p?.groupId || p?.group_id || (p?.group && p.group._id));
}


/* ---------------------- Small utils ---------------------- */
function getUserIdFromToken(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload)).id;
  } catch {
    return null;
  }
}
function qs(sel) { return document.querySelector(sel); }
function on(el, ev, fn) { if (el) el.addEventListener(ev, fn); }

/* ---------------------- Auth / Context ---------------------- */
const token = localStorage.getItem('token');
const urlParams = new URLSearchParams(window.location.search);
const userIdFromUrl = urlParams.get('userId');
const loggedInUserId = getUserIdFromToken(token);
const userId = userIdFromUrl || loggedInUserId;
const isOwnProfile = userId === loggedInUserId;

/* Flags */
let editBound = false;     // prevent double-bind (edit profile)
let settingsBound = false; // prevent double-bind (settings/delete)
let currentUser = null;    // keep loaded user for edit prefill
let currentPostId = null;  // used by comments/likes

/* DOM refs used across file */
const profileTabPosts  = document.getElementById('profileTabPosts');
const profileTabGroups = document.getElementById('profileTabGroups');
const panelProfilePosts = document.getElementById('panelProfilePosts');
const panelGroupPosts   = document.getElementById('panelGroupPosts');
const profilePostsGrid  = document.getElementById('profilePostsGrid');
const groupPostsGrid    = document.getElementById('groupPostsGrid');
const uploadPostSidebarBtn = document.getElementById('uploadPostSidebarBtn');
const postImageUpload = document.getElementById('postImageUpload');

/* Single DOMContentLoaded hook */
window.addEventListener('DOMContentLoaded', loadUserProfile);

/* ====================== Load Profile ====================== */
async function loadUserProfile() {
  try {
    if (!token || !userId) {
      alert('Please login first');
      window.location.href = 'login.html';
      return;
    }

    const res = await fetch(`${backendURL}/api/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      alert('Failed to load profile');
      return;
    }

    const user = await res.json();
    currentUser = user;

    initEditProfileUI();

    // Show/hide controls
    const ownControls = document.getElementById('ownProfileControls');
    const otherControls = document.getElementById('otherProfileControls');
    if (isOwnProfile) {
      ownControls && (ownControls.style.display = 'flex');
      otherControls && (otherControls.style.display = 'none');
    } else {
      ownControls && (ownControls.style.display = 'none');
      otherControls && (otherControls.style.display = 'flex');
    }

    // Fill profile info
  document.getElementById('profileImage').src = user.avatar ? fixImageUrl(user.avatar, 'avatar') : DEFAULT_AVATAR_DATAURI;
    document.getElementById('username').textContent = user.username;
    document.getElementById('bio').textContent = user.bio || '';
    document.getElementById('postsCount').textContent = `${user.postsCount || 0} posts`;
    document.getElementById('followersCount').textContent = `${(user.followers || []).length} followers`;
    document.getElementById('followingCount').textContent = `${(user.following || []).length} following`;

    // Buttons visibility
    const editBtnById = document.getElementById('editProfileBtn');
    const editBtnByClass = qs('.edit-profile-btn');
    if (isOwnProfile) {
      setupProfileImageControls();
      editBtnById?.classList.remove('hidden');
      editBtnByClass?.classList.remove('hidden');
      uploadPostSidebarBtn?.classList.remove('hidden');
      initSettingsAndDeleteUI();
    } else {
      editBtnById?.classList.add('hidden');
      editBtnByClass?.classList.add('hidden');
      uploadPostSidebarBtn?.classList.add('hidden');
      document.getElementById('photoControls')?.remove();
    }

    setupFollowButton(user);
    await loadUserPosts();
  } catch (error) {
    console.error(error);
    alert('Error loading profile');
  }
}

/* ====================== Follow Button ====================== */
function setupFollowButton(user) {
  const followBtn = document.getElementById('followBtn');
  if (!followBtn) return;

  if (isOwnProfile) {
    followBtn.style.display = 'none';
    return;
  }

  followBtn.style.display = 'inline-block';
  const isFollowing = (user.followers || []).some(f => f._id === loggedInUserId);
  followBtn.textContent = isFollowing ? 'Unfollow' : 'Follow';

  followBtn.onclick = async () => {
    try {
      const res = await fetch(`${backendURL}/api/users/${user._id}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        alert('Failed to update follow status');
        return;
      }
      loadUserProfile();
    } catch (e) {
      alert('Error updating follow status');
      console.error(e);
    }
  };
}

/* ====================== Profile Image Modal ====================== */
function setupProfileImageControls() {
  const profileModal = document.getElementById('profileModal');
  const uploadPhotoBtn = document.getElementById('uploadPhotoBtn');
  const removePhotoBtn = document.getElementById('removePhotoBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const imageUpload = document.getElementById('imageUpload');
  const profileImage = document.getElementById('profileImage');

  if (!profileModal || !profileImage) return;

  profileImage.addEventListener('click', e => {
    e.stopPropagation();
    profileModal.classList.remove('hidden');
  });

  uploadPhotoBtn?.addEventListener('click', () => {
    imageUpload?.click();
    profileModal.classList.add('hidden');
  });

  removePhotoBtn?.addEventListener('click', async () => {
    try {
      const res = await fetch(`${backendURL}/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ avatar: null })
      });
      if (!res.ok) throw new Error('Failed to remove avatar');

      profileImage.src = 'default-avatar.png';
      if (imageUpload) imageUpload.value = null;
      profileModal.classList.add('hidden');
      loadUserProfile();
    } catch (error) {
      alert('Error removing profile image');
      console.error(error);
    }
  });

  cancelBtn?.addEventListener('click', () => profileModal.classList.add('hidden'));
  profileModal.addEventListener('click', e => {
    if (e.target === profileModal) profileModal.classList.add('hidden');
  });

  imageUpload?.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await fetch(`${backendURL}/api/users/${userId}/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }, // do NOT set Content-Type with FormData
        body: formData
      });
      if (!res.ok) {
        alert('Failed to update profile image');
        return;
      }
      const data = await res.json();
      profileImage.src = fixImageUrl(data.avatar, 'avatar');
      profileModal.classList.add('hidden');
      loadUserProfile();
    } catch (error) {
      alert('Error updating profile image');
      console.error(error);
    }
  });
}

/* ====================== Settings + Delete Account ====================== */
function initSettingsAndDeleteUI() {
  if (settingsBound) return;
  settingsBound = true;

  const settingsBtn = qs('.settings-btn');
  const settingsModal = document.getElementById('settingsModal');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');

  const deleteAccountBtn = document.getElementById('deleteAccountBtn');
  const deleteAccountModal = document.getElementById('deleteAccountModal');
  const deleteConfirmInput = document.getElementById('deleteConfirmInput');
  const deleteAcknowledge = document.getElementById('deleteAcknowledge');
  const confirmDeleteAccountBtn = document.getElementById('confirmDeleteAccountBtn');
  const cancelDeleteAccountBtn = document.getElementById('cancelDeleteAccountBtn');

  const logoutBtn = document.getElementById('logoutBtn');

  // open/close settings
  on(settingsBtn, 'click', (e) => {
    e.stopPropagation();
    if (!isOwnProfile) return;
    settingsModal?.classList.remove('hidden');
  });
  on(closeSettingsBtn, 'click', () => settingsModal?.classList.add('hidden'));
  on(settingsModal, 'click', (e) => { if (e.target === settingsModal) settingsModal.classList.add('hidden'); });

  // open delete account confirm
  on(deleteAccountBtn, 'click', () => {
    settingsModal?.classList.add('hidden');
    if (deleteConfirmInput) deleteConfirmInput.value = '';
    if (deleteAcknowledge) deleteAcknowledge.checked = false;
    updateDeleteConfirmState();
    deleteAccountModal?.classList.remove('hidden');
  });

  function updateDeleteConfirmState() {
    const typedDelete = (deleteConfirmInput?.value || '').trim().toUpperCase() === 'DELETE';
    const ack = !!deleteAcknowledge?.checked;
    if (confirmDeleteAccountBtn) confirmDeleteAccountBtn.disabled = !(typedDelete && ack);
  }
  on(deleteConfirmInput, 'input', updateDeleteConfirmState);
  on(deleteAcknowledge, 'change', updateDeleteConfirmState);

  // perform delete
  on(confirmDeleteAccountBtn, 'click', async () => {
    try {
      if (!isOwnProfile) {
        alert('You can only delete your own account.');
        return;
      }
      const res = await fetch(`${backendURL}/api/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        console.error('Delete failed:', txt);
        alert('Failed to delete account');
        return;
      }
      localStorage.removeItem('token');
      alert('Your account has been deleted.');
      window.location.href = 'login.html';
    } catch (err) {
      console.error(err);
      alert('Error deleting account');
    }
  });

  // cancel delete
  on(cancelDeleteAccountBtn, 'click', () => deleteAccountModal?.classList.add('hidden'));
  on(deleteAccountModal, 'click', (e) => { if (e.target === deleteAccountModal) deleteAccountModal.classList.add('hidden'); });

  // logout
  on(logoutBtn, 'click', async () => {
    try {
      // optional: await fetch(`${backendURL}/api/auth/logout`, { method:'POST', headers:{ Authorization:`Bearer ${token}` } }).catch(()=>{});
    } finally {
      settingsModal?.classList.add('hidden');
      localStorage.removeItem('token');
      alert('You have been logged out.');
      window.location.href = 'login.html';
    }
  });
}

/* ====================== Edit Profile (name, username, bio) ====================== */
function initEditProfileUI() {
  if (editBound) return;
  editBound = true;

  const openBtn = document.getElementById('editProfileBtn') || document.querySelector('.edit-profile-btn');
  const modal = document.getElementById('editProfileModal');
  const closeBtn = document.getElementById('closeEditProfileBtn');
  const cancelBtn = document.getElementById('cancelEditProfileBtn');
  const saveBtn = document.getElementById('saveProfileBtn');

  const nameInput = document.getElementById('editNameInput');
  const usernameInput = document.getElementById('editUsernameInput');
  const bioInput = document.getElementById('editBioInput');

  function prefill() {
    if (nameInput) nameInput.value = currentUser?.name || currentUser?.fullName || '';
    if (usernameInput) usernameInput.value = currentUser?.username || '';
    if (bioInput) bioInput.value = currentUser?.bio || '';
  }

  function open() {
    if (!isOwnProfile) return;
    prefill();
    modal?.classList.remove('hidden');
  }
  function close() {
    modal?.classList.add('hidden');
  }

  openBtn?.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  cancelBtn?.addEventListener('click', close);
  modal?.addEventListener('click', (e) => { if (e.target === modal) close(); });

  // save
  saveBtn?.addEventListener('click', async () => {
    const username = (usernameInput?.value || '').trim();
    const name = (nameInput?.value || '').trim();
    const bio = (bioInput?.value || '').trim();

    if (!username) {
      alert('Username is required');
      return;
    }
    if (/\s/.test(username)) {
      alert('Username cannot contain spaces');
      return;
    }

    try {
      const res = await fetch(`${backendURL}/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, username, bio })
      });
      if (!res.ok) {
        const txt = await res.text().catch(()=> '');
        console.error('Update failed:', txt);
        alert('Failed to save changes');
        return;
      }

      const updated = await res.json();
      currentUser = updated;

      // immediate UI update
      document.getElementById('username').textContent = updated.username || username;
      const verifiedRow = document.querySelector('.profile-verified span');
      if (verifiedRow) verifiedRow.textContent = '@' + (updated.username || username);
      document.getElementById('bio').textContent = updated.bio ?? bio ?? '';

      close();
      alert('Profile updated');
    } catch (err) {
      console.error(err);
      alert('Error saving profile');
    }
  });
}

/* ======= CREATE POST modal logic ======= */
const createModal = document.getElementById('createPostModal');
const closeCreateModalBtn = document.getElementById('closeCreateModalBtn');
const cancelCreateBtn = document.getElementById('cancelCreateBtn');
const pickMediaBtn = document.getElementById('pickMediaBtn');
const clearMediaBtn = document.getElementById('clearMediaBtn');
const previewBox = document.getElementById('createPreview');
const captionInput = document.getElementById('createCaptionInput');
const createSubmitBtn = document.getElementById('createSubmitBtn');

let selectedFile = null;

function openCreateModal() {
  resetCreateModal();
  createModal?.classList.remove('hidden');
}
function closeCreateModal() {
  createModal?.classList.add('hidden');
}
function resetCreateModal() {
  selectedFile = null;
  if (captionInput) captionInput.value = '';
  if (createSubmitBtn) createSubmitBtn.disabled = true;
  if (previewBox) previewBox.innerHTML = `<span style="color:#9b9b9b;">No media selected</span>`;
}

/* open modal by sidebar "Create" */
uploadPostSidebarBtn?.addEventListener('click', openCreateModal);

/* close */
closeCreateModalBtn?.addEventListener('click', closeCreateModal);
cancelCreateBtn?.addEventListener('click', closeCreateModal);
createModal?.addEventListener('click', (e)=>{ if(e.target===createModal) closeCreateModal(); });

/* file chooser via #postImageUpload */
pickMediaBtn?.addEventListener('click', () => postImageUpload?.click());

/* preview + enable Post button */
postImageUpload?.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) {
    resetCreateModal();
    return;
  }
  selectedFile = file;
  if (createSubmitBtn) createSubmitBtn.disabled = false;

  const url = URL.createObjectURL(file);
  const isImage = file.type.startsWith('image/');
  if (previewBox) {
    previewBox.innerHTML = isImage
      ? `<img src="${url}" alt="preview" class="preview-media" />`
      : `<video src="${url}" controls class="preview-media"></video>`;
  }
});

/* send to server */
createSubmitBtn?.addEventListener('click', async () => {
  if (!selectedFile) return;

  const formData = new FormData();
  formData.append('file', selectedFile);
  formData.append('content', (captionInput?.value || ''));

  try {
    const res = await fetch(`${backendURL}/api/posts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: formData
    });
    if (!res.ok) {
      const txt = await res.text().catch(()=> '');
      console.error('Create post failed:', txt);
      alert('Failed to create post');
      return;
    }
    closeCreateModal();
    await loadUserPosts();
  } catch (err) {
    console.error(err);
    alert('Error creating post');
  }
});

/* ====================== Posts ====================== */
async function loadUserPosts() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;

    const res = await fetch(`${backendURL}/api/users/${userId}/posts`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) { console.error('Failed to load user posts'); return; }

    const posts = await res.json();

    // הפרדה: רגילים מול קבוצות
    const regular = [];
    const groups  = [];
    posts.forEach(p => (isGroupPost(p) ? groups : regular).push(p));

    // רינדור לשני הגרידים עם אותו סגנון שהיה לך
    renderPostsGrid(profilePostsGrid, regular);
    renderPostsGrid(groupPostsGrid, groups);

    // עדכון מונה הפוסטים למעלה – רק הרגילים (כמו שביקשת)
    const pc = document.getElementById('postsCount');
    if (pc) pc.textContent = `${regular.length} posts`;

  } catch (error) {
    console.error(error);
  }
}
function renderPostsGrid(container, posts){
  if (!container) return;
  container.innerHTML = '';

  posts.forEach(post => {
    const postDiv = document.createElement('div');
    postDiv.className = 'post';
    postDiv.innerHTML = `
      ${post.image ? `<img src="${fixImageUrl(post.image)}" class="post-image" />` : ''}
      ${post.video ? `<video src="${fixImageUrl(post.video)}" controls class="post-video"></video>` : ''}
      <div class="post-content">${escapeHtml(post.content || '')}</div>
    `;
    container.appendChild(postDiv);

    const clickable = postDiv.querySelector('img,video');
    if (clickable) {
      clickable.style.cursor = 'pointer';
      clickable.addEventListener('click', () => loadAndOpenPost(post._id));
    }
  });
}


async function loadAndOpenPost(postId) {
  try {
    const res = await fetch(`${backendURL}/api/posts/${postId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    if (!res.ok) throw new Error('Failed to fetch post');
    const post = await res.json();
    openPostModal(post);
  } catch (err) {
    console.error(err);
    alert('Error loading post');
  }
}

async function openPostModal(post) {
  // normalize upLoads -> uploads (if needed)
  if (post.image) post.image = post.image.replace("/upLoads/", "/uploads/");
  if (post.video) post.video = post.video.replace("/upLoads/", "/uploads/");

  currentPostId = post._id;

  const postModal = document.getElementById('postModal');
  const postModalImage = document.getElementById('postModalImage');
  const postComments = document.getElementById('postComments');
  const postAuthorAvatar = document.getElementById('postAuthorAvatar');
  const postAuthorUsername = document.getElementById('postAuthorUsername');
  const likeBtn = document.getElementById('likeBtn');
  const likesCount = document.getElementById('likesCount');

  // Media (left)
  let mediaHtml = '';
  if (post.image && post.image !== 'null') {
    mediaHtml = `<img src="${fixImageUrl(post.image)}" alt="post media">`;
  } else if (post.video && post.video !== 'null') {
    mediaHtml = `<video src="${fixImageUrl(post.video)}" controls playsinline></video>`;
  } else {
    mediaHtml = `<div style="color:#fff; text-align:center;">No media found</div>`;
  }
  if (postModalImage) postModalImage.innerHTML = mediaHtml;

  // Header (right): avatar + username + caption
  if (postAuthorAvatar) postAuthorAvatar.src = post.author?.avatar ? fixImageUrl(post.author.avatar, 'avatar') : 'default-avatar.png';
  if (postAuthorUsername) postAuthorUsername.textContent = post.author?.username || 'Unknown';

  const headerEl = postAuthorUsername?.closest('.post-header');
  let textWrap = headerEl?.querySelector('.author-text-wrap');
  if (headerEl && !textWrap) {
    textWrap = document.createElement('div');
    textWrap.className = 'author-text-wrap';
    const optionsBtn = headerEl.querySelector('.modal-options-btn');
    headerEl.insertBefore(textWrap, optionsBtn);
    textWrap.appendChild(postAuthorUsername);
  }

  // caption
  const oldCap = textWrap?.querySelector('.caption-box');
  if (oldCap) oldCap.remove();
  const caption = (post.content || post.text || post.caption || post.description || '').trim();
  if (caption && textWrap) {
    const capEl = document.createElement('div');
    capEl.className = 'caption-box';
    capEl.textContent = caption;
    textWrap.appendChild(capEl);
  }

  // Comments
  if (postComments) {
    postComments.innerHTML = (post.comments || [])
      .map(c => `
        <div class="comment">
          <img src="${c.author?.avatar ? fixImageUrl(c.author.avatar, 'avatar') : 'default-avatar.png'}" alt="avatar" class="comment-avatar">
          <div class="comment-body">
            <b>${escapeHtml(c.author?.username || 'User')}</b>
            <span class="comment-text">${escapeHtml(c.text || '')}</span>
            <div class="comment-time">${moment(c.createdAt).fromNow()}</div>
          </div>
        </div>
      `)
      .join('');
  }

  // Likes
  if (likeBtn && likesCount) {
    likeBtn.innerHTML = (post.likes || []).includes(userId)
      ? '<i class="fas fa-heart liked"></i>'
      : '<i class="far fa-heart"></i>';
    likesCount.textContent = `${(post.likes || []).length} likes`;

    likeBtn.onclick = async () => {
      try {
        const res = await fetch(`${backendURL}/api/posts/${post._id}/like`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (!res.ok) throw new Error('Failed to like');
        const updatedPost = await res.json();
        openPostModal(updatedPost); // refresh UI
      } catch (err) {
        console.error(err);
      }
    };
  }

  // Options (⋯) -> delete modal
  const optionsBtn = postModal?.querySelector('.modal-options-btn');
  if (optionsBtn) optionsBtn.onclick = () => openDeleteModal(post._id);

  // show/close modal
  postModal?.classList.remove('hidden');
  const closePostModalBtn = document.getElementById('closePostModalBtn');
  if (closePostModalBtn) {
    closePostModalBtn.onclick = () => {
      postModal?.classList.add('hidden');
      loadUserPosts();
    };
  }
  postModal?.addEventListener('click', (e) => { if (e.target === postModal) postModal.classList.add('hidden'); });
}

function openDeleteModal(postId) {
  const deleteModal = document.getElementById('deleteModal');
  deleteModal?.classList.remove('hidden');

  const confirmBtn = document.getElementById('confirmDeleteBtn');
  const cancelBtn  = document.getElementById('cancelDeleteBtn');

  if (confirmBtn) confirmBtn.onclick = async () => {
    try {
      const res = await fetch(`${backendURL}/api/posts/${postId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Failed to delete post');
      deleteModal?.classList.add('hidden');
      document.getElementById('postModal')?.classList.add('hidden');
      loadUserPosts();
    } catch (err) {
      alert('Error deleting post');
      console.error(err);
    }
  };

  if (cancelBtn) cancelBtn.onclick = () => deleteModal?.classList.add('hidden');
}

/* ====================== Comments Form ====================== */
const commentForm = document.getElementById('commentForm');
commentForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const commentInput = document.getElementById('commentInput');
  const text = (commentInput?.value || '').trim();
  if (!text || !currentPostId) return;

  try {
    const res = await fetch(`${backendURL}/api/posts/${currentPostId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ text })
    });
    if (!res.ok) throw new Error('Failed to add comment');
    if (commentInput) commentInput.value = '';
    const updatedPost = await res.json();
    openPostModal(updatedPost);
  } catch (err) {
    console.error(err);
    alert('Error adding comment');
  }
});

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

/* tab clicks */
document.getElementById('tabUsers')?.addEventListener('click', () => setActiveTab('users'));
document.getElementById('tabGroups')?.addEventListener('click', () => setActiveTab('groups'));

/* input & clear */
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
}
/* ===================== Followers / Following modal ===================== */

const followModalEl       = document.getElementById('followModal');
const followTitleEl       = document.getElementById('followModalTitle');
const followListEl        = document.getElementById('followList');
const followSearchInput   = document.getElementById('followSearchInput');
const closeFollowModalBtn = document.getElementById('closeFollowModalBtn');
const followRowTpl        = document.getElementById('followRowTpl');

document.getElementById('followersCount')?.addEventListener('click', () => openFollowModal('followers'));
document.getElementById('followingCount')?.addEventListener('click', () => openFollowModal('following'));
closeFollowModalBtn?.addEventListener('click', closeFollowModal);
followModalEl?.addEventListener('click', (e) => { if (e.target === followModalEl) closeFollowModal(); });

/** נשמור בזיכרון את רשימת העוקבים שאני עוקב אחריהם (שלי) כדי לצבוע כפתורי Follow/Following */
let myFollowingSet = null;

/** מצב מודל נוכחי */
let followModalState = { mode: 'followers', items: [], viewedUserId: userId };

/** דואג שיהיה לנו סט של מי שאני עוקב אחריו (אני = המשתמש המחובר) */
async function ensureMyFollowingSet() {
  if (myFollowingSet) return myFollowingSet;
  if (!loggedInUserId) return (myFollowingSet = new Set());
  try {
    const res = await fetch(`${backendURL}/api/users/${loggedInUserId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const me = res.ok ? await res.json() : null;
    myFollowingSet = new Set((me?.following || []).map(x => (typeof x === 'string' ? x : x?._id)));
  } catch {
    myFollowingSet = new Set();
  }
  return myFollowingSet;
}

/** מנרמל אובייקטים שהשרת מחזיר (followers/following) לצורה אחידה */
function normUsers(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(u => ({
    _id: String(u?._id || u?.id || u),
    username: u?.username || '',
    avatar: u?.avatar || u?.profileImage || '',
    fullName: u?.fullName || u?.name || '',
    bio: u?.bio || ''
  })).filter(u => u._id);
}

/** פותח את המודל, טוען רשימה מה־currentUser ומרנדר */
async function openFollowModal(mode) {
  await ensureMyFollowingSet();
  const viewed = currentUser; // נטען כבר ב-loadUserProfile()
  const items = normUsers(mode === 'followers' ? (viewed?.followers || []) : (viewed?.following || []));
  followModalState = { mode, items, viewedUserId: viewed?._id || userId };

  followTitleEl.textContent = mode === 'followers' ? 'Followers' : 'Following';
  followSearchInput.value = '';
  renderFollowList(items);

  followModalEl?.classList.remove('hidden');
}

function closeFollowModal() {
  followModalEl?.classList.add('hidden');
}

/** רינדור מלא של הרשימה */
function renderFollowList(items) {
  followListEl.innerHTML = '';
  if (!items.length) {
    followListEl.innerHTML = `<div class="empty" style="padding:14px;color:#aaa;">No results</div>`;
    return;
  }
  const frag = document.createDocumentFragment();
  items.forEach(u => frag.appendChild(buildFollowRow(u)));
  followListEl.appendChild(frag);
}

/** בונה שורה אחת ברשימת Follow */
function buildFollowRow(userObj) {
  const row = followRowTpl.content.firstElementChild.cloneNode(true);
  const avatarEl = row.querySelector('.row-avatar');
  const usernameEl = row.querySelector('.row-username');
  const subEl = row.querySelector('.row-sub');
  const actionBtn = row.querySelector('.row-action');

  avatarEl.src = avatarUrl(userObj.avatar);
  avatarEl.alt = userObj.username || 'user';
  usernameEl.textContent = userObj.username || 'user';
  subEl.textContent = userObj.fullName || userObj.bio || '';

  // לחיצה על כל השורה (חוץ מהכפתור) → מעבר לפרופיל
  row.addEventListener('click', (e) => {
    if (e.target.closest('.row-action')) return;
    location.href = `profile.html?userId=${encodeURIComponent(userObj._id)}`;
  });

  const isMe = userObj._id === loggedInUserId;
  let action = ''; // 'follow' | 'unfollow' | 'remove'

  if (isOwnProfile && followModalState.mode === 'followers' && !isMe) {
    // במודל Followers של עצמי – כמו אינסטגרם: כפתור Remove
    actionBtn.textContent = 'Remove';
    action = 'remove';
  } else {
    // אחרת – Follow/Following בהתאם אם אני עוקב אחרי המשתמש הזה
    const iFollow = myFollowingSet?.has(userObj._id);
    if (isMe) {
      actionBtn.style.display = 'none';
    } else if (iFollow) {
      actionBtn.textContent = 'Following';
      action = 'unfollow';
    } else {
      actionBtn.textContent = 'Follow';
      action = 'follow';
    }
  }

  actionBtn.onclick = async (e) => {
    e.stopPropagation();
    if (action === 'follow' || action === 'unfollow') {
      const ok = await toggleFollow(userObj._id);
      if (!ok) return;
      // עדכון סט מקומי + טקסט הכפתור
      const nowFollow = myFollowingSet.has(userObj._id);
      actionBtn.textContent = nowFollow ? 'Following' : 'Follow';
      action = nowFollow ? 'unfollow' : 'follow';
      // רענון קל של פרטי הפרופיל (מונה עוקבים/נעקבים)
      loadUserProfile();
    } else if (action === 'remove') {
      const ok = await removeFollower(userObj._id);
      if (ok) {
        row.remove();        // הסרה מה־UI
        loadUserProfile();   // לעדכן מונים
      }
    }
  };

  return row;
}

/** חיפוש בתוך המודל */
followSearchInput?.addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  const base = followModalState.items || [];
  if (!q) { renderFollowList(base); return; }
  const filtered = base.filter(u =>
    (u.username || '').toLowerCase().includes(q) ||
    (u.fullName || '').toLowerCase().includes(q)
  );
  renderFollowList(filtered);
});

/** Follow/Unfollow – כמו בקוד שלך: POST /api/users/:id/follow */
async function toggleFollow(targetUserId) {
  try {
    const res = await fetch(`${backendURL}/api/users/${targetUserId}/follow`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(await res.text().catch(()=>''));
    // הפיכה בסט המקומי
    if (myFollowingSet.has(targetUserId)) myFollowingSet.delete(targetUserId);
    else myFollowingSet.add(targetUserId);
    return true;
  } catch (err) {
    console.error('toggleFollow failed:', err);
    alert('Failed to update follow status');
    return false;
  }
}

/** Remove follower – צריך תמיכה מהשרת.
 * מנסה שני מסלולים מקובלים; אם אין – מציג הודעה.
 */
async function removeFollower(targetUserId) {
  const attempts = [
    { url: `${backendURL}/api/users/${targetUserId}/remove-follower`, method: 'POST' },
    { url: `${backendURL}/api/users/${loggedInUserId}/followers/${targetUserId}`, method: 'DELETE' }
  ];
  for (const a of attempts) {
    try {
      const res = await fetch(a.url, {
        method: a.method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });
      if (res.ok) return true;
    } catch (e) {
      // ננסה את המסלול הבא
    }
  }
  alert('Remove follower is not supported on the server yet.');
  return false;
}
function setActiveProfileTab(which){
  const isPosts = which === 'posts';
  profileTabPosts?.classList.toggle('active', isPosts);
  profileTabGroups?.classList.toggle('active', !isPosts);
  panelProfilePosts?.classList.toggle('hidden', !isPosts);
  panelGroupPosts?.classList.toggle('hidden', isPosts);
}

profileTabPosts?.addEventListener('click', () => setActiveProfileTab('posts'));
profileTabGroups?.addEventListener('click', () => setActiveProfileTab('groups'));

// ברירת מחדל: לשונית Posts
document.addEventListener('DOMContentLoaded', () => setActiveProfileTab('posts'));
