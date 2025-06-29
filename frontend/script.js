async function handleLogin() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const res = await fetch("http://localhost:5000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();

  if (res.ok) {
    localStorage.setItem("token", data.token);
    window.location.href = "feed.html";
  } else {
    alert(data.error || "Login failed");
  }
}

async function handleRegister() {
  const username = document.getElementById("register-username").value;
  const password = document.getElementById("register-password").value;
  const email = document.getElementById("register-email").value;
  const fullname = document.getElementById("register-fullname").value;

  const res = await fetch("http://localhost:5000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, email, fullname })
  });

  const data = await res.json();

  if (res.ok) {
    alert("Registration successful! Please log in.");
    window.location.href = "login.html";
  } else {
    alert(data.error || "Registration failed");
  }
}
