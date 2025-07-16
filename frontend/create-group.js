const backendURL = 'http://localhost:5000';
const token = localStorage.getItem("token");
const userId = localStorage.getItem("userId");

// פתיחה וסגירה של מודל
const modal = document.getElementById("groupModal");
const openBtn = document.getElementById("openModalBtn");
const closeBtn = document.getElementById("closeModalBtn");

openBtn.addEventListener("click", () => modal.style.display = "block");
closeBtn.addEventListener("click", () => modal.style.display = "none");
window.addEventListener("click", (e) => {
  if (e.target === modal) modal.style.display = "none";
});

// יצירת קבוצה חדשה
document.getElementById("createGroupForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("group-name").value.trim();
  const description = document.getElementById("group-description").value.trim();
  const topic = document.getElementById("group-topic").value;
  const image = document.getElementById("group-image").files[0];

  if (!name || !description || !topic) {
    return alert("Please fill all required fields.");
  }

  const formData = new FormData();
  formData.append("name", name);
  formData.append("description", description);
  formData.append("topic", topic);
  if (image) formData.append("image", image);

  try {
    const res = await fetch(`${backendURL}/api/groups/create`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });

    const data = await res.json();

    if (res.ok) {
      alert("Group created successfully");
      document.getElementById("createGroupForm").reset();
      modal.style.display = "none";
      await loadGroups();
    } else {
      alert(data.error || "Failed to create group");
    }
  } catch (err) {
    console.error("Create group error:", err);
    alert("Server error");
  }
});

// טוען קבוצות קיימות ומכניס ל־HTML
async function loadGroups() {
  try {
    const res = await fetch(`${backendURL}/api/groups`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const groups = await res.json();
    const container = document.getElementById("group-list");
    container.innerHTML = "";

    groups.forEach(group => {
      const isMember = (group.members || []).map(id => id.toString()).includes(userId);

      const div = document.createElement("div");
      div.className = "group-item";

      div.innerHTML = `
        <img src="${group.image ? backendURL + group.image : backendURL + '/uploads/default-avatar.png'}" class="group-image" />
        <div class="group-name">
          <a href="create-post.html?groupId=${group._id}">
            ${group.name}
          </a>
        </div>
        <div class="group-category">#${group.topic || 'general'}</div>
        <div class="group-buttons">
          <button onclick="toggleDescription(this)">Show Description</button>
          ${isMember
            ? `<button onclick="leaveGroup('${group._id}')">Leave Group</button>`
            : `<button onclick="joinGroup('${group._id}')">Join Group</button>`}
        </div>
        <div class="group-description-box" style="display: none;">
          ${group.description || "No description"}
        </div>
      `;

      container.appendChild(div);
    });
  } catch (err) {
    console.error("Load groups error:", err);
    alert("Server error");
  }
}

// הצטרפות לקבוצה
async function joinGroup(groupId) {
  try {
    const res = await fetch(`${backendURL}/api/groups/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ groupId })
    });

    const data = await res.json();

    if (res.ok) {
      alert("Joined group successfully");
      await loadGroups();
    } else {
      alert(data.error || "Failed to join group");
    }
  } catch (err) {
    console.error("Join group error:", err);
    alert("Server error");
  }
}

// עזיבת קבוצה
async function leaveGroup(groupId) {
  try {
    const res = await fetch(`${backendURL}/api/groups/leave`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ groupId })
    });

    const data = await res.json();

    if (res.ok) {
      alert("Left group successfully");
      await loadGroups();
    } else {
      alert(data.error || "Failed to leave group");
    }
  } catch (err) {
    console.error("Leave group error:", err);
    alert("Server error");
  }
}

// הצגת תיאור בלחיצה
function toggleDescription(button) {
  const descBox = button.parentElement.nextElementSibling;
  const isVisible = descBox.style.display === 'block';
  descBox.style.display = isVisible ? 'none' : 'block';
  button.innerText = isVisible ? 'Show Description' : 'Hide Description';
}

loadGroups();
