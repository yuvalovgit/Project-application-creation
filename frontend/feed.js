const postsGrid = document.getElementById('postsGrid');
const backendURL = 'http://localhost:5000';  // כתובת השרת שלך

// פונקציה לטעינת הפוסטים מהשרת כולל תגובות ולייקים
async function loadFeed() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login first');
      window.location.href = 'login.html';
      return;
    }

    const res = await fetch(`${backendURL}/api/posts/feed`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      alert('Failed to load feed');
      return;
    }

    const posts = await res.json();
    postsGrid.innerHTML = ''; // ניקוי פוסטים קודמים

    posts.forEach(post => {
      const postDiv = document.createElement('div');
      postDiv.className = 'post';

      postDiv.innerHTML = `
        <div class="post-author">${post.author.username}</div>
        <img src="${backendURL}${post.image}" alt="Post image" class="post-image" />
        <div class="post-content">${post.content || ''}</div>
        <button class="like-btn" data-postid="${post._id}">
          Like (<span class="like-count">${post.likes.length}</span>)
        </button>

        <div class="comments">
          ${post.comments.map(comment => `
            <div class="comment">
              <b>${comment.author.username}</b>: ${comment.text}
            </div>
          `).join('')}
        </div>

        <form class="comment-form" data-postid="${post._id}">
          <input type="text" name="comment" placeholder="Add a comment..." required />
          <button type="submit">Post</button>
        </form>
      `;

      postsGrid.appendChild(postDiv);
    });

    // מאזינים ללייקים
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

    // מאזינים לטפסי תגובות
    document.querySelectorAll('.comment-form').forEach(form => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const postId = form.getAttribute('data-postid');
        const input = form.querySelector('input[name="comment"]');
        const text = input.value.trim();
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

          if (!res.ok) {
            alert('Failed to post comment');
            return;
          }

          // רענון הפיד לאחר הוספת תגובה חדשה
          await loadFeed();

        } catch (error) {
          alert('Error posting comment');
          console.error(error);
        }

        input.value = ''; // ניקוי השדה
      });
    });

  } catch (error) {
    console.error(error);
    alert('Error loading feed');
  }
}

// טעינת הפיד בעת טעינת הדף
window.addEventListener('DOMContentLoaded', loadFeed);
