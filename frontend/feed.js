// ===== DOM refs & config =====
const postsGrid  = document.getElementById('postsGrid');
const storiesBar = document.getElementById('storiesBar');
const backendURL = 'http://localhost:5000';

// ===== Avatar fallback with data URI (no network errors) =====
const DEFAULT_AVATAR_DATAURI =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="%23222222"/><circle cx="60" cy="45" r="22" fill="%23999"/><rect x="25" y="76" width="70" height="24" rx="12" fill="%23999"/></svg>';

function avatarUrl(raw) {
  if (!raw || raw === 'null' || raw === 'undefined') return DEFAULT_AVATAR_DATAURI;
  if (/^(data:|blob:|https?:\/\/)/i.test(raw)) return raw;
  return fixImageUrl(raw, 'avatar');
}
function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}


// ===== Helper to fix media URL (robust) =====
function fixImageUrl(url, type = 'generic') {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/uploads')) return backendURL + url;
  if (url.startsWith('uploads'))  return backendURL + '/' + url;

  const folder =
    type === 'avatar'     ? '/uploads/avatars/' :
    type === 'groupCover' ? '/uploads/covers/'  :
                             '/uploads/posts/';
  return backendURL + folder + url;
}

// Escape HTML
function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ===== Initial load =====
window.addEventListener('DOMContentLoaded', () => {
  loadFeed();
  loadSuggestions();
  loadStories();
});

