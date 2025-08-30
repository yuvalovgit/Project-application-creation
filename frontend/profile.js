const backendURL = 'http://localhost:5000';

/* ---------------------- Utils ---------------------- */
function fixImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return backendURL + url;
}
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
let editBound = false;   // שלא יעשה binding פעמיים
let currentUser = null;  // ישמור את נתוני המשתמש שנטענו

/* Avoid double-binding for settings modal */
let settingsBound = false;

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
     currentUser = user;          // נשמור את המשתמש הגלובלי
    initEditProfileUI();         // נחבר את המודל של עריכת פרופיל

    // Show/hide controls based on own vs other profile
    const ownControls = document.getElementById('ownProfileControls');
    const otherControls = document.getElementById('otherProfileControls');

    if (isOwnProfile) {
      if (ownControls) ownControls.style.display = 'flex';
      if (otherControls) otherControls.style.display = 'none';
    } else {
      if (ownControls) ownControls.style.display = 'none';
      if (otherControls) otherControls.style.display = 'flex';
    }

    // Fill profile info
    document.getElementById('profileImage').src = user.avatar ? fixImageUrl(user.avatar) : 'default-avatar.png';
    document.getElementById('username').textContent = user.username;
    document.getElementById('bio').textContent = user.bio || '';
    document.getElementById('postsCount').textContent = `${user.postsCount || 0} posts`;
    document.getElementById('followersCount').textContent = `${user.followers.length} followers`;
    document.getElementById('followingCount').textContent = `${user.following.length} following`;

    // Edit/Upload buttons visibility (support id OR class)
    const editBtnById = document.getElementById('editProfileBtn');
    const editBtnByClass = qs('.edit-profile-btn');
    const uploadPostSidebarBtn = document.getElementById('uploadPostSidebarBtn');

    if (isOwnProfile) {
      setupProfileImageControls();
      editBtnById?.classList.remove('hidden');
      editBtnByClass?.classList.remove('hidden');
      uploadPostSidebarBtn?.classList.remove('hidden');

      // Bind settings + delete account (once)
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
  const isFollowing = user.followers.some(f => f._id === loggedInUserId);
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
        headers: { Authorization: `Bearer ${token}` }, // no Content-Type!
        body: formData
      });

      if (!res.ok) {
        alert('Failed to update profile image');
        return;
      }

      const data = await res.json();
      profileImage.src = fixImageUrl(data.avatar);
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

  const settingsBtn = qs('.settings-btn');                       // gear icon
  const settingsModal = document.getElementById('settingsModal'); // settings modal
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');

  const deleteAccountBtn = document.getElementById('deleteAccountBtn');       // button inside settings modal
  const deleteAccountModal = document.getElementById('deleteAccountModal');   // confirm modal
  const deleteConfirmInput = document.getElementById('deleteConfirmInput');
  const deleteAcknowledge = document.getElementById('deleteAcknowledge');
  const confirmDeleteAccountBtn = document.getElementById('confirmDeleteAccountBtn');
  const cancelDeleteAccountBtn = document.getElementById('cancelDeleteAccountBtn');

  const logoutBtn = document.getElementById('logoutBtn'); // << NEW

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

  // ===== LOGOUT (NEW) =====
  on(logoutBtn, 'click', async () => {
    try {
      // אם יש לך endpoint ל-logout בשרת, אפשר לנסות:
      // await fetch(`${backendURL}/api/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(()=>{});
    } finally {
      settingsModal?.classList.add('hidden');
      localStorage.removeItem('token');   // מנקה JWT
      alert('You have been logged out.');
      window.location.href = 'login.html'; // חזרה למסך התחברות
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
    // מילוי שדות מהמידע הנוכחי (אם חסר name בשרת, זה פשוט יישאר ריק)
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

  // שמירה
  saveBtn?.addEventListener('click', async () => {
    const username = (usernameInput?.value || '').trim();
    const name = (nameInput?.value || '').trim();
    const bio = (bioInput?.value || '').trim();

    if (!username) {
      alert('Username is required');
      return;
    }
    // ולידציה בסיסית לשם משתמש (ללא רווחים)
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
        body: JSON.stringify({
          // אם לשרת יש מפתח אחר לשם, אפשר לשנות כאן בהתאם (e.g. displayName)
          name,            // או fullName / displayName לפי ה־API שלך
          username,
          bio
        })
      });

      if (!res.ok) {
        const txt = await res.text().catch(()=>'');
        console.error('Update failed:', txt);
        alert('Failed to save changes');
        return;
      }

      const updated = await res.json();
      currentUser = updated;

      // עדכון UI מיידי
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

let selectedFile = null; // קובץ שנבחר

function openCreateModal() {
  resetCreateModal();
  createModal?.classList.remove('hidden');
}
function closeCreateModal() {
  createModal?.classList.add('hidden');
}
function resetCreateModal() {
  selectedFile = null;
  captionInput.value = '';
  createSubmitBtn.disabled = true;
  previewBox.innerHTML = `<span style="color:#9b9b9b;">No media selected</span>`;
}

/* פותח את המודל בלחיצה על CREATE */
uploadPostSidebarBtn?.addEventListener('click', openCreateModal);

/* סגירות */
closeCreateModalBtn?.addEventListener('click', closeCreateModal);
cancelCreateBtn?.addEventListener('click', closeCreateModal);
createModal?.addEventListener('click', (e)=>{ if(e.target===createModal) closeCreateModal(); });

/* בחירת קובץ דרך הקלט הקיים #postImageUpload */
pickMediaBtn?.addEventListener('click', () => postImageUpload?.click());

/* תצוגת מקדימה והפעלת כפתור Post */
postImageUpload?.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) {
    resetCreateModal();
    return;
  }
  selectedFile = file;
  createSubmitBtn.disabled = false;

  const url = URL.createObjectURL(file);
  // נחליט אם תמונה או וידאו
  const isImage = file.type.startsWith('image/');
  previewBox.innerHTML = isImage
    ? `<img src="${url}" alt="preview" class="preview-media" />`
    : `<video src="${url}" controls class="preview-media"></video>`;
});

