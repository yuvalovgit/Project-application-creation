let token = localStorage.getItem('token');

function showLogin() {
  document.getElementById('login-form').style.display = '';
  document.getElementById('admin-content').style.display = 'none';
  document.getElementById('not-admin').style.display = 'none';
}


// Mapping of country names to coordinates (add more as needed)
const countryCoords = {
  "china": { lat: 35.8617, lng: 104.1954 },
  "india": { lat: 20.5937, lng: 78.9629 },
  "usa": { lat: 37.0902, lng: -95.7129 },
  "indonesia": { lat: -0.7893, lng: 113.9213 },
  "pakistan": { lat: 30.3753, lng: 69.3451 },
  "nigeria": { lat: 9.0820, lng: 8.6753 },
  "brazil": { lat: -14.2350, lng: -51.9253 },
  "bangladesh": { lat: 23.6850, lng: 90.3563 },
  "russia": { lat: 61.5240, lng: 105.3188 },
  "mexico": { lat: 23.6345, lng: -102.5528 },
  "israel": { lat: 31.0461, lng: 34.8516 },
  "france": { lat: 46.6034, lng: 1.8883 },
  "germany": { lat: 51.1657, lng: 10.4515 },
  "uk": { lat: 55.3781, lng: -3.4360 },
  // Add more countries as needed
};



async function showDashboard() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('admin-content').style.display = '';
  document.getElementById('not-admin').style.display = 'none';
  // Set admin name in navbar
  const adminName = localStorage.getItem('adminUsername') || 'Admin';
  document.querySelector('.navbar-user').textContent = `👤 ${adminName}`;

  // Fetch users and show them on the map
  try {
    const users = await fetchWithAuth('http://localhost:5000/api/admin/stats/users-with-location');
    showUserMap(users);
  } catch (err) {
    showUserMap([]); // fallback to empty map
  }
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
async function showUserMap(users) {
  // Remove previous map if exists
  if (window.userMapInstance) {
    window.userMapInstance.remove();
  }
  // World view, zoomed out to see all countries
  const map = L.map('userMap').setView([32, 34], 2);
  window.userMapInstance = map;
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

  users.forEach(user => {
    const locKey = user.location ? user.location.toLowerCase() : null;
    if (locKey && countryCoords[locKey]) {
      const coords = countryCoords[locKey];
      L.circleMarker([coords.lat, coords.lng], {
        radius: 14, // bigger dot
        color: '#b00', // border color
        fillColor: '#ffcc00', // fill color
        fillOpacity: 0.9,
        weight: 3
      })
        .addTo(map)
        .bindPopup(`${user.username}<br>${user.location}`);
    }
  });
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

    // Fetch users with location and show map
    const usersWithLocation = await fetchWithAuth('http://localhost:5000/api/admin/stats/users-with-location');
    showUserMap(usersWithLocation);

  } catch (err) {
    if (err.message === 'Not admin') {
      showNotAdmin();
    } else {
      showLogin();
    }
  }
}

window.onload = loadDashboard();