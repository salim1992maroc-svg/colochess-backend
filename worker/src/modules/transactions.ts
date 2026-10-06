import { Env } from '../types';
import { jsonResponse, parseParams } from '../utils/helpers';

export async function handleTransData(request: Request, env: Env): Promise<Response> {
  const params = await parseParams(request);
  const userId = params.get('user_id') || params.get('id');

  if (!userId) {
    return jsonResponse([]);
  }

  const { results } = await env.DB.prepare(
    'SELECT id, amount, points, payment_method, account, status, created_at FROM records WHERE user_id = ? ORDER BY id DESC LIMIT 50'
  ).bind(userId).all();

  return jsonResponse(results || []);
}

export async function handleOffersTrans(request: Request, env: Env): Promise<Response> {
  const params = await parseParams(request);
  const userId = params.get('user_id') || params.get('id');

  if (!userId) {
    return jsonResponse([]);
  }

  const { results } = await env.DB.prepare(
    'SELECT id, offer_name, points, trans_id, date FROM offers_transaction WHERE user_id = ? ORDER BY id DESC LIMIT 50'
  ).bind(userId).all();

  return jsonResponse(results || []);
}
