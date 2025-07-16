const backendURL = 'http://localhost:5000';
const token    = localStorage.getItem('token');
const userId   = localStorage.getItem('userId');
const urlParams = new URLSearchParams(window.location.search);
const groupId  = urlParams.get('groupId');

if (!token || !userId || !groupId) {
  alert('Please log in again');
  localStorage.clear(); // מנקה טוקן שגוי
  window.location.href = 'login.html';
}


function fixImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (!url.startsWith('/')) url = '/uploads/posts/' + url;
  return backendURL + url;
}


const DEFAULT_AVATAR = fixImageUrl('/uploads/default-avatar.png');
const DEFAULT_COVER = fixImageUrl('/uploads/default-cover.jpg');

let currentGroup = null;
let isAdmin = false;

window.addEventListener('DOMContentLoaded', loadGroupProfile);

async function loadGroupProfile() {
  try {
    const res = await fetch(`${backendURL}/api/groups/${groupId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to load group');
    const group = await res.json();
    console.log("🔐 Logged userId:", userId);
    console.log("👑 Group adminId:", typeof group.admin === 'object' ? group.admin._id : group.admin);
    console.log("👥 Members:", group.members);

    currentGroup = group;

    const adminField = group.admin;
    const adminId = adminField
      ? (typeof adminField === 'object' ? adminField._id.toString() : adminField)
      : null;
    isAdmin = adminId?.toString() === userId?.toString();
    const isMember = group.members.includes(userId);

    document.getElementById('groupImage').src = group.image ? fixImageUrl(group.image) : DEFAULT_AVATAR;
    document.getElementById('groupCoverImage').src = group.cover ? fixImageUrl(group.cover) : DEFAULT_COVER;
    document.getElementById('groupName').textContent = group.name;
    document.getElementById('groupDescription').textContent = group.description || '';
    document.getElementById('groupCategory').textContent = '#' + (group.topic || 'general');
    document.getElementById('groupMembersCount').textContent = group.members.length;
    document.getElementById('groupPostsCount').textContent = group.posts?.length || '0';

    const adminInfo = document.getElementById('adminInfo');
    if (isAdmin) {
      adminInfo.textContent = 'You are the admin of this group';
      adminInfo.style.color = '#1c8a00';
    } else if (typeof adminField === 'object') {
      adminInfo.textContent = `Admin: ${adminField.username}`;
    } else {
      adminInfo.textContent = 'Admin: N/A';
    }

    const joinBtn = document.getElementById('joinLeaveBtn');
    joinBtn.textContent = isMember ? 'Leave Group' : 'Join Group';
    joinBtn.onclick = () => isMember ? leaveGroup(groupId) : joinGroup(groupId);

    const editBtn = document.getElementById('editGroupBtn');
    if (isAdmin) {
      editBtn.style.display = 'inline-block';
      editBtn.onclick = openEditModal;
    } else {
      editBtn.style.display = 'none';
    }

    // Admin only: allow changing images
    if (isAdmin) {
      document.getElementById('groupImage').addEventListener('click', () => {
        currentImageType = 'profile';
        modalTitle.innerText = 'Change Profile Photo';
        modalOverlay.classList.remove('hidden');
      });

      document.getElementById('groupCoverImage').addEventListener('click', () => {
        currentImageType = 'cover';
        modalTitle.innerText = 'Change Cover Photo';
        modalOverlay.classList.remove('hidden');
      });

      uploadPhotoBtn.addEventListener('click', () => {
        modalOverlay.classList.add('hidden');
        if (currentImageType === 'profile') profileFileInput.click();
        else coverFileInput.click();
      });

      removePhotoBtn.addEventListener('click', () => {
        modalOverlay.classList.add('hidden');
        removeImage(currentImageType);
      });
    }

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

    posts.reverse().forEach(post => {
      const postEl = document.createElement('div');
      postEl.className = 'group-post';

      const postId = typeof post._id === 'object' ? post._id.toString() : post._id;
      const isLiked = post.likes?.includes(userId);
      const likeIconClass = isLiked ? 'fas' : 'far';

      const lastComments = (post.comments || []).slice(-2).map(c => `
        <div class="single-comment">
          <strong>${c.author?.username || 'User'}</strong> ${c.text}
        </div>
      `).join('');

      postEl.innerHTML = `
        <div class="post-header">
          <img src="${fixImageUrl(post.author?.profileImage || '/uploads/default-avatar.png')}" class="avatar">
          <div class="post-author">
            <b>${post.author?.username || 'Unknown'}</b>
            <span class="post-time">${new Date(post.createdAt).toLocaleString()}</span>
          </div>
          <div class="post-options">⋯</div>
        </div>

        ${post.image ? `<img src="${fixImageUrl(post.image)}" class="post-media" />` : ''}
        ${post.video ? `<video src="${fixImageUrl(post.video)}" class="post-media" controls></video>` : ''}

        <div class="post-actions">
          <i class="${likeIconClass} fa-heart" onclick="toggleLike('${postId}', this)"></i>
          <i class="far fa-comment"></i>
          <i class="far fa-bookmark"></i>
        </div>

        <div class="post-likes">
          ${post.likes?.length || 0} likes
        </div>

        <div class="post-caption">
          <strong>${post.author?.username || 'Unknown'}</strong> ${post.content || ''}
        </div>

        <div class="post-comments">
          ${lastComments}
          ${(post.comments?.length || 0) > 2 ? `<a href="#">View all ${post.comments.length} comments</a>` : ''}
        </div>

        <div class="post-add-comment">
          <input type="text" placeholder="Add a comment..."
            onkeypress="if(event.key === 'Enter') submitComment('${postId}', this)" />
        </div>

        ${isAdmin || post.author?._id === userId ? `<button class="delete-btn" onclick="deleteGroupPost('${postId}')">Delete</button>` : ''}
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
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
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
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
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

async function loadAndOpenPost(postId) {
  try {
    const res = await fetch(`${backendURL}/api/posts/${postId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch post');
    const post = await res.json();
    alert("Post details:\n\n" + JSON.stringify(post, null, 2));
  } catch (err) {
    console.error(err);
    alert('Error loading post');
  }
}

// Image modal logic
const modalOverlay = document.getElementById('changeImageModal');
const uploadPhotoBtn = document.getElementById('uploadPhotoBtn');
const removePhotoBtn = document.getElementById('removePhotoBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const profileFileInput = document.getElementById('profileFileInput');
const coverFileInput = document.getElementById('coverFileInput');
const modalTitle = document.getElementById('modalTitle');
let currentImageType = '';

cancelModalBtn.addEventListener('click', () => {
  modalOverlay.classList.add('hidden');
});

profileFileInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) uploadImage(file, 'profile');
});
coverFileInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) uploadImage(file, 'cover');
});

async function uploadImage(file, type) {
  const form = new FormData();
  form.append(type === 'profile' ? 'groupImage' : 'groupCover', file);
  try {
    const res = await fetch(`${backendURL}/api/groups/${groupId}/${type}-upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form
    });
    const data = await res.json();
    const imgEl = type === 'profile'
      ? document.getElementById('groupImage')
      : document.getElementById('groupCoverImage');
    imgEl.src = fixImageUrl(data.url);
  } catch (err) {
    console.error(err);
    alert('Error uploading image');
  }
}

async function removeImage(type) {
  try {
    await fetch(`${backendURL}/api/groups/${groupId}/${type}-remove`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const imgEl = type === 'profile'
      ? document.getElementById('groupImage')
      : document.getElementById('groupCoverImage');
    imgEl.src = type === 'profile' ? DEFAULT_AVATAR : DEFAULT_COVER;
  } catch (err) {
    console.error(err);
    alert('Error removing image');
  }
}

// Group edit modal
const editGroupModal = document.getElementById('editGroupModal');
const saveGroupChangesBtn = document.getElementById('saveGroupChangesBtn');
const editNameInput = document.getElementById('editGroupName');
const editDescInput = document.getElementById('editGroupDescription');
const membersListDiv = document.getElementById('editGroupMembersList');

function openEditModal() {
  if (!currentGroup || !isAdmin) return;
  editNameInput.value = currentGroup.name;
  editDescInput.value = currentGroup.description;
  membersListDiv.innerHTML = '';

  currentGroup.members.forEach(member => {
    const isMemberAdmin = currentGroup.admin._id?.toString() === member._id?.toString();
    const div = document.createElement('div');
    div.innerHTML = `
      ${member.username} ${isMemberAdmin ? '(Admin)' : ''}
      ${!isMemberAdmin ? `<button onclick="removeMember('${member._id}')">Remove</button>` : ''}
    `;
    membersListDiv.appendChild(div);
  });

  editGroupModal.classList.remove('hidden');
}

function closeEditModal() {
  editGroupModal.classList.add('hidden');
}

saveGroupChangesBtn.addEventListener('click', async () => {
  try {
    const updatedName = editNameInput.value.trim();
    const updatedDesc = editDescInput.value.trim();

   const res = await fetch(`${backendURL}/api/groups/${groupId}`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  },
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
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
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
const mediaInput = document.getElementById('postMedia');
const previewImg = document.getElementById('previewImage');
const previewVid = document.getElementById('previewVideo');

mediaInput.addEventListener('change', e => {
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

document.getElementById('submitPostBtn').addEventListener('click', async () => {
  const content = document.getElementById('postContent').value.trim();
  const file = mediaInput.files[0];

  if (!content && !file) {
    alert('Please write something or upload a media file.');
    return;
  }

  const form = new FormData();
  if (file) form.append('file', file);
  if (content) form.append('content', content);
  if (typeof groupId !== 'undefined') form.append('group', groupId);

  try {
    const res = await fetch(`${backendURL}/api/posts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: form
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create post');

    alert('Post uploaded!');
    document.getElementById('postContent').value = '';
    mediaInput.value = '';
    previewImg.style.display = 'none';
    previewVid.style.display = 'none';

    if (typeof loadGroupPosts !== 'undefined') {
      await loadGroupPosts();
    } else {
      await loadFeed();
    }
  } catch (err) {
    console.error('Upload post error:', err);
    alert('Error uploading post');
  }
});
async function submitComment(postId, inputElement) {
  const text = inputElement.value.trim();
  if (!text) return;

  try {
    const res = await fetch(`${backendURL}/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ text })
    });

    const updatedPost = await res.json();
    if (!res.ok) throw new Error(updatedPost.message || 'Failed to add comment');

    inputElement.value = '';
    await loadGroupPosts(); // טען מחדש את הפוסטים
  } catch (err) {
    console.error('Error adding comment:', err);
    alert(err.message);
  }
}
async function toggleLike(postId, icon) {
  try {
    const res = await fetch(`${backendURL}/api/posts/${postId}/like`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error('Failed to toggle like');
    await loadGroupPosts();
  } catch (err) {
    console.error('Like error:', err);
    alert('Error toggling like');
  }
}
