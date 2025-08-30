const backendURL = 'http://localhost:5000';

const token    = localStorage.getItem('token');
const userId   = localStorage.getItem('userId');
const urlParams = new URLSearchParams(window.location.search);
const groupId  = urlParams.get('groupId');

function escapeHtml(str='') {
  return String(str)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#39;');
}

// ---- Auth guard (groupId is OPTIONAL) ----
if (!token || !userId) {
  alert('Please log in again');
  localStorage.clear();
  window.location.href = 'login.html';
}

// ---- URL/media helpers ----
function fixImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (!url.startsWith('/')) url = '/uploads/posts/' + url;
  return backendURL + url;
}

const DEFAULT_AVATAR = fixImageUrl('/uploads/default-avatar.png');
const DEFAULT_COVER  = fixImageUrl('/uploads/default-cover.jpg');

// ---- Elements we might hide in create-only mode ----
const groupContainer   = document.querySelector('.group-container');
const sectionTitle     = document.querySelector('.section-title'); // "Group Feed"
const groupPostsFeed   = document.getElementById('groupPostsFeed');

// ---- Page bootstrap ----
window.addEventListener('DOMContentLoaded', () => {
  if (groupId) {
    // Full group profile + feed
    loadGroupProfile();
  } else {
    // Create-only mode (no group context)
    enterCreateOnlyMode();
  }
});

// =====================================================
// ===============  CREATE-ONLY MODE  ==================
// =====================================================
function enterCreateOnlyMode() {
  // Hide group UI
  if (groupContainer) groupContainer.style.display = 'none';
  if (groupPostsFeed) groupPostsFeed.style.display = 'none';
  if (sectionTitle) sectionTitle.textContent = 'Create a New Post';

  // Nothing else to load; posting will skip the "group" field.
}

// =====================================================
// ===============  GROUP PROFILE MODE  ================
// =====================================================
let currentGroup = null;
let isAdmin = false;


