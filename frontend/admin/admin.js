let token = localStorage.getItem('token');

function showLogin() {
  document.getElementById('login-form').style.display = '';
  document.getElementById('admin-content').style.display = 'none';
  document.getElementById('not-admin').style.display = 'none';
}

function showDashboard() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('admin-content').style.display = '';
  document.getElementById('not-admin').style.display = 'none';
  // Set admin name in navbar
  const adminName = localStorage.getItem('adminUsername') || 'Admin';
  document.querySelector('.navbar-user').textContent = `👤 ${adminName}`;
}

function showNotAdmin() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('admin-content').style.display = 'none';
  document.getElementById('not-admin').style.display = '';
}

async function login() {
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  document.getElementById('login-error').textContent = '';
  try {
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) throw new Error('Login failed');
    const data = await res.json();
    token = data.token;
    localStorage.setItem('token', token);
    localStorage.setItem('adminUsername', username); // Save username
    loadDashboard();
  } catch (err) {
    document.getElementById('login-error').textContent = 'Invalid username or password';
  }
}

async function fetchWithAuth(url) {
  const res = await fetch(url, {
    headers: { Authorization: 'Bearer ' + token }
  });
  if (res.status === 403) throw new Error('Not admin');
  return res.json();
}

async function loadDashboard() {
  if (!token) {
    showLogin();
    return;
  }
  try {
    // Total users
    const usersData = await fetchWithAuth('http://localhost:5000/api/admin/stats/users');
    document.getElementById('total-users').textContent = usersData.totalUsers;

    // Posts per user
    const postsPerUser = await fetchWithAuth('http://localhost:5000/api/admin/stats/posts-per-user');
    const userLabels = postsPerUser.map(u => u.username);
    const userCounts = postsPerUser.map(u => u.postCount);

    new Chart(document.getElementById('postsPerUserChart'), {
      type: 'bar',
      data: {
        labels: userLabels,
        datasets: [{
          label: 'Posts per User',
          data: userCounts,
          backgroundColor: '#2a4d8f99'
        }]
      },
      options: { responsive: true }
    });

    // Posts per day
    const postsPerDay = await fetchWithAuth('http://localhost:5000/api/admin/stats/posts-per-day');
    const dayLabels = postsPerDay.map(d => d._id);
    const dayCounts = postsPerDay.map(d => d.count);

    new Chart(document.getElementById('postsPerDayChart'), {
      type: 'line',
      data: {
        labels: dayLabels,
        datasets: [{
          label: 'Posts per Day',
          data: dayCounts,
          backgroundColor: '#b00',
          borderColor: '#b00',
          fill: false
        }]
      },
      options: { responsive: true }
    });

    showDashboard();
  } catch (err) {
    if (err.message === 'Not admin') {
      showNotAdmin();
    } else {
      showLogin();
    }
  }
}

window.onload = loadDashboard;