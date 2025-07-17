const postsGrid = document.getElementById('postsGrid');
const backendURL = 'http://localhost:5000';

// ===== Helper to fix media URL =====
function fixImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return backendURL + url;
}

// ===== Load Feed =====
window.addEventListener('DOMContentLoaded', loadFeed);

async function loadFeed() {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Please login first');
    window.location.href = 'login.html';
    return;
  }

  try {
    const res = await fetch(`${backendURL}/api/posts/feed`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      alert('Failed to load feed');
      return;
    }

    const posts = await res.json();
    postsGrid.innerHTML = '';

    posts.forEach(post => {
      const postDiv = document.createElement('div');
      postDiv.className = 'group-post-card'; // ✅ עיצוב אחיד לפוסטים

      const media = post.image || post.video;
      let mediaTag = '';
      if (media) {
        if (media.endsWith('.mp4')) {
          mediaTag = `<video src="${fixImageUrl(media)}" class="post-image" controls></video>`;
        } else {
          mediaTag = `<img src="${fixImageUrl(media)}" alt="Post media" class="post-image" />`;
        }
      }

      const author = post.author || { _id: '', username: 'Unknown' };
      const group = post.group || null;

      const sourceLabel = group
        ? `<div class="post-source">Shared in <a href="create-post.html?groupId=${group._id}" style="color:#fa0;">${group.name || 'Group'}</a></div>`
        : `<div class="post-source">Posted by <a href="profile.html?userId=${author._id}" style="color:#0af; text-decoration:underline;">${author.username}</a></div>`;

      const commentsHTML = post.comments?.map(comment => {
        const commenter = comment.author || { _id: '', username: 'Unknown' };
        return `
          <div class="comment">
            <b><a href="profile.html?userId=${commenter._id}" style="color:#0af;">${commenter.username}</a></b>: ${comment.text}
          </div>`;
      }).join('') || '';

      postDiv.innerHTML = `
        ${sourceLabel}
        <div class="post-media">${mediaTag}</div>
        <div class="post-content">${post.content || ''}</div>
        <button class="like-btn" data-postid="${post._id}">
          ❤️ <span class="like-count">${post.likes.length}</span> likes
        </button>
        <div class="comments">${commentsHTML}</div>
        <form class="comment-form" data-postid="${post._id}">
          <input type="text" name="comment" placeholder="Add a comment..." required />
          <button type="submit">Post</button>
        </form>
      `;

      postsGrid.appendChild(postDiv);
    });

    // ===== Like Button Listener =====
    document.querySelectorAll('.like-btn').forEach(button => {
      button.addEventListener('click', async () => {
        const postId = button.getAttribute('data-postid');
        const res = await fetch(`${backendURL}/api/posts/${postId}/like`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` }
        });
        const updated = await res.json();
        button.querySelector('.like-count').textContent = updated.likes.length;
      });
    });

    // ===== Comment Submit =====
    document.querySelectorAll('.comment-form').forEach(form => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const postId = form.getAttribute('data-postid');
        const input = form.querySelector('input[name="comment"]');
        const text = input.value.trim();
        if (!text) return;

        await fetch(`${backendURL}/api/posts/${postId}/comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ text })
        });

        await loadFeed();
        input.value = '';
      });
    });

  } catch (err) {
    console.error('Error loading feed:', err);
    alert('Error loading feed');
  }
}

// ====== Search Modal Functions ======

function openUserSearchModal() {
  document.getElementById('modalOverlay').style.display = 'block';
  document.getElementById('userSearchModal').style.display = 'block';
}

function closeUserSearchModal() {
  document.getElementById('modalOverlay').style.display = 'none';
  document.getElementById('userSearchModal').style.display = 'none';
  document.getElementById('searchResults').innerHTML = '';
}

async function searchUsers() {
  const username = document.getElementById('search-username').value.trim();
  const token = localStorage.getItem('token');
  const container = document.getElementById('searchResults');
  container.innerHTML = '';

  try {
    // === חיפוש משתמשים ===
    const userRes = await fetch(`${backendURL}/api/users/search?username=${username}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const users = await userRes.json();

    container.innerHTML += `<h3>👤 Users</h3>`;
    if (users.length) {
      container.innerHTML += users.map(user => `
        <div style="border-bottom: 1px solid #555; padding: 6px 0;">
          <a href="profile.html?userId=${user._id}" style="color:#0af; text-decoration:underline;">
            <strong>${user.username}</strong>
          </a><br/>
          Registered: ${new Date(user.createdAt).toLocaleDateString()}
        </div>
      `).join('');
    } else {
      container.innerHTML += '<p>No users found.</p>';
    }

    // === חיפוש קבוצות ===
    const groupRes = await fetch(`${backendURL}/api/groups/search?name=${username}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const groups = await groupRes.json();

    container.innerHTML += `<h3 style="margin-top:1em;">👥 Groups</h3>`;
    if (groups.length) {
      container.innerHTML += groups.map(group => `
        <div style="border-bottom: 1px solid #555; padding: 6px 0;">
          <a href="create-post.html?groupId=${group._id}" style="color:#fa0; text-decoration:underline;">
            <strong>${group.name}</strong>
          </a><br/>
          Members: ${group.members?.length || 0}
        </div>
      `).join('');
    } else {
      container.innerHTML += '<p>No groups found.</p>';
    }

  } catch (err) {
    console.error('Search failed:', err);
    container.innerHTML = '<p style="color:red;">Error occurred while searching.</p>';
  }
}
