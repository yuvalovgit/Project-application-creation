const token = localStorage.getItem("token");

async function loadUserGroups() {
  try {
    const res = await fetch("http://localhost:5000/api/groups/mine", {
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

  const image = document.getElementById("image").files[0];
  const caption = document.getElementById("caption").value.trim();
  const groupId = document.getElementById("group-select").value;

  if (!image || !caption || !groupId) return alert("נא למלא את כל השדות");

  const formData = new FormData();
  formData.append("image", image);
  formData.append("caption", caption);
  formData.append("groupId", groupId);

  try {
    const res = await fetch("http://localhost:5000/api/posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    const data = await res.json();
    if (res.ok) {
      alert("הפוסט נוסף בהצלחה!");
      window.location.href = "profile.html";
    } else {
      alert(data.error || "שגיאה בהעלאת פוסט");
    }
  } catch (err) {
    console.error("Error uploading post:", err);
    alert("שגיאת שרת");
  }
});

loadUserGroups();
