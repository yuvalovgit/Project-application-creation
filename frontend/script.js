async function login() {
  const username = document.getElementById("login-username").value;
  const password = document.getElementById("login-password").value;
  const msg = document.getElementById("login-msg");

  try {
    const res = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    if (res.ok) {
      localStorage.setItem("token", data.token);
      window.location.href = "feed.html";
    } else {
      msg.textContent = data.error || "שגיאה בהתחברות";
      msg.className = "message error";
    }
  } catch (err) {
    msg.textContent = "שגיאה בשרת";
    msg.className = "message error";
  }
}

async function register() {
  const username = document.getElementById("register-username").value;
  const password = document.getElementById("register-password").value;
  const msg = document.getElementById("register-msg");

  try {
    const res = await fetch("http://localhost:5000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    if (res.ok) {
      msg.textContent = "נרשמת בהצלחה! כעת תוכל להתחבר";
      msg.className = "message";
    } else {
      msg.textContent = data.error || "שגיאה בהרשמה";
      msg.className = "message error";
    }
  } catch (err) {
    msg.textContent = "שגיאה בשרת";
    msg.className = "message error";
  }
}
