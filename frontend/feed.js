const postsGrid = document.getElementById('postsGrid');
const backendURL = 'http://localhost:5000';

// Load feed on page load
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
      postDiv.className = 'post';

      postDiv.innerHTML = `
        <div class="post-author">${post.author.username}</div>
        <img src="${backendURL}${post.image || post.video}" alt="Post media" class="post-image" />
        <div class="post-content">${post.content || ''}</div>
        <button class="like-btn" data-postid="${post._id}">
          Like (<span class="like-count">${post.likes.length}</span>)
        </button>
        <div class="comments">
          ${post.comments.map(comment => `<div class="comment"><b>${comment.author.username}</b>: ${comment.text}</div>`).join('')}
        </div>
        <form class="comment-form" data-postid="${post._id}">
          <input type="text" name="comment" placeholder="Add a comment..." required />
          <button type="submit">Post</button>
        </form>
      `;

      postsGrid.appendChild(postDiv);
    });

    document.querySelectorAll('.like-btn').forEach(button => {
      button.addEventListener('click', async () => {
        const postId = button.getAttribute('data-postid');
        const res = await fetch(`${backendURL}/api/posts/${postId}/like`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
        const updated = await res.json();
        button.querySelector('.like-count').textContent = updated.likesCount;
      });
    });

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

        await loadFeed(); // reload to show comment
        input.value = '';
      });
    });

  } catch (err) {
    console.error(err);
    alert('Error loading feed');
  }
}

// Search Modal Logic
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
  const username = document.getElementById('search-username').value;
  const group = document.getElementById('search-group').value;
  const date = document.getElementById('search-date').value;
  const token = localStorage.getItem('token');

  try {
    const res = await fetch(`${backendURL}/api/users/search?username=${username}&group=${group}&date=${date}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const users = await res.json();
    const container = document.getElementById('searchResults');

    if (!users.length) {
      container.innerHTML = '<p>No users found.</p>';
      return;
    }

    container.innerHTML = users.map(user => {
      const groupCount = user.groups?.length || 0;
      const created = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown';
      return `
        <div style="border-bottom: 1px solid #555; padding: 6px 0;">
          <strong>${user.username}</strong><br/>
          Groups: ${groupCount}<br/>
          Registered: ${created}
        </div>
      `;
    }).join('');

  } catch (err) {
    alert('Search failed');
    console.error(err);
  }
}
