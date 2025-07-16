const postsGrid = document.getElementById('postsGrid');
const backendURL = 'http://localhost:5000';

function fixImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return backendURL + url;
}

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
