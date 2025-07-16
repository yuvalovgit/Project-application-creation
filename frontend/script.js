async function handleLogin() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    const res = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    console.log("🔐 Login response:", data); // לוג לבדיקה

    if (res.ok) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", data.user._id); // 💥 חשוב: שומר את _id
      console.log("✅ Login successful - userId:", data.user._id);
      window.location.href = "feed.html";
    } else {
      console.warn("❌ Login failed:", data.error);
      alert(data.error || "Login failed");
    }
  } catch (err) {
    console.error("🔥 Login error:", err);
    alert("An error occurred during login.");
  }
}

async function handleRegister() {
  const username = document.getElementById("register-username").value;
  const password = document.getElementById("register-password").value;
  const email = document.getElementById("register-email").value;
  const fullname = document.getElementById("register-fullname").value;

  try {
    const res = await fetch("http://localhost:5000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, email, fullname })
    });

    const data = await res.json();
    console.log("🧾 Register response:", data);

    if (res.ok) {
      alert("Registration successful! Please log in.");
      window.location.href = "login.html";
    } else {
      console.warn("❌ Registration failed:", data.error);
      alert(data.error || "Registration failed");
    }
  } catch (err) {
    console.error("🔥 Registration error:", err);
    alert("An error occurred during registration.");
  }
}
