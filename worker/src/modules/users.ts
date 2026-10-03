import { Env, UserRow } from '../types';
import { jsonResponse, getClientIp, parseParams } from '../utils/helpers';

export async function handleCheckDeviceID(request: Request, env: Env): Promise<Response> {
  const params = await parseParams(request);
  const deviceId = params.get('device_id')?.trim() || '';

  if (!deviceId) {
    return jsonResponse({ status: 400, message: 'device_id parameter is required' });
  }

  // Check if device is associated with a banned user
  const bannedUser = await env.DB.prepare('SELECT id, status FROM users WHERE device_id = ? AND status = 1 LIMIT 1').bind(deviceId).first<UserRow>();
  if (bannedUser) {
    return jsonResponse({ status: 403, blocked: true, message: 'Device is blocked' });
  }

  // Check site settings for auto ban
  const settings = await env.DB.prepare('SELECT auto_ban_multi FROM site_settings WHERE id = 1 LIMIT 1').first<{ auto_ban_multi: number }>();

  return jsonResponse({
    status: 200,
    blocked: false,
    auto_ban_multi: settings?.auto_ban_multi || 0,
    device_id: deviceId,
  });
}

export async function handleGetUserInfo(request: Request, env: Env): Promise<Response> {
  const params = await parseParams(request);
  const userId = params.get('id') || params.get('user_id');

  if (!userId) {
    return jsonResponse({ status: 400, message: 'User ID is required' });
  }

  const user = await env.DB.prepare('SELECT id, name, email, points, status, referral_code, device_id FROM users WHERE id = ? LIMIT 1').bind(userId).first<UserRow>();

  if (!user) {
    return jsonResponse({ status: 404, message: 'User not found' });
  }

  return jsonResponse({
    status: 200,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      points: user.points,
      status: user.status,
      referral_code: user.referral_code,
    },
  });
}

export async function handleChangeUsername(request: Request, env: Env): Promise<Response> {
  const params = await parseParams(request);
  const userId = params.get('user_id') || params.get('id');
  const name = params.get('name')?.trim();

  if (!userId || !name) {
    return jsonResponse({ status: 400, message: 'User ID and new name are required' });
  }

  await env.DB.prepare('UPDATE users SET name = ? WHERE id = ?').bind(name, userId).run();

  return jsonResponse({ status: 200, message: 'Username changed successfully' });
}

export async function handleDeleteUser(request: Request, env: Env): Promise<Response> {
  const params = await parseParams(request);
  const userId = params.get('user_id') || params.get('id');

  if (!userId) {
    return jsonResponse({ status: 400, message: 'User ID is required' });
  }

  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();

  return jsonResponse({ status: 200, message: 'Account deleted successfully' });
}

export async function handleReferral(request: Request, env: Env): Promise<Response> {
  const params = await parseParams(request);
  const userId = params.get('user_id') || params.get('id');

  if (!userId) {
    return jsonResponse({ status: 400, message: 'User ID is required' });
  }

  const user = await env.DB.prepare('SELECT referral_code FROM users WHERE id = ? LIMIT 1').bind(userId).first<{ referral_code: string }>();
  if (!user) {
    return jsonResponse({ status: 404, message: 'User not found' });
  }

  const { results: referredUsers } = await env.DB.prepare(
    'SELECT name, created_at FROM users WHERE referred_by = ? ORDER BY id DESC LIMIT 50'
  ).bind(user.referral_code).all<{ name: string; created_at: string }>();

  return jsonResponse({
    status: 200,
    referral_code: user.referral_code,
    total_referred: referredUsers.length,
    users: referredUsers,
  });
}

export async function handleNotifications(request: Request, env: Env): Promise<Response> {
  const params = await parseParams(request);
  const userId = params.get('user_id') || params.get('id');

  let query = 'SELECT id, title, message, date FROM notifications WHERE user_id = ? OR user_id = 0 ORDER BY id DESC LIMIT 30';
  const { results } = await env.DB.prepare(query).bind(userId || 0).all();

  return jsonResponse(results || []);
}
