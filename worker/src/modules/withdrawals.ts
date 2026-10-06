import { Env, UserRow } from '../types';
import { jsonResponse, parseParams } from '../utils/helpers';

export async function handlePayPal(request: Request, env: Env): Promise<Response> {
  if (request.method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT id, name, amount, points, image FROM character WHERE name LIKE "%PayPal%" AND status = 1 ORDER BY points ASC'
    ).all();
    return jsonResponse(results || []);
  }

  // POST: Submit withdrawal request
  const params = await parseParams(request);
  const userId = params.get('user_id') || params.get('id');
  const amount = params.get('amount')?.trim() || '';
  const points = parseInt(params.get('points') || '0', 10);
  const account = params.get('account')?.trim() || '';

  if (!userId || !amount || points <= 0 || !account) {
    return jsonResponse({ status: 400, message: 'All fields are required' });
  }

  // 1. Verify user points balance
  const user = await env.DB.prepare('SELECT points, status FROM users WHERE id = ? LIMIT 1').bind(userId).first<UserRow>();
  if (!user) {
    return jsonResponse({ status: 404, message: 'User not found' });
  }

  if (user.status === 1) {
    return jsonResponse({ status: 403, message: 'Account is suspended' });
  }

  if (user.points < points) {
    return jsonResponse({ status: 400, message: 'Insufficient points balance' });
  }

  // 2. Atomic points deduction and records creation
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET points = points - ? WHERE id = ?').bind(points, userId),
    env.DB.prepare(
      'INSERT INTO records (user_id, amount, points, payment_method, account, status, created_at) VALUES (?, ?, ?, "PayPal", ?, "pending", datetime("now"))'
    ).bind(userId, amount, points, account),
  ]);

  return jsonResponse({ status: 200, message: 'Withdrawal request submitted successfully' });
}

export async function handlePayeer(request: Request, env: Env): Promise<Response> {
  if (request.method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT id, name, amount, points, image FROM character WHERE name LIKE "%Payeer%" AND status = 1 ORDER BY points ASC'
    ).all();
    return jsonResponse(results || []);
  }

  // POST: Submit withdrawal request
  const params = await parseParams(request);
  const userId = params.get('user_id') || params.get('id');
  const amount = params.get('amount')?.trim() || '';
  const points = parseInt(params.get('points') || '0', 10);
  const account = params.get('account')?.trim() || '';

  if (!userId || !amount || points <= 0 || !account) {
    return jsonResponse({ status: 400, message: 'All fields are required' });
  }

  // 1. Verify user points balance
  const user = await env.DB.prepare('SELECT points, status FROM users WHERE id = ? LIMIT 1').bind(userId).first<UserRow>();
  if (!user) {
    return jsonResponse({ status: 404, message: 'User not found' });
  }

  if (user.status === 1) {
    return jsonResponse({ status: 403, message: 'Account is suspended' });
  }

  if (user.points < points) {
    return jsonResponse({ status: 400, message: 'Insufficient points balance' });
  }

  // 2. Atomic points deduction and records creation
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET points = points - ? WHERE id = ?').bind(points, userId),
    env.DB.prepare(
      'INSERT INTO records (user_id, amount, points, payment_method, account, status, created_at) VALUES (?, ?, ?, "Payeer", ?, "pending", datetime("now"))'
    ).bind(userId, amount, points, account),
  ]);

  return jsonResponse({ status: 200, message: 'Withdrawal request submitted successfully' });
}
