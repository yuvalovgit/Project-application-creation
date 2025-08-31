const backendURL = 'http://localhost:5000';

const postsCache = new Map(); // postId -> full post (כולל comments)
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
    const deleteBtn    = document.getElementById('deleteGroupBtn');

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

    // --- חברי הקבוצה (sidebar) ---
    await loadGroupMembers();

  } catch (err) {
    console.error('loadGroupProfile error:', err);
    alert('Error loading group profile');
  }
}

// ===== Members sidebar =====
async function loadGroupMembers() {
  try {
    const res = await fetch(`${backendURL}/api/groups/${groupId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to load members");
    const group = await res.json();

    // מושך גם את המשתמש הנוכחי עם following
    const meRes = await fetch(`${backendURL}/api/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const me = await meRes.json();
    const myFollowing = me.following ? me.following.map(f => String(f._id || f)) : [];

    const container = document.getElementById('groupMembersList');
    if (!container) return;

    let members = Array.isArray(group.members) ? group.members.slice() : [];

    // הופך את עצמי לראשון
    const myId = String(userId);
    members.sort((a, b) => {
      const aId = String(a && a._id ? a._id : a);
      const bId = String(b && b._id ? b._id : b);
      if (aId === myId && bId !== myId) return -1;
      if (bId === myId && aId !== myId) return 1;
      const an = (a.username || '').toLowerCase();
      const bn = (b.username || '').toLowerCase();
      return an.localeCompare(bn);
    });

    if (!members.length) {
      container.innerHTML = '<p style="color:#888;">No members yet</p>';
      return;
    }

    const getAvatar = (u) => {
      const raw = (u && (u.avatar || u.profileImage || u.image)) || '';
      if (!raw) return DEFAULT_AVATAR;
      if (/^https?:\/\//i.test(raw)) return raw;
      if (raw.startsWith('/')) return backendURL + raw;
      return fixImageUrl(raw, 'avatar');
    };

    container.innerHTML = members.map(m => {
      const mId = String(m._id || m);
      const isMe = mId === myId;
      const avatar = getAvatar(m);
      const href   = `profile.html?userId=${encodeURIComponent(mId)}`;

      // בדיקה אם אני כבר עוקב אחרי המשתמש הזה
      const isFollowing = myFollowing.includes(mId);

      return `
        <div class="member-row">
          <a href="${href}">
            <img src="${avatar}" alt="${escapeHtml(m.username || 'user')}" />
          </a>
          <a href="${href}" class="member-username">
            ${escapeHtml(m.username || 'user')}${isMe ? ' <span class="member-me">(you)</span>' : ''}
          </a>
          ${isMe ? '' : `<button class="member-follow ${isFollowing ? 'is-following' : ''}" data-userid="${mId}">
                          ${isFollowing ? 'Following' : 'Follow'}
                        </button>`}
        </div>
      `;
    }).join('');

    // מאזינים ללחיצות Follow/Unfollow
    container.querySelectorAll('.member-follow').forEach(btn => {
      btn.addEventListener('click', () => followUser(btn));
    });

  } catch (err) {
    console.error("❌ loadGroupMembers error:", err);
  }
}


async function followUser(btn) {
  const targetId = btn.dataset.userid;
  if (!targetId) return;
  if (String(targetId) === String(userId)) return; // לא עוקבים אחרי עצמך

  btn.disabled = true;

  try {
    const res = await fetch(`${backendURL}/api/users/${encodeURIComponent(targetId)}/follow`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data?.error || 'Failed to follow user');
      return;
    }

    // data.followed === true => עכשיו אתה עוקב
    const followed = !!data.followed;
    btn.textContent = followed ? 'Following' : 'Follow';
    btn.classList.toggle('is-following', followed);
  } catch (err) {
    console.error('Follow failed:', err);
    alert('Server error');
  } finally {
    btn.disabled = false;
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
    if (!postsGrid) return;
    postsGrid.innerHTML = '';

    // cache גלובלי לפוסטים (אם לא הוגדר קודם)
    if (!window.postsCache) window.postsCache = new Map();

    // מיון מהחדש לישן
    const ordered = Array.isArray(posts)
      ? [...posts].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      : [];

    ordered.forEach(post => {
      const postEl = document.createElement('div');
      postEl.className = 'group-post';

      const postId = typeof post._id === 'object' ? post._id.toString() : post._id;

      // נשמור ב־cache לשימוש במודל תגובות
      window.postsCache.set(postId, post);

      const isLiked = (post.likes || []).map(String).includes(String(userId));
      const likeIconClass = isLiked ? 'fas' : 'far';

      const lastComments = (post.comments || []).slice(-2).map(c => `
        <div class="single-comment">
          <strong>${c.author?.username || 'User'}</strong> ${c.text}
        </div>
      `).join('');

      // --- פרטי מחבר הפוסט ---
      const authorId   = post.author?._id || '';
      const authorName = post.author?.username || 'Unknown';

      const rawAvatar =
        post.author?.profileImage ||
        post.author?.avatar ||
        post.author?.image ||
        post.author?.profilePicture ||
        post.author?.avatarUrl ||
        '/uploads/default-avatar.png';

      const authorImg  = fixImageUrl(rawAvatar);
      const profileUrl = authorId ? `profile.html?userId=${encodeURIComponent(authorId)}` : '#';

      // --- תבנית הפוסט ---
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
          <i class="far fa-comment" onclick="focusComment('${postId}')"></i>
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
          ${(post.comments?.length || 0) > 2
            ? `<a href="#" class="view-all" data-post="${postId}">View all ${post.comments.length} comments</a>`
            : ''}
        </div>

        <div class="post-add-comment">
          <input
            type="text"
            placeholder="Add a comment..."
            data-post="${postId}"
            onkeypress="if(event.key === 'Enter') submitComment('${postId}', this)" />
        </div>
      `;

      postsGrid.appendChild(postEl);
    });

    // חיווט חד־פעמי לקישורי "View all … comments"
    if (!postsGrid.dataset.viewAllWired) {
      postsGrid.addEventListener('click', (e) => {
        const link = e.target.closest('a.view-all');
        if (!link) return;
        e.preventDefault();
        const pid = link.dataset.post;
        if (typeof openCommentsModal === 'function') {
          openCommentsModal(pid);
        }
      });
      postsGrid.dataset.viewAllWired = '1';
    }

  } catch (err) {
    console.error('Error loading posts:', err);
    alert('Error loading posts');
  }
}


function focusComment(postId) {
  const input = document.querySelector(`.post-add-comment input[data-post="${postId}"]`);
  if (input) input.focus();
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
    const imgEl = (type === 'profile') 
      ? document.getElementById('groupImage')
      : document.getElementById('groupCoverImage');

    // ✅ מוסיפים טיימסטמפ לשבור cache
    imgEl.src = fixImageUrl(data.url) + `?t=${Date.now()}`;
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
/* ===================== Search Drawer (Instagram-like) ===================== */
/* Safe globals */
window.backendURL = window.backendURL || 'http://localhost:5000';

window.fixImageUrl = window.fixImageUrl || function(url, type = 'generic') {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/uploads')) return backendURL + url;
  if (url.startsWith('uploads'))  return backendURL + '/' + url;
  const folder =
    type === 'avatar'     ? '/uploads/avatars/' :
    type === 'groupCover' ? '/uploads/covers/'  :
                             '/uploads/posts/';
  return backendURL + folder + url;
};

window.avatarUrl = window.avatarUrl || function(raw) {
  const DEFAULT_AVATAR_DATAURI =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="%23222222"/><circle cx="60" cy="45" r="22" fill="%23999"/><rect x="25" y="76" width="70" height="24" rx="12" fill="%23999"/></svg>';
  if (!raw || raw === 'null' || raw === 'undefined') return DEFAULT_AVATAR_DATAURI;
  if (/^(data:|blob:|https?:\/\/)/i.test(raw)) return raw;
  return fixImageUrl(raw, 'avatar');
};

window.escapeHtml = window.escapeHtml || function(str = '') {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

let searchMode = 'users'; // 'users' | 'groups'
let searchDebounceTimer = null;
let searchAbort = null;

window.openUserSearchModal = function openUserSearchModal() {
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
};

window.closeUserSearchModal = function closeUserSearchModal() {
  const overlay = document.getElementById('modalOverlay');
  const drawer  = document.getElementById('searchDrawer');
  if (overlay) overlay.style.display = 'none';
  if (drawer)  drawer.style.display = 'none';
  renderResults([]);
};

function setActiveTab(type) {
  searchMode = type;
  document.getElementById('tabUsers')?.classList.toggle('active', type === 'users');
  document.getElementById('tabGroups')?.classList.toggle('active', type === 'groups');
  const q = document.getElementById('searchInput')?.value.trim() || '';
  if (q) doSearch(q, searchMode); else renderResults([], 'Search ' + type + '…');
}

function wireSearchUI() {
  document.getElementById('tabUsers')?.addEventListener('click', () => setActiveTab('users'));
  document.getElementById('tabGroups')?.addEventListener('click', () => setActiveTab('groups'));

  document.getElementById('searchInput')?.addEventListener('input', (e) => {
    const q = e.target.value;
    const clr = document.getElementById('searchClearBtn');
    if (clr) clr.style.display = q ? 'block' : 'none';
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => doSearch(q.trim(), searchMode), 250);
  });

  document.getElementById('searchClearBtn')?.addEventListener('click', () => {
    const input = document.getElementById('searchInput');
    if (input) {
      input.value = '';
      document.getElementById('searchClearBtn').style.display = 'none';
      input.focus();
      renderResults([], 'Start typing to search…');
    }
  });
}

async function doSearch(query, mode) {
  if (!query) {
    renderResults([], 'Start typing to search…');
    return;
  }
  if (searchAbort) searchAbort.abort();
  searchAbort = new AbortController();
  renderResults([], 'Searching…');

  try {
    const token = localStorage.getItem('token');
    const url = mode === 'groups'
      ? `${backendURL}/api/groups/search?name=${encodeURIComponent(query)}`
      : `${backendURL}/api/users/search?username=${encodeURIComponent(query)}`;

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: searchAbort.signal });
    if (!res.ok) throw new Error('Search failed');
    const data = await res.json();
    renderResults(Array.isArray(data) ? data : [], (data && data.length) ? '' : 'No results.');
  } catch (e) {
    if (e.name !== 'AbortError') {
      console.error(e);
      renderResults([], 'Error while searching.');
    }
  }
}

function renderResults(items, emptyMsg) {
  const list = document.getElementById('searchResultsList');
  if (!list) return;

  if (!items || !items.length) {
    list.innerHTML = `<div class="empty">${emptyMsg || 'No results.'}</div>`;
    return;
  }

  const rows = items.map(item => {
    if (searchMode === 'groups') {
      const cover = fixImageUrl(item.cover || item.image || '/uploads/default-cover.jpg', 'groupCover');
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

window.addEventListener('DOMContentLoaded', wireSearchUI);
// ======== View-all-comments wiring (delegation) ========
(function wireViewAllOnce(){
  if (window.__wiredViewAll) return;
  window.__wiredViewAll = true;

  const feed = document.getElementById('groupPostsFeed');
  if (!feed) return;

  feed.addEventListener('click', (e) => {
    const link = e.target.closest('.view-all');
    if (!link) return;
    e.preventDefault();
    const postId = link.dataset.post;
    openCommentsModal(postId);
  });
})();

// ======== Comments modal logic ========
const commentsModal  = document.getElementById('commentsModal');
const closeComments  = document.getElementById('closeCommentsBtn');
const commentsListEl = document.getElementById('commentsList');
const commentsForm   = document.getElementById('commentsAddForm');
const commentsInput  = document.getElementById('commentsInput');

closeComments?.addEventListener('click', () => commentsModal.classList.add('hidden'));
commentsModal?.addEventListener('click', (e) => {
  if (e.target === commentsModal) commentsModal.classList.add('hidden');
});

async function openCommentsModal(postId){
  if (!postId) return;

  // ננסה להביא פוסט עדכני מהשרת; אם אין ראוט – ניפול חזרה ל־cache
  let post = null;
  try {
    const res = await fetch(`${backendURL}/api/posts/${postId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) post = await res.json();
  } catch(_) {}
  if (!post) post = postsCache.get(postId);
  if (!post) return;

  commentsModal.dataset.postId = postId;
  renderCommentsList(post.comments || []);
  commentsModal.classList.remove('hidden');

  // פוקוס לשדה
  setTimeout(() => commentsInput?.focus(), 0);
}

function renderCommentsList(comments){
  if (!commentsListEl) return;
  if (!Array.isArray(comments) || !comments.length){
    commentsListEl.innerHTML = `<p style="color:#9b9b9b;text-align:center;padding:10px;">No comments yet</p>`;
    return;
  }

  commentsListEl.innerHTML = comments.map(c => {
    const username = (c.author && c.author.username) || 'User';
    const avatar   = fixImageUrl(
      (c.author && (c.author.profileImage || c.author.avatar || c.author.image)) ||
      '/uploads/default-avatar.png'
    );
    const time = c.createdAt ? new Date(c.createdAt).toLocaleString() : '';
    return `
      <div class="row">
        <img class="avatar" src="${avatar}" alt="${escapeHtml(username)}"
             onerror="this.onerror=null;this.src='${fixImageUrl('/uploads/default-avatar.png')}';">
        <div class="meta">
          <span class="user">${escapeHtml(username)}</span>
          <span>${escapeHtml(c.text || '')}</span>
          <span class="time"> · ${escapeHtml(time)}</span>
        </div>
      </div>
    `;
  }).join('');
}

// שליחת תגובה מתוך המודל
commentsForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const postId = commentsModal?.dataset.postId;
  const text = commentsInput.value.trim();
  if (!postId || !text) return;

  try {
    const res = await fetch(`${backendURL}/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text })
    });
    const updated = await res.json();
    if (!res.ok) throw new Error(updated?.message || 'Failed to add comment');

    commentsInput.value = '';

    // עדכן רשימה במודל + מטמון + רענון פיד קבוצתי כדי לעדכן מונה
    renderCommentsList(updated.comments || []);
    postsCache.set(postId, updated);
    if (groupId) await loadGroupPosts();
  } catch (err) {
    console.error(err);
    alert('Error adding comment');
  }
});
