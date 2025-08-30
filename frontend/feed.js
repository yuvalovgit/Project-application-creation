const postsGrid = document.getElementById('postsGrid');
const backendURL = 'http://localhost:5000';


// ===== Helper to fix media URL (robust) =====
function fixImageUrl(url, type = 'generic') {
  if (!url) return '';

  // אם זה כבר URL מלא – תחזיר כמו שהוא
  if (/^https?:\/\//i.test(url)) return url;

  // אם מתחיל ב-/uploads – חבר לשרת
  if (url.startsWith('/uploads')) return backendURL + url;

  // אם מתחיל בלי סלש – תוסיף
  if (url.startsWith('uploads')) return backendURL + '/' + url;

  // ברירת מחדל לפי טיפוס
  const folder =
    type === 'avatar'     ? '/uploads/avatars/'  :
    type === 'groupCover' ? '/uploads/covers/'   :
                            '/uploads/posts/';

  return backendURL + folder + url;
}

// ===== Load Feed =====
window.addEventListener('DOMContentLoaded', () => {
  loadFeed();
  loadSuggestions();
});

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
      postDiv.className = 'insta-post'; // עיצוב אינסטגרם

      const media = post.image || post.video;
      let mediaTag = '';
      if (media) {
        if (media.endsWith('.mp4')) {
          mediaTag = `<video src="${fixImageUrl(media)}" class="post-media" controls></video>`;
        } else {
          mediaTag = `<img src="${fixImageUrl(media)}" alt="Post media" class="post-media" />`;
        }
      }

      const author = post.author || { _id: '', username: 'Unknown', profileImage: '/uploads/default-avatar.png' };

      // ===== Header (נשמר בדיוק כמו אצלך) =====
      const avatarSrc = fixImageUrl(
  author.profileImage || author.avatar || author.image || '/uploads/default-avatar.png',
  'avatar'
);


      const postHeader = `
        <div class="post-header">
          <a href="profile.html?userId=${author._id}" class="post-user-link">
            <img
              src="${avatarSrc}"
              class="post-avatar"
              alt=""
              onerror="this.onerror=null; this.src='${fixImageUrl('/uploads/default-avatar.png')}';"
            />
            <span class="post-username">${author.username || 'Unknown'}</span>
          </a>
          <span class="post-time">${post.createdAt ? new Date(post.createdAt).toLocaleString() : ''}</span>
          <i class="fas fa-ellipsis-h post-options"></i>
        </div>
      `;

      // ===== Actions (אין paper-plane) =====
      const actions = `
        <div class="post-actions">
          <i class="far fa-heart like-btn" data-postid="${post._id}" title="Like"></i>
          <i class="far fa-comment comment-btn" title="Comment"></i>
          <i class="far fa-bookmark save" title="Save"></i>
        </div>
      `;

      // ===== Likes + Caption =====
      const likesSection = `
        <div class="post-likes">
          <span class="like-count">${post.likes?.length || 0}</span> likes
        </div>
        <div class="post-caption">
          ${post.content || ''}
        </div>
      `;

      // ===== Comments =====
      const commentsHTML = (post.comments || [])
        .slice(-2)
        .map(comment => {
          const commenter = comment.author || { _id: '', username: 'Unknown' };
          return `
            <p><a href="profile.html?userId=${commenter._id}" class="comment-username">${commenter.username}</a> ${comment.text}</p>
          `;
        }).join('');

      const commentsSection = `
        <div class="post-comments">
          ${post.comments?.length > 2 ? `<a href="#">View all ${post.comments.length} comments</a>` : ''}
          ${commentsHTML}
        </div>
      `;

      // ===== Add comment =====
      const addComment = `
        <form class="comment-form" data-postid="${post._id}">
          <input type="text" name="comment" class="comment-input" placeholder="Add a comment..." required />
        </form>
      `;

      postDiv.innerHTML = `
        ${postHeader}
        ${mediaTag}
        ${actions}
        ${likesSection}
        ${commentsSection}
        ${addComment}
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

        // Toggle icon + color
        button.classList.toggle('liked');
        button.classList.contains('liked')
          ? button.classList.replace('far', 'fas')  // מלא
          : button.classList.replace('fas', 'far'); // ריק
        button.style.color = button.classList.contains('liked') ? 'red' : '';

        // Update like count
        const likeCount = button.closest('.insta-post').querySelector('.like-count');
        likeCount.textContent = updated.likes.length;
      });
    });

    // ===== Comment icon -> focus & scroll to input =====
    document.querySelectorAll('.comment-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const post = btn.closest('.insta-post');
        const input = post.querySelector('.comment-input');
        if (input) {
          input.focus();
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
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

/* ===================== Search Drawer (Instagram-like) ===================== */
let searchMode = 'users'; // 'users' | 'groups'
let searchDebounceTimer = null;
let searchAbort = null;

function openUserSearchModal() {
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
}

function closeUserSearchModal() {
  const overlay = document.getElementById('modalOverlay');
  const drawer  = document.getElementById('searchDrawer');
  if (overlay) overlay.style.display = 'none';
  if (drawer)  drawer.style.display = 'none';
  renderResults([]);
}

function setActiveTab(type){
  searchMode = type;
  document.getElementById('tabUsers')?.classList.toggle('active', type==='users');
  document.getElementById('tabGroups')?.classList.toggle('active', type==='groups');
  const q = document.getElementById('searchInput')?.value.trim() || '';
  if (q) doSearch(q, searchMode); else renderResults([], 'Search '+type+'…');
}

// tab clicks
document.getElementById('tabUsers')?.addEventListener('click', () => setActiveTab('users'));
document.getElementById('tabGroups')?.addEventListener('click', () => setActiveTab('groups'));

// input & clear
document.getElementById('searchInput')?.addEventListener('input', (e)=>{
  const q = e.target.value;
  const clr = document.getElementById('searchClearBtn');
  if (clr) clr.style.display = q ? 'block' : 'none';
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(()=> doSearch(q.trim(), searchMode), 250);
});
document.getElementById('searchClearBtn')?.addEventListener('click', ()=>{
  const input = document.getElementById('searchInput');
  if (input) {
    input.value = '';
    document.getElementById('searchClearBtn').style.display = 'none';
    input.focus();
    renderResults([], 'Start typing to search…');
  }
});

async function doSearch(query, mode){
  if (!query){
    renderResults([], 'Start typing to search…');
    return;
  }

  // cancel previous
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
  } catch(e){
    if (e.name === 'AbortError') return;
    renderResults([], 'Error while searching.');
    console.error(e);
  }
}
function renderResults(items, emptyMsg){
  const list = document.getElementById('searchResultsList');
  if (!list) return;

  if (!items || !items.length){
    list.innerHTML = `<div class="empty">${emptyMsg || 'No results.'}</div>`;
    return;
  }

  const rows = items.map(item => {
    if (searchMode === 'groups'){
      const cover = fixImageUrl(
        item.cover || item.image || '/uploads/default-cover.jpg',
        'groupCover'
      );
      const members = item.members?.length || 0;
      const href = `create-post.html?groupId=${encodeURIComponent(item._id)}`;
      return `
        <a class="result-row" href="${href}">
          <img class="result-avatar" src="${cover}" onerror="this.src='${fixImageUrl('/uploads/default-cover.jpg')}'" />
          <div class="result-meta">
            <div class="result-title">${escapeHtml(item.name || 'Group')}</div>
            <div class="result-sub">${members} members</div>
          </div>
        </a>`;
    } else {
      const avatar = fixImageUrl(
        item.profileImage || item.avatar || item.image || '/uploads/default-avatar.png',
        'avatar'
      );

      // ✅ כאן תראה מה הגיע מהשרת ומה נבנה ל־URL
      console.log("👤 avatar path:", item.avatar, "=>", avatar);

      const href   = `profile.html?userId=${encodeURIComponent(item._id)}`;
      return `
        <a class="result-row" href="${href}">
          <img class="result-avatar" src="${avatar}" onerror="this.src='${fixImageUrl('/uploads/default-avatar.png')}'" />
          <div class="result-meta">
            <div class="result-title">${escapeHtml(item.username || 'user')}</div>
            <div class="result-sub">${escapeHtml(item.fullName || item.bio || '')}</div>
          </div>
        </a>`;
    }
  }).join('');

  list.innerHTML = rows;
}


// small helper used above
function escapeHtml(str=''){
  return String(str)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#39;');
}
async function loadSuggestions() {
  const container = document.getElementById('suggestionsList');
  if (!container) return;

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${backendURL}/api/users/suggestions/random`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch suggestions");
    const users = await res.json();

    container.innerHTML = users.map(u => `
      <div class="suggestion-user">
        <a class="suggestion-info" href="profile.html?userId=${encodeURIComponent(u._id)}" style="display:flex;gap:10px;align-items:center;text-decoration:none;color:#fff;">
          <img src="${fixImageUrl(u.avatar || '/uploads/default-avatar.png', 'avatar')}"
               class="suggestion-avatar"
               onerror="this.src='${fixImageUrl('/uploads/default-avatar.png')}'" />
          <div style="min-width:0">
            <div class="suggestion-username" style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${u.username}
            </div>
            <div class="suggestion-sub" style="color:#aaa;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${u.fullname || ''}
            </div>
          </div>
        </a>
        <button class="follow-btn" data-userid="${u._id}" aria-label="Follow ${u.username}">Follow</button>
      </div>
    `).join('');

    wireSuggestionButtons(); // ⬅️ מחברים מאזינים אחרי הרינדור
  } catch (err) {
    console.error("❌ Failed to load suggestions:", err);
    container.innerHTML = `<p style="color:#888;">Failed to load suggestions</p>`;
  }
}