async function loadGroupProfile() {
  try {
    const res = await fetch(`${backendURL}/api/groups/${groupId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });


    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to load group (${res.status}): ${text}`);
    }

    const group = await res.json();
    currentGroup = group;

    // --- נרמול מזהים ---
    const toId = v => (v && typeof v === 'object' ? v._id : v);
    const adminId = group.admin ? String(toId(group.admin)) : null;
    const memberIds = Array.isArray(group.members) ? group.members.map(m => String(toId(m))) : [];

    // --- סטטוסים ---
    isAdmin = !!adminId && adminId === String(userId);
    const isMember = memberIds.includes(String(userId));

    // --- DOM refs ---
    const imgEl        = document.getElementById('groupImage');
    const coverEl      = document.getElementById('groupCoverImage');
    const nameEl       = document.getElementById('groupName');
    const descEl       = document.getElementById('groupDescription');
    const topicEl      = document.getElementById('groupCategory');
    const membersEl    = document.getElementById('groupMembersCount');
    const postsCountEl = document.getElementById('groupPostsCount');
    const adminInfoEl  = document.getElementById('adminInfo');
    const joinBtn      = document.getElementById('joinLeaveBtn');
    const editBtn      = document.getElementById('editGroupBtn');
    const deleteBtn    = document.getElementById('deleteGroupBtn'); // הוסף ב‑HTML אם חסר

    // --- מילוי UI בסיסי ---
    if (imgEl)   imgEl.src   = group.image ? fixImageUrl(group.image) : DEFAULT_AVATAR;
    if (coverEl) coverEl.src = group.cover ? fixImageUrl(group.cover) : DEFAULT_COVER;

    if (nameEl)  nameEl.textContent = group.name || '';
    if (descEl)  descEl.textContent = group.description || '';
    if (topicEl) topicEl.textContent = `#${group.topic || 'general'}`;

    if (membersEl)    membersEl.textContent = memberIds.length;
    if (postsCountEl) postsCountEl.textContent = Array.isArray(group.posts) ? group.posts.length : (group.posts || 0);

    // --- מידע אדמין ---
    if (adminInfoEl) {
      if (isAdmin) {
        adminInfoEl.textContent = 'You are the admin of this group';
        adminInfoEl.style.color = '#1c8a00';
      } else if (group.admin && typeof group.admin === 'object') {
        adminInfoEl.textContent = `Admin: ${group.admin.username || 'N/A'}`;
        adminInfoEl.style.color = '#777';
      } else {
        adminInfoEl.textContent = 'Admin: N/A';
        adminInfoEl.style.color = '#777';
      }
    }

    // --- Join/Leave ---
    if (joinBtn) {
      const setJoinUi = (member) => {
        joinBtn.textContent = member ? 'Leave Group' : 'Join Group';
        joinBtn.dataset.state = member ? 'leave' : 'join';
      };
      setJoinUi(isMember);


      joinBtn.onclick = async () => {
        try {
          joinBtn.disabled = true;
          if (joinBtn.dataset.state === 'join') await joinGroup(groupId);
          else await leaveGroup(groupId);
          await loadGroupProfile();
        } finally {
          joinBtn.disabled = false;
        }
      };
    }

    // --- עריכה (אדמין בלבד) ---
    if (editBtn) {
      if (isAdmin) {
        editBtn.style.display = 'inline-block';
        editBtn.onclick = openEditModal;
      } else {
        editBtn.style.display = 'none';
        editBtn.onclick = null;
      }
    }

    // --- מחיקת קבוצה (אדמין בלבד) ---
    if (deleteBtn) {
      if (isAdmin) {
        deleteBtn.style.display = 'inline-block';
        deleteBtn.onclick = async () => {
          if (!confirm('Are you sure you want to delete this group? This cannot be undone.')) return;
          const delRes = await fetch(`${backendURL}/api/groups/${groupId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!delRes.ok) {
            const t = await delRes.text();
            alert(`Failed to delete group: ${t}`);
            return;
          }
          alert('Group deleted successfully');
          location.href = 'creation-group.html';
        };
      } else {
        deleteBtn.style.display = 'none';
        deleteBtn.onclick = null;
      }
    }

    // --- החלפת תמונות (אדמין בלבד) ---
    if (isAdmin) {
      if (imgEl) {
        imgEl.onclick = () => {
          currentImageType = 'profile';
          modalTitle.innerText = 'Change Profile Photo';
          modalOverlay.classList.remove('hidden');
        };
      }
      if (coverEl) {
        coverEl.onclick = () => {
          currentImageType = 'cover';
          modalTitle.innerText = 'Change Cover Photo';
          modalOverlay.classList.remove('hidden');
        };
      }
      uploadPhotoBtn.onclick = () => {
        modalOverlay.classList.add('hidden');
        (currentImageType === 'profile' ? profileFileInput : coverFileInput).click();
      };
      removePhotoBtn.onclick = () => {
        modalOverlay.classList.add('hidden');
        removeImage(currentImageType);
      };
    } else {
      if (imgEl)   imgEl.onclick = null;
      if (coverEl) coverEl.onclick = null;
    }

    // --- פוסטים של הקבוצה ---

    await loadGroupPosts();
  } catch (err) {
    console.error('loadGroupProfile error:', err);
    alert('Error loading group profile');
  }
}









async function loadGroupPosts() {
  try {
    const res = await fetch(`${backendURL}/api/groups/${groupId}/posts`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to load posts');
    const posts = await res.json();

    const postsGrid = document.getElementById('groupPostsFeed');
    postsGrid.innerHTML = '';

    posts.slice().reverse().forEach(post => {
      const postEl = document.createElement('div');
      postEl.className = 'group-post';


      const postId = typeof post._id === 'object' ? post._id.toString() : post._id;
      const isLiked = Array.isArray(post.likes) && post.likes.includes(userId);

      const likeIconClass = isLiked ? 'fas' : 'far';

      const lastComments = (post.comments || []).slice(-2).map(c => `
        <div class="single-comment">
          <strong>${c.author?.username || 'User'}</strong> ${c.text}
        </div>
      `).join('');

      // --- מחבר נתוני מחבר הפוסט ---
      const authorId   = post.author?._id || '';
      const authorName = post.author?.username || 'Unknown';

      // מנסה שדות שונים לתמונת פרופיל, עם ברירת מחדל
      const rawAvatar =
        post.author?.profileImage ||
        post.author?.avatar ||
        post.author?.image ||
        post.author?.profilePicture ||
        post.author?.avatarUrl ||
        '/uploads/default-avatar.png';

      const authorImg  = fixImageUrl(rawAvatar);
      const profileUrl = authorId ? `profile.html?userId=${encodeURIComponent(authorId)}` : '#';

      // --- בניית הפוסט ---
   postEl.innerHTML = `
  <div class="post-header" style="display:flex;align-items:center;gap:10px;padding:8px 10px;">
    <img src="${authorImg}"
         alt="${authorName}"
         class="avatar"
         style="width:35px;height:35px;border-radius:50%;object-fit:cover;cursor:pointer;"
         onclick="window.location.href='${profileUrl}'"
         onerror="this.onerror=null; this.src='${fixImageUrl('/uploads/default-avatar.png')}';" />

    <a href="${profileUrl}"
       class="post-author-link"
       style="color:#000;font-weight:600;text-decoration:none;cursor:pointer;">
      ${authorName}
    </a>

    <span class="post-time" style="color:#777;font-size:12px;margin-left:auto;">
      ${post.createdAt ? new Date(post.createdAt).toLocaleString() : ''}
    </span>

    ${
      (authorId && authorId === userId)
      ? `
        <button class="post-options-btn" aria-haspopup="menu" aria-expanded="false" data-post="${postId}">⋯</button>
        <div class="post-menu hidden" id="post-menu-${postId}">
          <button class="menu-edit"   data-post="${postId}" data-caption="${escapeHtml(post.content || '')}">Edit caption</button>
          <button class="menu-delete" data-post="${postId}">Delete</button>
        </div>
      `
      : ''
    }
  </div>

  ${post.image ? `<img src="${fixImageUrl(post.image)}" class="post-media" />` : ''}
  ${post.video ? `<video src="${fixImageUrl(post.video)}" class="post-media" controls></video>` : ''}

        <div class="post-actions">
          <i class="${likeIconClass} fa-heart" onclick="toggleLike('${postId}', this)"></i>
          <i class="far fa-comment"></i>
          <i class="far fa-bookmark"></i>
        </div>

        <div class="post-likes">
          ${(post.likes || []).length} likes
        </div>

        <div class="post-caption">
          <strong><a href="${profileUrl}" style="color:inherit;text-decoration:none;">${authorName}</a></strong>
          ${post.content || ''}
        </div>

        <div class="post-comments">
          ${lastComments}
          ${(post.comments?.length || 0) > 2 ? `<a href="#">View all ${post.comments.length} comments</a>` : ''}
        </div>

        <div class="post-add-comment">
          <input type="text" placeholder="Add a comment..."
            onkeypress="if(event.key === 'Enter') submitComment('${postId}', this)" />
        </div>

      `;

      postsGrid.appendChild(postEl);
    });
  } catch (err) {
    console.error('Error loading posts:', err);
    alert('Error loading posts');
  }
}

async function deleteGroupPost(postId) {
  if (!confirm('Are you sure you want to delete this post?')) return;
  try {
    const res = await fetch(`${backendURL}/api/groups/${groupId}/posts/${postId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Failed to delete post');
      return;
    }
    await loadGroupPosts();
  } catch (err) {
    console.error('Error deleting post:', err);
    alert('Server error while deleting post');
  }
}

async function joinGroup(groupId) {
  try {
    const res = await fetch(`${backendURL}/api/groups/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ groupId })
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Failed to join group');
      return;
    }
    await loadGroupProfile();
  } catch (err) {
    console.error('Join group error:', err);
    alert('Server error');
  }
}

async function leaveGroup(groupId) {
  try {
    const res = await fetch(`${backendURL}/api/groups/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ groupId })
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Failed to leave group');
      return;
    }
    await loadGroupProfile();
  } catch (err) {
    console.error('Leave group error:', err);
    alert('Server error');
  }
}

// =====================================================
// ================== IMAGE MODAL ======================
// =====================================================
const modalOverlay     = document.getElementById('changeImageModal');
const uploadPhotoBtn   = document.getElementById('uploadPhotoBtn');
const removePhotoBtn   = document.getElementById('removePhotoBtn');
const cancelModalBtn   = document.getElementById('cancelModalBtn');
const profileFileInput = document.getElementById('profileFileInput');
const coverFileInput   = document.getElementById('coverFileInput');
const modalTitle       = document.getElementById('modalTitle');
let currentImageType   = '';

function enableImageModalControls() {
  document.getElementById('groupImage')?.addEventListener('click', () => {
    currentImageType = 'profile';
    modalTitle.innerText = 'Change Profile Photo';
    modalOverlay.classList.remove('hidden');
  });

  document.getElementById('groupCoverImage')?.addEventListener('click', () => {
    currentImageType = 'cover';
    modalTitle.innerText = 'Change Cover Photo';
    modalOverlay.classList.remove('hidden');
  });

  uploadPhotoBtn?.addEventListener('click', () => {
    modalOverlay.classList.add('hidden');
    if (currentImageType === 'profile') profileFileInput.click();
    else coverFileInput.click();
  });

  removePhotoBtn?.addEventListener('click', () => {
    modalOverlay.classList.add('hidden');
    removeImage(currentImageType);
  });

  cancelModalBtn?.addEventListener('click', () => {
    modalOverlay.classList.add('hidden');
  });
}

profileFileInput?.addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) uploadImage(file, 'profile');
});
coverFileInput?.addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) uploadImage(file, 'cover');
});

