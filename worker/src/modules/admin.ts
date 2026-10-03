import { Env, UserRow } from '../types';
import { jsonResponse, parseParams, hashPassword, signAdminToken, verifyAdminToken } from '../utils/helpers';
import { sendOneSignalPush } from '../services/onesignal';

export async function authenticateAdmin(request: Request, env: Env): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else {
    // Check cookies
    const cookieHeader = request.headers.get('Cookie') || '';
    const match = cookieHeader.match(/admin_token=([^;]+)/);
    if (match) {
      token = match[1];
    }
  }

  if (!token) return null;
  return verifyAdminToken(token, env.ADMIN_JWT_SECRET || 'default-colochess-admin-secret-key-32b');
}

export async function handleAdminLogin(request: Request, env: Env): Promise<Response> {
  const params = await parseParams(request);
  const username = params.get('username')?.trim() || '';
  const password = params.get('password') || '';

  if (!username || !password) {
    return jsonResponse({ status: 400, message: 'Username and password required' });
  }

  const admin = await env.DB.prepare('SELECT * FROM admin WHERE username = ? LIMIT 1').bind(username).first<{ id: number; username: string; password: string }>();

  if (!admin) {
    return jsonResponse({ status: 401, message: 'Invalid credentials' });
  }

  const passwordHash = await hashPassword(password);
  const isMatch = admin.password === passwordHash || admin.password === password;

  if (!isMatch) {
    return jsonResponse({ status: 401, message: 'Invalid credentials' });
  }

  const token = await signAdminToken(admin.username, env.ADMIN_JWT_SECRET || 'default-colochess-admin-secret-key-32b');

  return jsonResponse(
    { status: 200, message: 'Login successful', token },
    200,
    { 'Set-Cookie': `admin_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800` }
  );
}

export async function handleAdminStats(env: Env): Promise<Response> {
  const [totalUsers, totalPoints, pendingRecords, completedRecords] = await Promise.all([
    env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>(),
    env.DB.prepare('SELECT SUM(points) as sum FROM users').first<{ sum: number }>(),
    env.DB.prepare('SELECT COUNT(*) as count, SUM(points) as points FROM records WHERE status = "pending"').first<{ count: number; points: number }>(),
    env.DB.prepare('SELECT COUNT(*) as count, SUM(points) as points FROM records WHERE status = "completed"').first<{ count: number; points: number }>(),
  ]);

  return jsonResponse({
    status: 200,
    total_users: totalUsers?.count || 0,
    total_points: totalPoints?.sum || 0,
    pending_withdrawals: pendingRecords?.count || 0,
    pending_points: pendingRecords?.points || 0,
    completed_withdrawals: completedRecords?.count || 0,
    completed_points: completedRecords?.points || 0,
  });
}

export async function handleAdminUsers(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const search = url.searchParams.get('q') || '';
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(100, parseInt(url.searchParams.get('limit') || '50', 10));
  const offset = (page - 1) * limit;

  let query = 'SELECT id, name, email, points, status, device_id, referral_code, ip_address, created_at FROM users';
  let countQuery = 'SELECT COUNT(*) as total FROM users';
  const queryParams: unknown[] = [];

  if (search) {
    query += ' WHERE name LIKE ? OR email LIKE ? OR device_id LIKE ?';
    countQuery += ' WHERE name LIKE ? OR email LIKE ? OR device_id LIKE ?';
    const s = `%${search}%`;
    queryParams.push(s, s, s);
  }

  query += ' ORDER BY id DESC LIMIT ? OFFSET ?';

  const countRes = await env.DB.prepare(countQuery).bind(...queryParams).first<{ total: number }>();
  const usersRes = await env.DB.prepare(query).bind(...queryParams, limit, offset).all();

  return jsonResponse({
    status: 200,
    total: countRes?.total || 0,
    page,
    limit,
    users: usersRes.results || [],
  });
}