// מחבר מאזינים לכל כפתורי Follow שנוצרו עכשיו
function wireSuggestionButtons() {
  document.querySelectorAll('.follow-btn').forEach(btn => {
    btn.removeEventListener('click', onFollowClick); // הגנה מכפילויות
    btn.addEventListener('click', onFollowClick);
  });
}

async function onFollowClick(e) {
  const btn = e.currentTarget;
  const userId = btn.dataset.userid;
  if (!userId) return;

  btn.disabled = true;
  const token = localStorage.getItem('token');

  try {
    const res = await fetch(`${backendURL}/api/users/${encodeURIComponent(userId)}/follow`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();

    // אם השרת מחזיר "Followed" / "Unfollowed" – נטפל בהתאם
    if (res.ok) {
      const followed = /followed/i.test(data.message || ''); // true אם Followed
      // אפשרות א: להחליף טקסט ולשמור מצב
      btn.textContent = followed ? 'Following' : 'Follow';
      btn.classList.toggle('is-following', followed);

      // אפשרות ב (חלופית): להסיר מההצעות אחרי Follow:
      // if (followed) btn.closest('.suggestion-user')?.remove();
    } else {
      console.error('Follow API error:', data);
      btn.textContent = 'Error';
      setTimeout(() => { btn.textContent = 'Follow'; }, 1200);
    }
  } catch (err) {
    console.error('Follow failed:', err);
    btn.textContent = 'Error';
    setTimeout(() => { btn.textContent = 'Follow'; }, 1200);
  } finally {
    btn.disabled = false;
  }
}