async function uploadImage(file, type) {
  if (!groupId) return; // only for group mode
  const form = new FormData();
  form.append(type === 'profile' ? 'groupImage' : 'groupCover', file);
  try {
    const res = await fetch(`${backendURL}/api/groups/${groupId}/${type}-upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form
    });
    const data = await res.json();
    const imgEl = (type === 'profile') ? document.getElementById('groupImage')
                                       : document.getElementById('groupCoverImage');
    imgEl.src = fixImageUrl(data.url);
  } catch (err) {
    console.error(err);
    alert('Error uploading image');
  }
}

async function removeImage(type) {
  if (!groupId) return;
  try {
    await fetch(`${backendURL}/api/groups/${groupId}/${type}-remove`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const imgEl = (type === 'profile') ? document.getElementById('groupImage')
                                       : document.getElementById('groupCoverImage');
    imgEl.src = (type === 'profile') ? DEFAULT_AVATAR : DEFAULT_COVER;
  } catch (err) {
    console.error(err);
    alert('Error removing image');
  }
}

// =====================================================
// ================== EDIT GROUP MODAL =================
// =====================================================
const editGroupModal    = document.getElementById('editGroupModal');
const saveGroupChangesBtn = document.getElementById('saveGroupChangesBtn');
const editNameInput     = document.getElementById('editGroupName');
const editDescInput     = document.getElementById('editGroupDescription');
const membersListDiv    = document.getElementById('editGroupMembersList');

function openEditModal() {
  if (!currentGroup || !isAdmin) return;
  editNameInput.value = currentGroup.name || '';
  editDescInput.value = currentGroup.description || '';
  membersListDiv.innerHTML = '';

  (currentGroup.members || []).forEach(m => {
    const mid  = String(typeof m === 'string' ? m : m._id);
    const name = typeof m === 'object' ? (m.username || mid) : mid;
    const isMemberAdmin = String(typeof currentGroup.admin === 'object' ? currentGroup.admin._id : currentGroup.admin) === mid;

    const div = document.createElement('div');
    div.innerHTML = `
      ${name} ${isMemberAdmin ? '(Admin)' : ''}
      ${!isMemberAdmin ? `<button onclick="removeMember('${mid}')">Remove</button>` : ''}
    `;
    membersListDiv.appendChild(div);
  });

  editGroupModal.classList.remove('hidden');
  

}

function closeEditModal() {
  editGroupModal.classList.add('hidden');
}

saveGroupChangesBtn?.addEventListener('click', async () => {
  try {
    const updatedName = editNameInput.value.trim();
    const updatedDesc = editDescInput.value.trim();

    const res = await fetch(`${backendURL}/api/groups/${groupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: updatedName, description: updatedDesc })
    });

    if (!res.ok) {
      const data = await res.json();
      return alert(data.error || 'Failed to update group');
    }

    alert('Group updated successfully');
    closeEditModal();
    await loadGroupProfile();
  } catch (err) {
    console.error('Update group error:', err);
    alert('Server error');
  }
});

