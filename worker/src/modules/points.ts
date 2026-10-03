import { Env, UserRow } from '../types';
import { jsonResponse, parseParams } from '../utils/helpers';

export async function handleUpdatePoints(request: Request, env: Env): Promise<Response> {
  const params = await parseParams(request);
  const userId = params.get('user_id') || params.get('id');
  const points = parseInt(params.get('points') || '0', 10);

  if (!userId || isNaN(points)) {
    return jsonResponse({ status: 400, message: 'Invalid user_id or points' });
  }

  // Atomically update points
  await env.DB.prepare('UPDATE users SET points = MAX(0, points + ?) WHERE id = ?').bind(points, userId).run();

  const updatedUser = await env.DB.prepare('SELECT points FROM users WHERE id = ? LIMIT 1').bind(userId).first<UserRow>();

  return jsonResponse({
    status: 200,
    message: 'Points updated successfully',
    points: updatedUser?.points || 0,
  });
}

export async function handleSpin(request: Request, env: Env): Promise<Response> {
  const params = await parseParams(request);
  const userId = params.get('user_id') || params.get('id');
  const points = parseInt(params.get('points') || '0', 10);

  if (!userId || points < 0) {
    return jsonResponse({ status: 400, message: 'Invalid user_id or points' });
  }

  // Atomically update user balance
  await env.DB.prepare('UPDATE users SET points = points + ? WHERE id = ?').bind(points, userId).run();

  const user = await env.DB.prepare('SELECT points FROM users WHERE id = ? LIMIT 1').bind(userId).first<UserRow>();

  return jsonResponse({
    status: 200,
    message: 'Spin rewarded successfully',
    points: user?.points || 0,
  });
}
