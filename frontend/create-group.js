// ===== Auth context =====
const token = localStorage.getItem("token");

// Pull userId from localStorage or decode from the JWT as a fallback
function getUserId() {
  let id = localStorage.getItem("userId");
  // if someone stored it as a JSON string, unquote it
  if (id && /^".*"$/.test(id)) {
    try { id = JSON.parse(id); } catch {}
  }
  if ((!id || id === "undefined" || id === "null") && token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1] || ""));
      id = payload?.user?.id || payload?.user?._id || payload?.id || payload?._id || null;
    } catch {}
  }
  return id ? String(id) : null;
}
const userId = getUserId();

function requireAuth() {
  if (!token || !userId) {
    alert("נדרש להתחבר מחדש.");
    location.href = "login.html";
    return false;
  }
  return true;
}

// ===== ID helpers =====
function normalizeId(val) {
  if (!val) return null;
  if (typeof val === "string") return val.replace(/^"|"$/g, "").trim();
  if (typeof val === "object") {
    // handle {_id}, {id}, populated user, or even ObjectId-like
    if (val._id) return String(val._id);
    if (val.id)  return String(val.id);
    try { return String(val); } catch { return null; }
  }
  return String(val);
}

function userIsMember(group, uid) {
  const uidN = normalizeId(uid);
  const arr = Array.isArray(group.members) ? group.members : [];
  return arr.some(m => normalizeId(m) === uidN);
}

// ===== API =====
const API_BASE = "http://localhost:5000/api";

async function apiCreateGroup({ name, description = "" }) {
  const res = await fetch(`${API_BASE}/groups/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ name, description })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "שגיאה ביצירת קבוצה");
  return data;
}

async function apiListGroups() {
  const res = await fetch(`${API_BASE}/groups`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("שגיאה בטעינת קבוצות");
  return res.json();
}

async function apiJoinGroup(groupId) {
  const res = await fetch(`${API_BASE}/groups/join`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ groupId })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "שגיאה בהצטרפות לקבוצה");
  return data;
}

async function apiLeaveGroup(groupId) {
  const res = await fetch(`${API_BASE}/groups/leave`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ groupId })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "שגיאה בעזיבת קבוצה");
  return data;
}

// ===== UI =====
const listEl   = document.getElementById("group-list");
const nameEl   = document.getElementById("group-name");
const createBtn= document.getElementById("create-group-btn");

async function withPending(btn, fn) {
  try { btn && (btn.disabled = true); await fn(); }
  finally { btn && (btn.disabled = false); }
}

async function createGroup() {
  if (!requireAuth()) return;
  const name = (nameEl?.value || "").trim();
  if (!name) return alert("יש להזין שם קבוצה");
  try {
    createBtn && (createBtn.disabled = true);
    await apiCreateGroup({ name });
    if (nameEl) nameEl.value = "";
    alert("הקבוצה נוצרה בהצלחה");
    await loadGroups();
  } catch (e) {
    console.error(e);
    alert(e.message || "שגיאת שרת");
  } finally {
    createBtn && (createBtn.disabled = false);
  }
}

function mkBtn(label, handler) {
  const b = document.createElement("button");
  b.textContent = label;
  b.addEventListener("click", () => withPending(b, handler));
  return b;
}

async function loadGroups() {
  if (!requireAuth()) return;
  try {
    const groups = await apiListGroups();

    // header
    listEl.innerHTML = "<h2>קבוצות קיימות</h2>";

    groups.forEach(group => {
      const isMember = userIsMember(group, userId);

      // helpful one-time debug
      console.log(`[group ${group.name}] me=${userId}`, {
        members: (group.members || []).map(m => normalizeId(m)),
        isMember
      });

      const card = document.createElement("div");
      card.className = "group-item";

      const meta = document.createElement("div");
      meta.className = "group-meta";
      meta.innerHTML = `
        <strong>${group.name}</strong>
        <small>חברים: ${Array.isArray(group.members) ? group.members.length : 0}</small>
      `;

      const actions = document.createElement("div");
      actions.className = "group-actions";

      if (isMember) {
        actions.appendChild(mkBtn(" צא מהקבוצה", async () => {
          await apiLeaveGroup(group._id);
          await loadGroups();
        }));
      } else {
        actions.appendChild(mkBtn("הצטרף", async () => {
          await apiJoinGroup(group._id);
          await loadGroups();
        }));
      }

      card.appendChild(meta);
      card.appendChild(actions);
      listEl.appendChild(card);
    });
  } catch (e) {
    console.error(e);
    alert(e.message || "שגיאת שרת");
  }
}

// Wire up and start
document.getElementById("create-group-btn")?.addEventListener("click", createGroup);
loadGroups();
document.getElementById("uploadPostSidebarBtn")?.addEventListener("click", () => {
  document.getElementById("postImageUpload")?.click();
});
