const backendURL = 'http://localhost:5000';

// פונקציה לקבלת ה-userId מתוך טוקן JWT
function getUserIdFromToken(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload)).id;
  } catch {
    return null;
  }
}

const userId = getUserIdFromToken(localStorage.getItem('token')); // משתמשים ב-ID מהטוקן

// טוען את פרטי המשתמש מהשרת ומציג בדף
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

    // עדכון אלמנטים בדף לפי הנתונים שהתקבלו
    document.getElementById('profileImage').src = user.avatar ? backendURL + user.avatar : 'default-avatar.png';
    document.getElementById('username').textContent = user.username;
    document.getElementById('bio').textContent = user.bio || '';
    document.getElementById('postsCount').textContent = `${user.postsCount || 0} posts`;
    document.getElementById('followersCount').textContent = `${user.followers.length} followers`;
    document.getElementById('followingCount').textContent = `${user.following.length} following`;

    setupFollowButton(user);

    // טען פוסטים של המשתמש בפרופיל
    await loadUserPosts();

  } catch (error) {
    console.error(error);
    alert('Error loading profile');
  }
}

// הגדרת כפתור מעקב (Follow/Unfollow)
function setupFollowButton(user) {
  const followBtn = document.getElementById('followBtn');
  if (!followBtn) return; // אם אין כפתור, לא ממשיכים

  const currentUserId = getUserIdFromToken(localStorage.getItem('token'));
  if (!currentUserId) return;

  const isFollowing = user.followers.some(follower => follower._id === currentUserId);

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
      // טוען מחדש את הפרופיל לאחר שינוי המעקב
      loadUserProfile();
    } catch (e) {
      alert('Error updating follow status');
      console.error(e);
    }
  };
}

// --- לוגיקה למודל שינוי תמונת הפרופיל ---

const profileModal = document.getElementById('profileModal');
const uploadPhotoBtn = document.getElementById('uploadPhotoBtn');
const removePhotoBtn = document.getElementById('removePhotoBtn');
const cancelBtn = document.getElementById('cancelBtn');
const imageUpload = document.getElementById('imageUpload');
const profileImage = document.getElementById('profileImage');

// פתיחת המודל בלחיצה על תמונת הפרופיל
profileImage.addEventListener('click', (e) => {
  e.stopPropagation();
  profileModal.classList.remove('hidden');
});

// פתיחת חלון העלאת תמונה בעת לחיצה על הכפתור במודל
uploadPhotoBtn.addEventListener('click', () => {
  imageUpload.click();
  profileModal.classList.add('hidden');
});

// הסרת תמונת הפרופיל והחזרת ברירת המחדל עם עדכון בשרת
removePhotoBtn.addEventListener('click', async () => {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${backendURL}/api/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ avatar: null }) // מחזיר תמונה לברירת מחדל
    });
    if (!res.ok) throw new Error('Failed to remove avatar');

    profileImage.src = 'default-avatar.png';
    imageUpload.value = null;
    profileModal.classList.add('hidden');

    // טען את הפרופיל מחדש
    loadUserProfile();
  } catch (error) {
    alert('Error removing profile image');
    console.error(error);
  }
});

// סגירת המודל בכפתור Cancel
cancelBtn.addEventListener('click', () => {
  profileModal.classList.add('hidden');
});

// סגירת המודל בלחיצה מחוץ לאזור התוכן
profileModal.addEventListener('click', (e) => {
  if (e.target === profileModal) {
    profileModal.classList.add('hidden');
  }
});

// עדכון תמונת הפרופיל כשנבחר קובץ חדש ושמירה בשרת
imageUpload.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('avatar', file);

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${backendURL}/api/users/${userId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    if (!res.ok) {
      alert('Failed to update profile image');
      return;
    }

    const user = await res.json();
    profileImage.src = user.avatar ? backendURL + user.avatar : 'default-avatar.png';
    profileModal.classList.add('hidden');
  } catch (error) {
    alert('Error updating profile image');
    console.error(error);
  }
});

// --- הוספת פוסט חדש עם תמונה לשרת ולפיד ---

const postsGrid = document.getElementById('postsGrid');

// יצירת כפתור "Upload New Post" דינמי ומכניסים אותו מעל הפוסטים
const uploadPostBtn = document.createElement('button');
uploadPostBtn.textContent = 'Upload New Post';
uploadPostBtn.className = 'btn';
uploadPostBtn.style.margin = '10px 0';
postsGrid.parentNode.insertBefore(uploadPostBtn, postsGrid);

// יצירת input מוסתר לבחירת תמונות לפוסטים
const postImageUpload = document.createElement('input');
postImageUpload.type = 'file';
postImageUpload.accept = 'image/*';
postImageUpload.style.display = 'none';
document.body.appendChild(postImageUpload);

// כשמקליקים על הכפתור, פותחים את דיאלוג בחירת הקובץ
uploadPostBtn.addEventListener('click', () => {
  postImageUpload.click();
});

// כשנבחר קובץ חדש, שולחים אותו לשרת ומוסיפים את הפוסט לפיד
postImageUpload.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('image', file);
  formData.append('content', ''); // אפשר לשים טקסט לפוסט כאן

  try {
    const res = await fetch(`${backendURL}/api/posts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });

    if (!res.ok) {
      alert('Failed to upload post');
      return;
    }

    const post = await res.json();

    // מוסיפים את התמונה שהשרת החזיר לפיד
    const img = document.createElement('img');
    img.src = post.image ? backendURL + post.image : '';
    img.style.width = '100%';
    img.style.aspectRatio = '1';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '6px';
    img.style.cursor = 'pointer';
    postsGrid.appendChild(img);

    // טען פוסטים מחדש אחרי העלאת פוסט חדש
    await loadUserPosts();

  } catch (error) {
    console.error(error);
    alert('Error uploading post');
  }
});

// פונקציה לטעינת כל הפוסטים של המשתמש בפרופיל
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

    postsGrid.innerHTML = ''; // מחיקה של פוסטים קיימים

    posts.forEach(post => {
      const postDiv = document.createElement('div');
      postDiv.className = 'post';

      postDiv.innerHTML = `
        <div class="post-author">${post.author.username}</div>
        <img src="${post.image ? backendURL + post.image : ''}" alt="Post image" class="post-image" />
        <div class="post-content">${post.content || ''}</div>
        <button class="like-btn" data-postid="${post._id}">
          Like (<span class="like-count">${post.likes.length}</span>)
        </button>
      `;

      postsGrid.appendChild(postDiv);
    });

    // מאזינים לכפתורי לייק בפרופיל
    document.querySelectorAll('.like-btn').forEach(button => {
      button.addEventListener('click', async () => {
        const postId = button.getAttribute('data-postid');
        try {
          const res = await fetch(`${backendURL}/api/posts/${postId}/like`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!res.ok) {
            alert('Failed to like post');
            return;
          }
          const updatedPost = await res.json();
          button.querySelector('.like-count').textContent = updatedPost.likesCount;
        } catch (error) {
          alert('Error liking post');
          console.error(error);
        }
      });
    });

  } catch (error) {
    console.error(error);
  }
}

// טעינת פרופיל בעת טעינת הדף
window.addEventListener('DOMContentLoaded', loadUserProfile);
