const token = localStorage.getItem("token");
const backendURL = "http://localhost:5000";

async function loadUserGroups() {
  try {
    const res = await fetch(`${backendURL}/api/groups/mine`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const groups = await res.json();
    const select = document.getElementById("group-select");

    groups.forEach(group => {
      const option = document.createElement("option");
      option.value = group._id;
      option.textContent = group.name;
      select.appendChild(option);
    });
  } catch (err) {
    alert("שגיאה בטעינת קבוצות");
    console.error(err);
  }
}

document.getElementById("postForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const file = document.getElementById("file").files[0];
  const content = document.getElementById("content").value.trim();
  const groupId = document.getElementById("group-select").value;

  if (!file || !content || !groupId) {
    alert("נא למלא את כל השדות");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);            // file must match backend multer config
  formData.append("content", content);
  formData.append("group", groupId);        // match backend post field

  try {
    const res = await fetch(`${backendURL}/api/posts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });

    const data = await res.json();
    if (res.ok) {
      alert("הפוסט פורסם בהצלחה!");
      window.location.href = "profile.html"; // redirect to your profile page
    } else {
      alert(data.error || "שגיאה בהעלאת פוסט");
    }
  } catch (err) {
    console.error("Error uploading post:", err);
    alert("שגיאת שרת");
  }
});

loadUserGroups();
