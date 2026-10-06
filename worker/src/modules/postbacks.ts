import { Env } from '../types';
import { jsonResponse, textResponse, parseParams } from '../utils/helpers';

export async function handleOkSpinPostback(request: Request, env: Env): Promise<Response> {
  const params = await parseParams(request);

  // 1. User ID resolution (Historical parameter 'user_uuid' takes priority; falls back to 'userId', 'user_id', 'subId')
  const rawUserId = params.get('user_uuid') || params.get('userId') || params.get('user_id') || params.get('subId');
  const userId = parseInt(rawUserId || '0', 10);

  // 2. Transaction ID resolution (Historical parameter 'trans_uuid' takes priority; falls back to 'transId', 'trans_id')
  const transId = (params.get('trans_uuid') || params.get('transId') || params.get('trans_id') || '').trim();

  // 3. Reward / Points resolution ('amount' or 'points' or 'payout')
  const rawPoints = params.get('amount') || params.get('points') || params.get('payout');
  const points = parseInt(rawPoints || '0', 10);

  // Note on OkSpin Security:
  // There is NO documented Secret Key in the OkSpin account documentation for this integration.
  // To avoid breaking postback delivery, we do NOT invent a signature algorithm or secret.
  // Security is enforced via strict parameter validation, type verification, and transaction deduplication.

  // 4. Strict input validation
  if (isNaN(userId) || userId <= 0 || !transId || isNaN(points) || points <= 0) {
    return jsonResponse({ code: 1, message: 'Invalid or missing parameters' });
  }

  // 5. Deduplication check: check if trans_id was already credited
  const existingTx = await env.DB.prepare(
    'SELECT id FROM offers_transaction WHERE trans_id = ? LIMIT 1'
  ).bind(transId).first();

  if (existingTx) {
    // Return success code 0 to OkSpin so it marks delivery complete without double-crediting
    return jsonResponse({ code: 0, message: 'success' });
  }

  // 6. Atomic transaction to insert record and update user points
  try {
    const offerName = params.get('pos') ? `Okspin_${params.get('pos')}` : 'Okspin';

    await env.DB.batch([
      env.DB.prepare(
        'INSERT INTO offers_transaction (user_id, offer_name, points, trans_id, date) VALUES (?, ?, ?, ?, datetime("now"))'
      ).bind(userId, offerName, points, transId),
      env.DB.prepare('UPDATE users SET points = points + ? WHERE id = ?').bind(points, userId),
    ]);

    return jsonResponse({ code: 0, message: 'success' });
  } catch (err) {
    console.error('OkSpin postback error:', err);
    return jsonResponse({ code: 1, message: 'Processing error' });
  }
}

export async function handleLuckwalPostback(request: Request, env: Env): Promise<Response> {
  const params = await parseParams(request);

  const rawUserId = params.get('user_id') || params.get('subId') || params.get('userId');
  const userId = parseInt(rawUserId || '0', 10);

  const transId = (params.get('trans_id') || params.get('transId') || '').trim();
  const rawAmount = params.get('amount') || params.get('points');
  const amount = parseInt(rawAmount || '0', 10);

  if (isNaN(userId) || userId <= 0 || !transId || isNaN(amount) || amount <= 0) {
    return textResponse('0');
  }

  // Deduplication check
  const existingTx = await env.DB.prepare(
    'SELECT id FROM offers_transaction WHERE trans_id = ? LIMIT 1'
  ).bind(transId).first();

  if (existingTx) {
    return textResponse('1');
  }

  try {
    await env.DB.batch([
      env.DB.prepare(
        'INSERT INTO offers_transaction (user_id, offer_name, points, trans_id, date) VALUES (?, "Luckywall", ?, ?, datetime("now"))'
      ).bind(userId, amount, transId),
      env.DB.prepare('UPDATE users SET points = points + ? WHERE id = ?').bind(amount, userId),
    ]);

    return textResponse('1');
  } catch (err) {
    console.error('LuckyWall postback error:', err);
    return textResponse('0');
  }
}

export async function handleGenericPostback(request: Request, env: Env): Promise<Response> {
  const params = await parseParams(request);

  const rawUserId = params.get('subId') || params.get('user_id') || params.get('userId');
  const userId = parseInt(rawUserId || '0', 10);

  const transId = (params.get('trans_id') || params.get('transId') || '').trim();
  const rawPoints = params.get('amount') || params.get('payout') || params.get('points');
  let points = parseInt(rawPoints || '0', 10);

  const status = parseInt(params.get('status') || '1', 10);
  const offerName = (params.get('offer_name') || 'Offerwall').trim();

  if (isNaN(userId) || userId <= 0 || !transId) {
    return textResponse('0');
  }

  // 1. Reversal / Chargeback Handling (status == 2)
  if (status === 2) {
    points = Math.abs(points);
    const revTransId = `REV_${transId}`;

    // Prevent duplicate reversal
    const existingRev = await env.DB.prepare(
      'SELECT id FROM offers_transaction WHERE trans_id = ? LIMIT 1'
    ).bind(revTransId).first();

    if (existingRev) {
      return textResponse('1');
    }

    try {
      await env.DB.batch([
        env.DB.prepare('UPDATE users SET points = MAX(0, points - ?) WHERE id = ?').bind(points, userId),
        env.DB.prepare(
          'INSERT INTO offers_transaction (user_id, offer_name, points, trans_id, date) VALUES (?, ?, ?, ?, datetime("now"))'
        ).bind(userId, offerName, -points, revTransId),
      ]);

      return textResponse('1');
    } catch (err) {
      console.error('Postback reversal error:', err);
      return textResponse('0');
    }
  }

  // 2. Normal Conversion Credit (status == 1)
  if (isNaN(points) || points <= 0) {
    return textResponse('0');
  }

  // Deduplication check
  const existingTx = await env.DB.prepare(
    'SELECT id FROM offers_transaction WHERE trans_id = ? LIMIT 1'
  ).bind(transId).first();

  if (existingTx) {
    // Return success to offerwall network without crediting twice
    return textResponse('1');
  }

  try {
    await env.DB.batch([
      env.DB.prepare(
        'INSERT INTO offers_transaction (user_id, offer_name, points, trans_id, date) VALUES (?, ?, ?, ?, datetime("now"))'
      ).bind(userId, offerName, points, transId),
      env.DB.prepare('UPDATE users SET points = points + ? WHERE id = ?').bind(points, userId),
    ]);

    return textResponse('1');
  } catch (err) {
    console.error('Postback credit error:', err);
    return textResponse('0');
  }
}