async function removeMember(memberId) {
  if (!confirm('Remove this member?')) return;

  try {
    const res = await fetch(`${backendURL}/api/groups/${groupId}/remove-member`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ memberId })
    });

    if (!res.ok) {
      const data = await res.json();
      return alert(data.error || 'Failed to remove member');
    }

    alert('Member removed');
    await loadGroupProfile();
    closeEditModal();
  } catch (err) {
    console.error('Remove member error:', err);
    alert('Server error');
  }
}

// =====================================================
// ================== CREATE POST BOX ==================
// =====================================================
const mediaInput = document.getElementById('postMedia');
const previewImg = document.getElementById('previewImage');
const previewVid = document.getElementById('previewVideo');

mediaInput?.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  previewImg.style.display = 'none';
  previewVid.style.display = 'none';

  if (file.type.startsWith('image/')) {
    previewImg.src = url;
    previewImg.style.display = 'block';
  } else if (file.type.startsWith('video/')) {
    previewVid.src = url;
    previewVid.style.display = 'block';
  }
});

document.getElementById('submitPostBtn')?.addEventListener('click', async () => {
  const content = document.getElementById('postContent').value.trim();
  const file = mediaInput.files[0];

  if (!content && !file) {
    alert('Please write something or upload a media file.');
    return;
  }

  const form = new FormData();
  if (file)    form.append('file', file);
  if (content) form.append('content', content);
  if (groupId) form.append('group', groupId); // only when we’re inside a group

  try {
    const res = await fetch(`${backendURL}/api/posts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create post');

    alert('Post uploaded!');
    document.getElementById('postContent').value = '';
    mediaInput.value = '';
    previewImg.style.display = 'none';
    previewVid.style.display = 'none';

    if (groupId) await loadGroupPosts(); // refresh group feed if relevant
  } catch (err) {
    console.error('Upload post error:', err);
    alert('Error uploading post');
  }
});

// Comments/likes (used in group mode)
async function submitComment(postId, inputElement) {
  const text = inputElement.value.trim();
  if (!text) return;

  try {
    const res = await fetch(`${backendURL}/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text })
    });

    const updatedPost = await res.json();
    if (!res.ok) throw new Error(updatedPost.message || 'Failed to add comment');

    inputElement.value = '';
    if (groupId) await loadGroupPosts();
  } catch (err) {
    console.error('Error adding comment:', err);
    alert(err.message);
  }
}

async function toggleLike(postId) {
  try {
    const res = await fetch(`${backendURL}/api/posts/${postId}/like`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error('Failed to toggle like');
    if (groupId) await loadGroupPosts();
  } catch (err) {
    console.error('Like error:', err);
    alert('Error toggling like');
  }
}
