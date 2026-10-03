// Colochess Admin Dashboard Client Controller
const API_BASE = window.location.origin;

function getAuthHeaders() {
  const token = localStorage.getItem('colochess_admin_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
}

async function apiFetch(path, options = {}) {
  const headers = { ...getAuthHeaders(), ...(options.headers || {}) };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401 && !path.includes('/login')) {
    localStorage.removeItem('colochess_admin_token');
    window.location.href = 'index.html';
    return null;
  }
  return res.json();
}

// 1. Authentication
async function login(username, password) {
  const res = await fetch(`${API_BASE}/admin/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (data.status === 200 && data.token) {
    localStorage.setItem('colochess_admin_token', data.token);
    window.location.href = 'dashboard.html';
  } else {
    alert(data.message || 'Login failed');
  }
}

function logout() {
  localStorage.removeItem('colochess_admin_token');
  document.cookie = 'admin_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  window.location.href = 'index.html';
}

// 2. Dashboard Analytics
async function loadStats() {
  const data = await apiFetch('/admin/api/stats');
  if (!data) return;
  document.getElementById('total-users').innerText = Number(data.total_users).toLocaleString();
  document.getElementById('total-points').innerText = Number(data.total_points).toLocaleString();
  document.getElementById('pending-withdrawals').innerText = Number(data.pending_withdrawals).toLocaleString();
  document.getElementById('completed-withdrawals').innerText = Number(data.completed_withdrawals).toLocaleString();
}

// 3. User Management
async function loadUsers(page = 1, query = '') {
  const data = await apiFetch(`/admin/api/users?page=${page}&q=${encodeURIComponent(query)}`);
  if (!data) return;
  const tbody = document.getElementById('users-tbody');
  tbody.innerHTML = '';

  data.users.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.id}</td>
      <td><strong>${escapeHtml(u.name)}</strong></td>
      <td>${escapeHtml(u.email)}</td>
      <td><span class="badge badge-primary">${Number(u.points).toLocaleString()} pts</span></td>
      <td><code>${escapeHtml(u.device_id || 'N/A')}</code></td>
      <td>${escapeHtml(u.referral_code || '')}</td>
      <td>
        <span class="badge badge-${u.status === 1 ? 'danger' : 'success'}">
          ${u.status === 1 ? 'Banned' : 'Active'}
        </span>
      </td>
      <td>
        <button class="btn btn-sm btn-outline-warning" onclick="editUserPoints(${u.id}, ${u.points})">Edit Pts</button>
        <button class="btn btn-sm btn-outline-${u.status === 1 ? 'success' : 'danger'}" onclick="toggleUserBan(${u.id}, ${u.status === 1 ? 0 : 1})">
          ${u.status === 1 ? 'Unban' : 'Ban'}
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function editUserPoints(userId, currentPoints) {
  const newPoints = prompt('Enter new point balance:', currentPoints);
  if (newPoints === null || isNaN(newPoints)) return;

  const res = await apiFetch('/admin/api/users/update', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, points: parseInt(newPoints, 10) }),
  });

  if (res?.status === 200) {
    loadUsers();
  } else {
    alert(res?.message || 'Error updating points');
  }
}

async function toggleUserBan(userId, newStatus) {
  if (!confirm(`Are you sure you want to ${newStatus === 1 ? 'BAN' : 'UNBAN'} this user?`)) return;

  const res = await apiFetch('/admin/api/users/update', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, status: newStatus }),
  });

  if (res?.status === 200) {
    loadUsers();
  } else {
    alert(res?.message || 'Error updating user status');
  }
}

// 4. Withdrawal Management
async function loadWithdrawals(status = 'pending') {
  const data = await apiFetch(`/admin/api/withdrawals?status=${status}`);
  if (!data) return;
  const tbody = document.getElementById('withdrawals-tbody');
  tbody.innerHTML = '';

  data.withdrawals.forEach(w => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${w.id}</td>
      <td><strong>${escapeHtml(w.user_name || '')}</strong> (${escapeHtml(w.user_email || '')})</td>
      <td><span class="badge badge-info">${escapeHtml(w.payment_method)}</span></td>
      <td><strong>${escapeHtml(w.amount)}</strong> (${Number(w.points).toLocaleString()} pts)</td>
      <td><code>${escapeHtml(w.account)}</code></td>
      <td>${escapeHtml(w.created_at || '')}</td>
      <td>
        ${w.status === 'pending' ? `
          <button class="btn btn-sm btn-success" onclick="withdrawalAction(${w.id}, 'complete')">Approve (Paid)</button>
          <button class="btn btn-sm btn-danger" onclick="withdrawalAction(${w.id}, 'refuse')">Refuse & Refund</button>
        ` : `<span class="badge badge-${w.status === 'completed' ? 'success' : 'secondary'}">${w.status}</span>`}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function withdrawalAction(recordId, action) {
  if (!confirm(`Confirm ${action.toUpperCase()} for record #${recordId}?`)) return;

  const res = await apiFetch('/admin/api/withdrawals/action', {
    method: 'POST',
    body: JSON.stringify({ record_id: recordId, action }),
  });

  if (res?.status === 200) {
    loadWithdrawals();
  } else {
    alert(res?.message || 'Error processing withdrawal');
  }
}

// 5. Settings Management
async function loadSettings() {
  const data = await apiFetch('/admin/api/settings');
  if (!data || !data.settings) return;
  const s = data.settings;
  document.getElementById('auto-ban-vpn').checked = s.auto_ban_vpn === 1;
  document.getElementById('auto-ban-root').checked = s.auto_ban_root === 1;
  document.getElementById('auto-ban-multi').checked = s.auto_ban_multi === 1;
  document.getElementById('onesignal-app-id').value = s.onesignal_app_id || '';
  document.getElementById('onesignal-rest-key').value = s.onesignal_rest_key || '';
}

async function saveSettings(e) {
  if (e) e.preventDefault();
  const body = {
    auto_ban_vpn: document.getElementById('auto-ban-vpn').checked ? 1 : 0,
    auto_ban_root: document.getElementById('auto-ban-root').checked ? 1 : 0,
    auto_ban_multi: document.getElementById('auto-ban-multi').checked ? 1 : 0,
    onesignal_app_id: document.getElementById('onesignal-app-id').value.trim(),
    onesignal_rest_key: document.getElementById('onesignal-rest-key').value.trim(),
  };

  const res = await apiFetch('/admin/api/settings', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  alert(res?.message || 'Settings saved');
}

async function sendPushNotification(e) {
  if (e) e.preventDefault();
  const title = document.getElementById('push-title').value.trim();
  const message = document.getElementById('push-message').value.trim();
  if (!title || !message) return alert('Title and message required');

  const res = await apiFetch('/admin/api/notify', {
    method: 'POST',
    body: JSON.stringify({ title, message }),
  });

  alert(res?.result?.success ? 'Notification sent successfully!' : `Push failed: ${JSON.stringify(res?.result)}`);
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
