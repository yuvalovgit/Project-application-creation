const token = localStorage.getItem("token");
const userId = localStorage.getItem("userId");

// צור קבוצה חדשה
async function createGroup() {
  const name = document.getElementById("group-name").value.trim();
  const description = ""; // אופציונלי - אפשר להוסיף בעתיד

  if (!name) return alert("יש להזין שם קבוצה");

  try {
    const res = await fetch("http://localhost:5000/api/groups/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ name, description })
    });

    const data = await res.json();

    if (res.ok) {
      alert("הקבוצה נוצרה בהצלחה");
      document.getElementById("group-name").value = "";
      await loadGroups();
    } else {
      alert(data.error || "שגיאה ביצירת קבוצה");
    }
  } catch (err) {
    console.error("Create group error:", err);
    alert("שגיאת שרת");
  }
}

// טען קבוצות קיימות
async function loadGroups() {
  try {
    const res = await fetch("http://localhost:5000/api/groups", {
      headers: { Authorization: `Bearer ${token}` }
    });

    const groups = await res.json();
    const container = document.getElementById("group-list");
    container.innerHTML = "<h2>קבוצות קיימות</h2>";

    groups.forEach(group => {
        console.log("👉 group.members:", group.members);
      console.log("👉 userId:", userId);
      const isMember = (group.members || []).map(id => id.toString()).includes(userId);

      const div = document.createElement("div");
      div.className = "group-item";

      div.innerHTML = `
        <strong>${group.name}</strong><br/>
        ${isMember
          ? `<button onclick="leaveGroup('${group._id}')">🚪 צא מהקבוצה</button>`
          : `<button onclick="joinGroup('${group._id}')">הצטרף</button>`}
      `;

      container.appendChild(div);
    });
  } catch (err) {
    console.error("Load groups error:", err);
    alert("שגיאת שרת");
  }
}

// הצטרפות לקבוצה
async function joinGroup(groupId) {
  try {
    const res = await fetch("http://localhost:5000/api/groups/join", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ groupId })
    });

    const data = await res.json();

    if (res.ok) {
      alert("הצטרפת לקבוצה בהצלחה");
      await loadGroups(); // פה שמנו await
    } else {
      alert(data.error || "שגיאה בהצטרפות לקבוצה");
    }
  } catch (err) {
    console.error("Join group error:", err);
    alert("שגיאת שרת");
  }
}

// עזיבת קבוצה
async function leaveGroup(groupId) {
  try {
    const res = await fetch("http://localhost:5000/api/groups/leave", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ groupId })
    });

    const data = await res.json();

    if (res.ok) {
      alert("עזבת את הקבוצה בהצלחה");
      await loadGroups(); // גם כאן שמנו await
    } else {
      alert(data.error || "שגיאה בעזיבת קבוצה");
    }
  } catch (err) {
    console.error("Leave group error:", err);
    alert("שגיאת שרת");
  }
}

// טען קבוצות בטעינת עמוד
loadGroups();