/* ניקוי מדיה שנבחרה */
clearMediaBtn?.addEventListener('click', () => {
  if (postImageUpload) postImageUpload.value = '';
  resetCreateModal();
});

/* שליחה לשרת */
createSubmitBtn?.addEventListener('click', async () => {
  if (!selectedFile) return;

  const formData = new FormData();
  formData.append('file', selectedFile);     // ה־API אצלך מצפה ל־'file'
  formData.append('content', captionInput.value || '');

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

let currentPostId = null;

async function loadUserPosts() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;

    const res = await fetch(`${backendURL}/api/users/${userId}/posts`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      console.error('Failed to load user posts');
      return;
    }

    const posts = await res.json();
    postsGrid.innerHTML = '';

    posts.forEach(post => {
      const postDiv = document.createElement('div');
      postDiv.className = 'post';
      postDiv.innerHTML = `
        ${post.image ? `<img src="${fixImageUrl(post.image)}" class="post-image" />` : ''}
        ${post.video ? `<video src="${fixImageUrl(post.video)}" controls class="post-video"></video>` : ''}
        <div class="post-content">${post.content || ''}</div>
      `;

      postsGrid.appendChild(postDiv);
      if (post.image || post.video) {
        const clickable = postDiv.querySelector('img,video');
        clickable.style.cursor = 'pointer';
        clickable.addEventListener('click', () => loadAndOpenPost(post._id));
      }
    });
  } catch (error) {
    console.error(error);
  }
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
}async function openPostModal(post) {
  console.log("Opening modal with post:", post);

  // normalize paths from upLoads -> uploads
  if (post.image) post.image = post.image.replace("/upLoads/", "/uploads/");
  if (post.video) post.video = post.video.replace("/upLoads/", "/uploads/");

  currentPostId = post._id;

  // refs
  const postModal = document.getElementById('postModal');
  const postModalImage = document.getElementById('postModalImage');
  const postComments = document.getElementById('postComments');
  const postAuthorAvatar = document.getElementById('postAuthorAvatar');
  const postAuthorUsername = document.getElementById('postAuthorUsername');
  const likeBtn = document.getElementById('likeBtn');
  const likesCount = document.getElementById('likesCount');

  // -------- Media (left side) --------
  let mediaHtml = '';
  if (post.image && post.image !== 'null') {
    mediaHtml = `<img src="${fixImageUrl(post.image)}" alt="post media">`;
  } else if (post.video && post.video !== 'null') {
    mediaHtml = `<video src="${fixImageUrl(post.video)}" controls playsinline></video>`;
  } else {
    mediaHtml = `<div style="color:#fff; text-align:center;">No media found</div>`;
  }
  postModalImage.innerHTML = mediaHtml;

  // -------- Header (right top): avatar + username + caption --------
  postAuthorAvatar.src = post.author?.avatar ? fixImageUrl(post.author.avatar) : 'default-avatar.png';
  postAuthorUsername.textContent = post.author?.username || 'Unknown';

  const headerEl = postAuthorUsername.closest('.post-header');
  let textWrap = headerEl.querySelector('.author-text-wrap');
  if (!textWrap) {
    textWrap = document.createElement('div');
    textWrap.className = 'author-text-wrap'; // column layout via CSS
    const optionsBtn = headerEl.querySelector('.modal-options-btn');
    headerEl.insertBefore(textWrap, optionsBtn);
    textWrap.appendChild(postAuthorUsername);
  }

  // remove old caption (if exists)
  const oldCap = textWrap.querySelector('.caption-box');
  if (oldCap) oldCap.remove();

  // add caption (fallback across possible fields)
  const caption = (post.content || post.text || post.caption || post.description || '').trim();
  if (caption) {
    const capEl = document.createElement('div');
    capEl.className = 'caption-box';
    capEl.textContent = caption;
    textWrap.appendChild(capEl);
  }

  // -------- Comments --------
  postComments.innerHTML = (post.comments || [])
    .map(c => `
      <div class="comment">
        <img src="${c.author?.avatar ? fixImageUrl(c.author.avatar) : 'default-avatar.png'}" alt="avatar" class="comment-avatar">
        <div class="comment-body">
          <b>${c.author?.username || 'User'}</b>
          <span class="comment-text">${c.text}</span>
          <div class="comment-time">${moment(c.createdAt).fromNow()}</div>
        </div>
      </div>
    `)
    .join('');

  // -------- Likes --------
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

  // -------- Options (⋯) -> delete modal --------
  const optionsBtn = postModal.querySelector('.modal-options-btn');
  if (optionsBtn) optionsBtn.onclick = () => openDeleteModal(post._id);

  // -------- Show/close modal --------
  postModal.classList.remove('hidden');
  const closePostModalBtn = document.getElementById('closePostModalBtn');
  closePostModalBtn.onclick = () => {
    postModal.classList.add('hidden');
    loadUserPosts();
  };
  postModal.onclick = e => { if (e.target === postModal) postModal.classList.add('hidden'); };
}

function openDeleteModal(postId) {
  const deleteModal = document.getElementById('deleteModal');
  deleteModal.classList.remove('hidden');

  document.getElementById('confirmDeleteBtn').onclick = async () => {
    try {
      const res = await fetch(`${backendURL}/api/posts/${postId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Failed to delete post');
      deleteModal.classList.add('hidden');
      document.getElementById('postModal').classList.add('hidden');
      loadUserPosts();
    } catch (err) {
      alert('Error deleting post');
      console.error(err);
    }
  };

  document.getElementById('cancelDeleteBtn').onclick = () => {
    deleteModal.classList.add('hidden');
  };
}

/* ====================== Comments Form ====================== */
const commentForm = document.getElementById('commentForm');
commentForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const commentInput = document.getElementById('commentInput');
  const text = commentInput.value.trim();
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
    commentInput.value = '';
    const updatedPost = await res.json();
    openPostModal(updatedPost);
  } catch (err) {
    console.error(err);
    alert('Error adding comment');
  }
});