export async function handleAdminUpdateUser(request: Request, env: Env): Promise<Response> {
  const params = await parseParams(request);
  const userId = params.get('user_id');
  const points = params.get('points');
  const status = params.get('status');

  if (!userId) {
    return jsonResponse({ status: 400, message: 'User ID is required' });
  }

  if (points !== null && points !== undefined && points !== '') {
    await env.DB.prepare('UPDATE users SET points = ? WHERE id = ?').bind(parseInt(points, 10), userId).run();
  }

  if (status !== null && status !== undefined && status !== '') {
    await env.DB.prepare('UPDATE users SET status = ? WHERE id = ?').bind(parseInt(status, 10), userId).run();
  }

  return jsonResponse({ status: 200, message: 'User updated successfully' });
}

export async function handleAdminWithdrawals(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const status = url.searchParams.get('status') || 'pending';

  const { results } = await env.DB.prepare(
    'SELECT r.*, u.name as user_name, u.email as user_email FROM records r JOIN users u ON r.user_id = u.id WHERE r.status = ? ORDER BY r.id DESC LIMIT 100'
  ).bind(status).all();

  return jsonResponse({ status: 200, withdrawals: results || [] });
}

export async function handleAdminWithdrawalAction(request: Request, env: Env): Promise<Response> {
  const params = await parseParams(request);
  const recordId = params.get('record_id');
  const action = params.get('action'); // 'complete' or 'refuse'

  if (!recordId || !action) {
    return jsonResponse({ status: 400, message: 'record_id and action are required' });
  }

  const record = await env.DB.prepare('SELECT * FROM records WHERE id = ? LIMIT 1').bind(recordId).first<{ id: number; user_id: number; points: number; status: string }>();
  if (!record) {
    return jsonResponse({ status: 404, message: 'Record not found' });
  }

  if (action === 'complete') {
    await env.DB.prepare('UPDATE records SET status = "completed" WHERE id = ?').bind(recordId).run();
    return jsonResponse({ status: 200, message: 'Withdrawal marked as completed' });
  }

  if (action === 'refuse') {
    // If pending, refund points to user
    if (record.status === 'pending') {
      await env.DB.batch([
        env.DB.prepare('UPDATE records SET status = "refus" WHERE id = ?').bind(recordId),
        env.DB.prepare('UPDATE users SET points = points + ? WHERE id = ?').bind(record.points, record.user_id),
        env.DB.prepare(
          'INSERT INTO notifications (user_id, title, message, date) VALUES (?, "Withdrawal Refunded", "Your payout request was rejected and your points have been refunded.", datetime("now"))'
        ).bind(record.user_id),
      ]);
    } else {
      await env.DB.prepare('UPDATE records SET status = "refus" WHERE id = ?').bind(recordId).run();
    }
    return jsonResponse({ status: 200, message: 'Withdrawal refused and points refunded' });
  }

  return jsonResponse({ status: 400, message: 'Invalid action' });
}

export async function handleAdminSettings(request: Request, env: Env): Promise<Response> {
  if (request.method === 'GET') {
    const settings = await env.DB.prepare('SELECT * FROM site_settings WHERE id = 1 LIMIT 1').first<Record<string, unknown>>();
    return jsonResponse({ status: 200, settings: settings || {} });
  }

  const params = await parseParams(request);
  const autoBanVpn = parseInt(params.get('auto_ban_vpn') || '0', 10);
  const autoBanRoot = parseInt(params.get('auto_ban_root') || '0', 10);
  const autoBanMulti = parseInt(params.get('auto_ban_multi') || '0', 10);
  const onesignalAppId = params.get('onesignal_app_id')?.trim() || '';
  const onesignalRestKey = params.get('onesignal_rest_key')?.trim() || '';

  await env.DB.prepare(
    'UPDATE site_settings SET auto_ban_vpn = ?, auto_ban_root = ?, auto_ban_multi = ?, onesignal_app_id = ?, onesignal_rest_key = ? WHERE id = 1'
  ).bind(autoBanVpn, autoBanRoot, autoBanMulti, onesignalAppId, onesignalRestKey).run();

  return jsonResponse({ status: 200, message: 'Settings updated successfully' });
}

export async function handleAdminPushNotification(request: Request, env: Env): Promise<Response> {
  const params = await parseParams(request);
  const title = params.get('title')?.trim() || '';
  const message = params.get('message')?.trim() || '';

  if (!title || !message) {
    return jsonResponse({ status: 400, message: 'Title and message are required' });
  }

  const result = await sendOneSignalPush(env, title, message);
  return jsonResponse({ status: 200, result });
}