// ===== Feed =====
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

    // 👇 פה אנחנו מערבבים את המערך כך שהסדר יהיה אקראי בכל טעינה
    const list = Array.isArray(posts) ? shuffle(posts) : [];

    postsGrid.innerHTML = '';

    list.forEach(post => {
      const postDiv = document.createElement('div');
      postDiv.className = 'insta-post';

      // media
      const media = post.image || post.video;
      let mediaTag = '';
      if (media) {
        if (/\.(mp4|webm|ogg)$/i.test(media)) {
          mediaTag = `<video src="${fixImageUrl(media)}" class="post-media" controls></video>`;
        } else {
          mediaTag = `<img src="${fixImageUrl(media)}" alt="Post media" class="post-media" />`;
        }
      }

      // author
      const author = post.author || { _id: '', username: 'Unknown', profileImage: null };
      const avatarSrc = avatarUrl(author.profileImage || author.avatar || author.image);

      // header
      const postHeader = `
        <div class="post-header">
          <a href="profile.html?userId=${author._id}" class="post-user-link">
            <img src="${avatarSrc}" class="post-avatar" alt="${escapeHtml(author.username || 'User')}" />
            <span class="post-username">${escapeHtml(author.username || 'Unknown')}</span>
          </a>
          <span class="post-time">${post.createdAt ? new Date(post.createdAt).toLocaleString() : ''}</span>
          <i class="fas fa-ellipsis-h post-options"></i>
        </div>
      `;

      // actions
      const actions = `
        <div class="post-actions">
          <i class="far fa-heart like-btn" data-postid="${post._id}" title="Like"></i>
          <i class="far fa-comment comment-btn" title="Comment"></i>
          <i class="far fa-bookmark save" title="Save"></i>
        </div>
      `;

      // likes + caption
      const likesSection = `
        <div class="post-likes">
          <span class="like-count">${post.likes?.length || 0}</span> likes
        </div>
        <div class="post-caption">
          ${escapeHtml(post.content || '')}
        </div>
      `;

      // comments (last 2)
      const commentsHTML = (post.comments || []).slice(-2).map(c => {
        const cmAuthor = c.author || { _id: '', username: 'Unknown' };
        return `<p><a href="profile.html?userId=${cmAuthor._id}" class="comment-username">${escapeHtml(cmAuthor.username)}</a> ${escapeHtml(c.text)}</p>`;
      }).join('');

      const commentsSection = `
        <div class="post-comments">
          ${post.comments?.length > 2 ? `<a href="#">View all ${post.comments.length} comments</a>` : ''}
          ${commentsHTML}
        </div>
      `;

      // add comment
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

    // like handler
    document.querySelectorAll('.like-btn').forEach(button => {
      button.addEventListener('click', async () => {
        const postId = button.getAttribute('data-postid');
        const res = await fetch(`${backendURL}/api/posts/${postId}/like`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const updated = await res.json();

        button.classList.toggle('liked');
        button.classList.contains('liked')
          ? button.classList.replace('far', 'fas')
          : button.classList.replace('fas', 'far');
        button.style.color = button.classList.contains('liked') ? 'red' : '';

        const likeCount = button.closest('.insta-post').querySelector('.like-count');
        likeCount.textContent = updated.likes.length;
      });
    });

    // focus comment
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

    // submit comment
    document.querySelectorAll('.comment-form').forEach(form => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const postId = form.getAttribute('data-postid');
        const input = form.querySelector('input[name="comment"]');
        const text  = input.value.trim();
        if (!text) return;

        await fetch(`${backendURL}/api/posts/${postId}/comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
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
    if (e.name !== 'AbortError') {
      renderResults([], 'Error while searching.');
      console.error(e);
    }
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

// ===== Suggested users =====
async function loadSuggestions() {
  const container = document.getElementById('suggestionsList');
  if (!container) return;

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${backendURL}/api/users/suggestions/random`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch suggestions');
    const users = await res.json();

    if (!Array.isArray(users) || users.length === 0) {
      container.innerHTML = `<p style="color:#888;">No suggestions right now</p>`;
      return;
    }

    container.innerHTML = users.map(u => `
      <div class="suggestion-user">
        <a class="suggestion-info"
           href="profile.html?userId=${encodeURIComponent(u._id)}"
           style="display:flex;gap:10px;align-items:center;text-decoration:none;color:#fff;">
          <img class="suggestion-avatar"
               src="${avatarUrl(u.avatar)}"
               alt="${escapeHtml(u.username || '')}">
          <div style="min-width:0">
            <div class="suggestion-username"
                 style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${escapeHtml(u.username || '')}
            </div>
            <div class="suggestion-sub"
                 style="color:#aaa;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${escapeHtml(u.fullname || '')}
            </div>
          </div>
        </a>
        <button class="follow-btn"
                data-userid="${u._id}"
                aria-label="Follow ${escapeHtml(u.username || '')}"
                title="Follow ${escapeHtml(u.username || '')}">
          Follow
        </button>
      </div>
    `).join('');

    wireSuggestionButtons();
  } catch (err) {
    console.error('❌ Failed to load suggestions:', err);
    container.innerHTML = `<p style="color:#888;">Failed to load suggestions</p>`;
  }
}

// חיבור מאזינים לכפתורי Follow (מונע כפילויות)
function wireSuggestionButtons() {
  document.querySelectorAll('.follow-btn').forEach(btn => {
    btn.removeEventListener('click', onFollowClick);
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

    if (res.ok) {
      const followed = /followed/i.test(data.message || '');
      btn.textContent = followed ? 'Following' : 'Follow';
      btn.classList.toggle('is-following', followed);
      btn.setAttribute('aria-pressed', String(followed));
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


// ===================== Stories =====================
async function loadStories() {
  const token  = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');
  if (!token || !userId || !storiesBar) return;

  try {
    const res = await fetch(`${backendURL}/api/users/${userId}/following/stories`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to load stories');
    const users = await res.json();

    storiesBar.innerHTML = users.map(u => `
      <a class="story-circle"
         href="profile.html?userId=${encodeURIComponent(u._id)}"
         title="${escapeHtml(u.username || '')}"
         aria-label="Open ${escapeHtml(u.username || '')} profile"
         style="text-decoration:none;color:inherit">
        <img src="${avatarUrl(u.avatar)}" alt="${escapeHtml(u.username || '')}" />
        <span>${escapeHtml(u.username || '')}</span>
      </a>
    `).join('');
  } catch (err) {
    console.error("❌ Failed to load stories:", err);
    storiesBar.innerHTML = `<p style="color:#888;">Failed to load stories</p>`;
  }
}

