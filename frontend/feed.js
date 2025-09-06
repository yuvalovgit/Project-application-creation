/* ================================
   Feed JS – Search Modal + Robust Feed (media+caption fix)
   ================================ */

/* ====== Auth / API base ====== */
const API_BASE = "http://localhost:5000/api";
const API_ORIGIN = API_BASE.replace(/\/api$/, "");
const token = localStorage.getItem("token");
const CURRENT_USER_ID = localStorage.getItem("userId");

/* ====== Auth guard ====== */
function requireAuth() {
  if (!token) {
    alert("נדרש להתחבר מחדש.");
    window.location.href = "login.html";
    return false;
  }
  return true;
}

/* ====== Modal Elements ====== */
const modal      = document.getElementById("userSearchModal");
const overlay    = document.getElementById("modalOverlay");
const openBtn    = document.getElementById("openSearchBtn");
const resultsEl  = document.getElementById("searchResults");

const inputUser  = document.getElementById("search-username");
const inputGroup = document.getElementById("search-group");
const inputDate  = document.getElementById("search-date");

/* ====== Local cache of all users ====== */
let allUsers = [];
let loadedAllUsers = false;

/* ====== Utilities ====== */
function openUserSearchModal() {
  if (!requireAuth()) return;
  overlay.style.display = "block";
  modal.style.display = "block";
  if (!loadedAllUsers) loadAllUsers(); else renderUsers(allUsers);
}
function closeUserSearchModal() {
  overlay.style.display = "none";
  modal.style.display = "none";
}
window.closeUserSearchModal = closeUserSearchModal;

function clearResults() { resultsEl.innerHTML = ""; }

function userRow(u) {
  const username = u.username || u.userName || u.name || "(no username)";
  const fullName = u.fullName || u.displayName || "";
  const groups   = Array.isArray(u.groups) ? u.groups : [];
  const id       = u._id || u.id;

  const wrapper = document.createElement("div");
  wrapper.style.padding = "8px";
  wrapper.style.borderBottom = "1px solid #333";
  wrapper.style.display = "flex";
  wrapper.style.alignItems = "center";
  wrapper.style.justifyContent = "space-between";
  wrapper.style.gap = "10px";

  const left = document.createElement("div");
  left.innerHTML = `
    <div style="font-weight:600">${escapeHTML(username)}</div>
    <div style="font-size:12px;color:#aaa">${escapeHTML(fullName)}</div>
    ${groups.length ? `<div style="font-size:12px;color:#888">Groups: ${groups.map(g => escapeHTML(g.name || g)).join(", ")}</div>` : ""}
  `;

  const right = document.createElement("div");
  const viewBtn = document.createElement("button");
  viewBtn.textContent = "View";
  viewBtn.style.padding = "6px 10px";
  viewBtn.style.background = "#0577c3";
  viewBtn.style.color = "#fff";
  viewBtn.style.border = "none";
  viewBtn.style.borderRadius = "6px";
  viewBtn.style.cursor = "pointer";
  viewBtn.addEventListener("click", () => {
    window.location.href = `profile.html?user=${encodeURIComponent(id)}`;
  });

  right.appendChild(viewBtn);
  wrapper.appendChild(left);
  wrapper.appendChild(right);
  return wrapper;
}

function renderUsers(list) {
  clearResults();
  if (!list || list.length === 0) {
    resultsEl.innerHTML = `<div style="color:#aaa;">No users found.</div>`;
    return;
  }
  list.forEach(u => resultsEl.appendChild(userRow(u)));
}

