const backendURL = 'http://localhost:5000';

function fixImageUrl(url) {
  console.log("fixImageUrl input:", url); // DEBUG
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const fullUrl = backendURL + url;
  console.log("fixImageUrl output:", fullUrl); // DEBUG
  return fullUrl;
}

function getUserIdFromToken(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload)).id;
  } catch {
    return null;
  }
}

const userId = getUserIdFromToken(localStorage.getItem('token'));

// ====== טעינת פרופיל ======
async function loadUserProfile() {
  try {
    const token = localStorage.getItem('token');
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
    document.getElementById('profileImage').src = user.avatar ? fixImageUrl(user.avatar) : 'default-avatar.png';
    document.getElementById('username').textContent = user.username;
    document.getElementById('bio').textContent = user.bio || '';
    document.getElementById('postsCount').textContent = `${user.postsCount || 0} posts`;
    document.getElementById('followersCount').textContent = `${user.followers.length} followers`;
    document.getElementById('followingCount').textContent = `${user.following.length} following`;

    setupFollowButton(user);
    await loadUserPosts();
  } catch (error) {
    console.error(error);
    alert('Error loading profile');
  }
}

function setupFollowButton(user) {
  const followBtn = document.getElementById('followBtn');
  if (!followBtn) return;

  const currentUserId = getUserIdFromToken(localStorage.getItem('token'));
  if (!currentUserId) return;

  const isFollowing = user.followers.some(f => f._id === currentUserId);
  followBtn.textContent = isFollowing ? 'Unfollow' : 'Follow';

  followBtn.onclick = async () => {
    try {
      const res = await fetch(`${backendURL}/api/users/${user._id}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
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

// ====== תמונת פרופיל ======
const profileModal = document.getElementById('profileModal');
const uploadPhotoBtn = document.getElementById('uploadPhotoBtn');
const removePhotoBtn = document.getElementById('removePhotoBtn');
const cancelBtn = document.getElementById('cancelBtn');
const imageUpload = document.getElementById('imageUpload');
const profileImage = document.getElementById('profileImage');

profileImage.addEventListener('click', e => {
  e.stopPropagation();
  profileModal.classList.remove('hidden');
});
uploadPhotoBtn.addEventListener('click', () => {
  imageUpload.click();
  profileModal.classList.add('hidden');
});
removePhotoBtn.addEventListener('click', async () => {
  try {
    const token = localStorage.getItem('token');
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
    imageUpload.value = null;
    profileModal.classList.add('hidden');
    loadUserProfile();
  } catch (error) {
    alert('Error removing profile image');
    console.error(error);
  }
});
cancelBtn.addEventListener('click', () => profileModal.classList.add('hidden'));
profileModal.addEventListener('click', e => {
  if (e.target === profileModal) profileModal.classList.add('hidden');
});

imageUpload.addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('avatar', file);

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${backendURL}/api/users/${userId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });

    if (!res.ok) {
      alert('Failed to update profile image');
      return;
    }

    const user = await res.json();
    profileImage.src = user.avatar ? fixImageUrl(user.avatar) : 'default-avatar.png';
    profileModal.classList.add('hidden');
  } catch (error) {
    alert('Error updating profile image');
    console.error(error);
  }
});

// ====== פוסטים (כולל וידאו) ======
const postsGrid = document.getElementById('postsGrid');
const uploadPostSidebarBtn = document.getElementById('uploadPostSidebarBtn');
const postImageUpload = document.getElementById('postImageUpload');

uploadPostSidebarBtn.addEventListener('click', () => postImageUpload.click());
postImageUpload.addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file); // שימו לב! עכשיו זה תמיד תחת 'file'
  formData.append('content', '');

  try {
    const res = await fetch(`${backendURL}/api/posts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: formData
    });

    if (!res.ok) {
      alert('Failed to upload post');
      return;
    }
    await loadUserPosts(); // רענון הפוסטים בגריד
  } catch (error) {
    console.error(error);
    alert('Error uploading post');
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
}
// ======== פונקציה לפתיחת מודל הפוסט כשהולכים לראות אותו בגדול ========
async function openPostModal(post) {
  console.log("Opening modal with post:", post);

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

  postModalImage.innerHTML = '';

  if (post.image && post.image !== "null") {
    postModalImage.innerHTML = `<img src="${fixImageUrl(post.image)}" style="max-width:100%; max-height:80vh;" />`;
  } else if (post.video && post.video !== "null") {
    postModalImage.innerHTML = `<video src="${fixImageUrl(post.video)}" controls style="max-width:100%; max-height:80vh;"></video>`;
  } else {
    postModalImage.innerHTML = `<div style="color:white; text-align:center;">No media found</div>`;
  }

  postAuthorAvatar.src = post.author?.avatar ? fixImageUrl(post.author.avatar) : 'default-avatar.png';
  postAuthorUsername.textContent = post.author?.username || 'Unknown';

  postComments.innerHTML = (post.comments || []).map(c =>
    `<div class="comment">
      <img src="${c.author?.avatar ? fixImageUrl(c.author.avatar) : 'default-avatar.png'}" alt="avatar" class="comment-avatar">
      <div class="comment-body">
        <b>${c.author?.username || 'User'}</b>
        <span class="comment-text">${c.text}</span>
        <div class="comment-time">${moment(c.createdAt).fromNow()}</div>
      </div>
    </div>`
  ).join('');

  likeBtn.innerHTML = (post.likes || []).includes(userId)
    ? '<i class="fas fa-heart liked"></i>'
    : '<i class="far fa-heart"></i>';
  likesCount.textContent = `${(post.likes || []).length} likes`;

  likeBtn.onclick = async () => {
    try {
      const res = await fetch(`${backendURL}/api/posts/${post._id}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Failed to like');
      const updatedPost = await res.json();
      openPostModal(updatedPost);
    } catch (err) {
      console.error(err);
    }
  };

  // 🎯 ➜ הוספת פתיחת מודל מחיקה בכפתור ⋯
  const optionsBtn = postModal.querySelector('.modal-options-btn');
  if (optionsBtn) {
    optionsBtn.onclick = () => openDeleteModal(post._id);
  }

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

// ======== טיפול בטופס הוספת תגובה במודל ========
const commentForm = document.getElementById('commentForm');
commentForm.addEventListener('submit', async e => {
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

// ======== הפעלת טעינת הפרופיל ברגע שהעמוד נטען ========
window.addEventListener('DOMContentLoaded', loadUserProfile);