function escapeHTML(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* ====== API calls (Users) ====== */
async function fetchAllUsers() {
  const res = await fetch(`${API_BASE}/users`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("שגיאה בטעינת משתמשים");
  return res.json();
}
async function fetchSearchUsers({ username, group, date }) {
  const q = new URLSearchParams();
  if (username) q.set("username", username);
  if (group)    q.set("group", group);
  if (date)     q.set("date", date);
  const res = await fetch(`${API_BASE}/users/search?${q.toString()}`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("שגיאה בחיפוש משתמשים");
  return res.json();
}

/* ====== Load + Search (Users) ====== */
async function loadAllUsers() {
  try {
    resultsEl.innerHTML = `<div style="color:#aaa;">Loading users…</div>`;
    const data = await fetchAllUsers();
    allUsers = Array.isArray(data) ? data : (data.users || []);
    loadedAllUsers = true;
    renderUsers(allUsers);
  } catch (e) {
    console.error("loadAllUsers error:", e);
    resultsEl.innerHTML = `<div style="color:#f55;">${e.message || "שגיאת שרת"}</div>`;
  }
}
function localFilterUsers({ username, group, date }) {
  const uname = (username || "").trim().toLowerCase();
  const gname = (group || "").trim().toLowerCase();
  const d     = (date || "").trim();

  return allUsers.filter(u => {
    const uUser = (u.username || u.userName || u.name || "").toLowerCase();
    const uFull = (u.fullName || u.displayName || "").toLowerCase();
    const nameOk = !uname || uUser.includes(uname) || uFull.includes(uname);

    const groups = Array.isArray(u.groups) ? u.groups : [];
    const groupOk = !gname || groups.some(g => ((g?.name || g || "").toLowerCase()).includes(gname));

    let dateOk = true;
    if (d && u.createdAt) {
      try {
        const target = new Date(d);
        const created = new Date(u.createdAt);
        dateOk = created >= target;
      } catch {}
    }
    return nameOk && groupOk && dateOk;
  });
}
async function searchUsers() {
  if (!loadedAllUsers) await loadAllUsers();
  const params = { username: inputUser.value, group: inputGroup.value, date: inputDate.value };
  renderUsers(localFilterUsers(params));
}
window.searchUsers = searchUsers;

let debounceT;
[inputUser, inputGroup, inputDate].forEach(el => {
  el?.addEventListener("input", () => {
    clearTimeout(debounceT);
    debounceT = setTimeout(searchUsers, 200);
  });
});
openBtn?.addEventListener("click", e => { e.preventDefault(); openUserSearchModal(); });
overlay?.addEventListener("click", closeUserSearchModal);

/* =======================================================
   FEED LOGIC (find media anywhere + auth-protected blobs)
   ======================================================= */
const postsGrid = document.getElementById("postsGrid");

const jsonFetch = async (url, options = {}) => {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
};

function toAbsolute(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return API_ORIGIN + url;
  return `${API_ORIGIN}/${url}`;
}

function timeAgo(dateInput) {
  const d = (dateInput instanceof Date) ? dateInput : new Date(dateInput);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (!Number.isFinite(s)) return "";
  const units = [["y",31536000],["mo",2592000],["w",604800],["d",86400],["h",3600],["m",60],["s",1]];
  for (const [label, secs] of units) {
    const v = Math.floor(s / secs);
    if (v >= 1) return `${v}${label}`;
  }
  return "now";
}

/* ---------- Generic scanners (handles nested objects/arrays) ---------- */
const IMG_EXT = /\.(jpg|jpeg|png|gif|webp|avif)$/i;
const VID_EXT = /\.(mp4|webm|ogg|mov)$/i;

function findFirstUrl(obj) {
  let found = "";
  const seen = new Set();
  (function walk(x) {
    if (!x || found) return;
    if (typeof x === "string") {
      if (IMG_EXT.test(x.split("?")[0] || "") || VID_EXT.test(x.split("?")[0] || "")) {
        found = x;
      }
      return;
    }
    if (typeof x !== "object") return;
    if (seen.has(x)) return;
    seen.add(x);
    if (Array.isArray(x)) {
      for (const v of x) { walk(v); if (found) return; }
    } else {
      for (const k of Object.keys(x)) {
        walk(x[k]); if (found) return;
      }
    }
  })(obj);
  return found;
}

function findCaption(obj) {
  let best = "";
  const keysOrder = ["caption","text","description","title","content","body"];
  // Try direct string fields by preferred keys
  for (const k of keysOrder) {
    if (typeof obj?.[k] === "string" && obj[k].trim()) return obj[k];
    if (typeof obj?.[k]?.en === "string") return obj[k].en; // sometimes i18n
  }
  // Fallback: scan any string-ish small field
  (function walk(x) {
    if (best) return;
    if (!x) return;
    if (typeof x === "string" && x.length > 0 && x.length <= 300) {
      best = x;
      return;
    }
    if (typeof x !== "object") return;
    if (Array.isArray(x)) {
      for (const v of x) { walk(v); if (best) return; }
    } else {
      for (const k of Object.keys(x)) {
        if (/caption|text|desc|title|content/i.test(k) && typeof x[k] === "string" && x[k].trim()) {
          best = x[k]; return;
        }
      }
      for (const k of Object.keys(x)) { walk(x[k]); if (best) return; }
    }
  })(obj);
  return best || "";
}

/* ---------- Normalize any payload shape ---------- */
function normalizePosts(payload) {
  const arr = Array.isArray(payload) ? payload : (payload.posts || payload.data || []);
  return arr.map(p => {
    // author / username
    const a = p.author || p.user || p.owner || {};
    const username =
      p.username || p.userName || a.username || a.userName || a.name || "user";
    const avatar = a.avatar || a.profileImage || p.avatar || "";

    // media
    let mediaUrl =
      p.mediaUrl || p.media || p.fileUrl || p.filePath || p.imageUrl || p.videoUrl ||
      (Array.isArray(p.images) && p.images[0]) ||
      (Array.isArray(p.files) && (p.files[0]?.url || p.files[0]?.path || p.files[0])) || "";

    if (!mediaUrl) {
      // deep search for any media-like URL
      mediaUrl = findFirstUrl(p);
    }
    if (mediaUrl) mediaUrl = toAbsolute(mediaUrl);

    // caption
    let caption = p.caption || p.text || p.description || "";
    if (!caption) caption = findCaption(p);

    // likes
    let likesCount = 0;
    let didLike = false;
    if (Array.isArray(p.likes)) {
      likesCount = p.likes.length;
      if (CURRENT_USER_ID) {
        didLike = p.likes.some(l => String(l?._id || l?.id || l) === String(CURRENT_USER_ID));
      } else if (p.likedByMe) {
        didLike = !!p.likedByMe;
      }
    } else if (typeof p.likesCount === "number") {
      likesCount = p.likesCount;
      didLike = !!p.likedByMe;
    }

    return {
      id: p._id || p.id,
      username,
      avatar,
      caption,
      mediaUrl,
      createdAt: p.createdAt || p.time || p.date || new Date().toISOString(),
      likes: likesCount,
      didLike,
      group: p.group || p.groupId || null,
      _raw: p // keep for debugging if needed
    };
  });
}

/* ---------- Fetch feed (try common endpoints) ---------- */
async function fetchFeed({ page = 1, limit = 10 } = {}) {
  const candidates = [
    `${API_BASE}/posts/feed?page=${page}&limit=${limit}`,
    `${API_BASE}/posts?page=${page}&limit=${limit}`,
    `${API_BASE}/feed?page=${page}&limit=${limit}`
  ];
  let lastErr;
  for (const url of candidates) {
    try {
      const data = await jsonFetch(url);
      const posts = normalizePosts(data);
      const hasMore =
        (data.totalPages && data.page && data.page < data.totalPages) ||
        data.nextPage || data.hasMore || posts.length === limit;
      return { posts, hasMore: !!hasMore };
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("No feed endpoint responded");
}

/* ---------- Likes with fallbacks ---------- */
async function toggleLike(postId, like) {
  const attempts = like
    ? [
        { m:"POST",   u:`${API_BASE}/posts/${postId}/like` },
        { m:"POST",   u:`${API_BASE}/posts/${postId}/likes` },
        { m:"PUT",    u:`${API_BASE}/posts/${postId}/like` },
      ]
    : [
        { m:"DELETE", u:`${API_BASE}/posts/${postId}/like` },
        { m:"DELETE", u:`${API_BASE}/posts/${postId}/likes` },
        { m:"PUT",    u:`${API_BASE}/posts/${postId}/unlike` },
      ];
  let lastErr;
  for (const t of attempts) {
    try {
      await jsonFetch(t.u, { method: t.m });
      return;
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("Like action failed");
}

/* ---------- Media loader that works with protected URLs ---------- */
async function createMediaElement(url) {
  if (!url) return null;
  const ext = (url.split("?")[0] || "").toLowerCase();
  const res = await fetch(url, { headers: { "Authorization": `Bearer ${token}` }});
  if (!res.ok) throw new Error("Failed to fetch media");
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  if (VID_EXT.test(ext)) {
    const v = document.createElement("video");
    v.src = objectUrl;
    v.controls = true;
    v.style.width = "100%";
    v.style.maxHeight = "80vh";
    return v;
  }
  const img = document.createElement("img");
  img.src = objectUrl;
  img.alt = "post";
  img.style.width = "100%";
  img.style.objectFit = "contain";
  img.loading = "lazy";
  return img;
}

/* ---------- Rendering ---------- */
function renderPostCard(p) {
  const card = document.createElement("article");
  card.className = "post-card";
  card.style.border = "1px solid #222";
  card.style.borderRadius = "12px";
  card.style.overflow = "hidden";
  card.style.background = "#111";

  // header
  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.gap = "10px";
  header.style.padding = "12px 14px";

  const avatar = document.createElement("img");
  avatar.src = p.avatar ? toAbsolute(p.avatar) : "images/profile/default-avatar.png";
  avatar.alt = `${p.username} avatar`;
  avatar.style.width = "36px";
  avatar.style.height = "36px";
  avatar.style.objectFit = "cover";
  avatar.style.borderRadius = "50%";
  avatar.style.border = "1px solid #333";

  const who = document.createElement("div");
  who.innerHTML = `
    <div style="font-weight:600">${escapeHTML(p.username)}</div>
    <div style="font-size:12px;color:#aaa">${escapeHTML(p.group?.name || p.group || "")}</div>
  `;

  const when = document.createElement("div");
  when.textContent = timeAgo(p.createdAt);
  when.style.marginLeft = "auto";
  when.style.color = "#888";
  when.style.fontSize = "12px";

  header.appendChild(avatar); header.appendChild(who); header.appendChild(when);

  // media
  const mediaWrap = document.createElement("div");
  mediaWrap.style.background = "#000";
  mediaWrap.style.display = "flex";
  mediaWrap.style.alignItems = "center";
  mediaWrap.style.justifyContent = "center";
  mediaWrap.style.maxHeight = "80vh";

  if (p.mediaUrl) {
    createMediaElement(p.mediaUrl)
      .then(el => { if (el) mediaWrap.appendChild(el); })
      .catch(err => {
        console.error("media load failed", err);
        const link = document.createElement("a");
        link.href = p.mediaUrl; link.target = "_blank";
        link.textContent = "Open attachment";
        link.style.padding = "20px";
        mediaWrap.appendChild(link);
      });
  }

  // actions
  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.alignItems = "center";
  actions.style.gap = "12px";
  actions.style.padding = "10px 14px";

  const likeBtn = document.createElement("button");
  likeBtn.style.background = "transparent";
  likeBtn.style.border = "none";
  likeBtn.style.fontSize = "20px";
  likeBtn.style.cursor = "pointer";
  likeBtn.style.color = p.didLike ? "#e74c3c" : "#fff";
  likeBtn.innerHTML = p.didLike ? `<i class="fas fa-heart"></i>` : `<i class="far fa-heart"></i>`;
  likeBtn.setAttribute("aria-label", p.didLike ? "Unlike" : "Like");

  const likeCount = document.createElement("span");
  likeCount.textContent = `${p.likes || 0}`;
  likeCount.style.color = "#ddd";
  likeCount.style.fontSize = "14px";

  likeBtn.addEventListener("click", async () => {
    try {
      likeBtn.disabled = true;
      const willLike = !p.didLike;
      // optimistic UI
      p.didLike = willLike;
      p.likes = Math.max(0, (p.likes || 0) + (willLike ? 1 : -1));
      likeBtn.style.color = willLike ? "#e74c3c" : "#fff";
      likeBtn.innerHTML = willLike ? `<i class="fas fa-heart"></i>` : `<i class="far fa-heart"></i>`;
      likeBtn.setAttribute("aria-label", willLike ? "Unlike" : "Like");
      likeCount.textContent = `${p.likes}`;
      await toggleLike(p.id, willLike);
    } catch (e) {
      // revert on failure
      p.didLike = !p.didLike;
      p.likes = Math.max(0, (p.likes || 0) + (p.didLike ? 1 : -1));
      likeBtn.style.color = p.didLike ? "#e74c3c" : "#fff";
      likeBtn.innerHTML = p.didLike ? `<i class="fas fa-heart"></i>` : `<i class="far fa-heart"></i>`;
      likeCount.textContent = `${p.likes}`;
      console.error(e);
      alert("Failed to update like.");
    } finally {
      likeBtn.disabled = false;
    }
  });

  actions.appendChild(likeBtn);
  actions.appendChild(likeCount);

  // caption
  const cap = document.createElement("div");
  cap.style.padding = "0 14px 12px";
  cap.style.whiteSpace = "pre-wrap";
  cap.style.wordBreak = "break-word";
  cap.innerHTML = `<span style="font-weight:600;margin-right:6px;">${escapeHTML(p.username)}</span>${escapeHTML(p.caption || "")}`;

  card.appendChild(header);
  if (p.mediaUrl) card.appendChild(mediaWrap);
  card.appendChild(actions);
  card.appendChild(cap);

  return card;
}

function renderPosts(posts) {
  if (!posts || posts.length === 0) {
    if (!postsGrid.dataset.hasAny) {
      const empty = document.createElement("div");
      empty.style.color = "#aaa";
      empty.style.textAlign = "center";
      empty.style.padding = "40px 0";
      empty.textContent = "No posts yet.";
      postsGrid.appendChild(empty);
    }
    return;
  }
  postsGrid.dataset.hasAny = "1";
  posts.forEach(p => postsGrid.appendChild(renderPostCard(p)));
}

/* ---------- Pagination ---------- */
let feedPage = 1;
let feedHasMore = true;
const loadMoreBtn = document.createElement("button");
loadMoreBtn.textContent = "Load more";
loadMoreBtn.style.margin = "20px auto";
loadMoreBtn.style.display = "none";
loadMoreBtn.style.padding = "10px 16px";
loadMoreBtn.style.border = "1px solid #333";
loadMoreBtn.style.background = "#111";
loadMoreBtn.style.color = "#fff";
loadMoreBtn.style.borderRadius = "8px";
loadMoreBtn.style.cursor = "pointer";
loadMoreBtn.addEventListener("click", loadNextPage);
postsGrid?.after(loadMoreBtn);

async function loadNextPage() {
  if (!feedHasMore) return;
  loadMoreBtn.disabled = true;
  try {
    const { posts, hasMore } = await fetchFeed({ page: feedPage, limit: 10 });
    renderPosts(posts);
    feedHasMore = hasMore;
    feedPage += 1;
  } catch (e) {
    console.error(e);
    alert("Failed to load feed.");
    feedHasMore = false;
  } finally {
    loadMoreBtn.disabled = false;
    loadMoreBtn.style.display = feedHasMore ? "block" : "none";
  }
}

/* ====== Init ====== */
(async function initFeed() {
  if (!requireAuth()) return;
  try {
    const { posts, hasMore } = await fetchFeed({ page: 1, limit: 10 });
    // show one item in console to verify fields during dev
    console.log("FEED sample:", posts[0]);
    renderPosts(posts);
    feedHasMore = hasMore;
    feedPage = 2;
    loadMoreBtn.style.display = hasMore ? "block" : "none";
  } catch (e) {
    console.error(e);
    postsGrid.innerHTML = `<div style="color:#f55; padding:20px;">Could not load feed.</div>`;
  }
})();
