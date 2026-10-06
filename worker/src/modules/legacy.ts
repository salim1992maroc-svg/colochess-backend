import { Env, UserRow } from '../types';
import { jsonResponse, getClientIp, hashPassword, generateReferralCode, generateRandomCode, parseParams } from '../utils/helpers';

function ok(message: string, data: Record<string, unknown> = {}) {
  return jsonResponse({ status: true, message, '0': data });
}

function fail(message: string, httpStatus = 200) {
  return jsonResponse({ status: false, message }, httpStatus);
}

function legacyUser(user: any) {
  // Android's original client uses 1 = active and 0 = blocked.
  const active = Number(user.status) === 0 ? '1' : '0';
  return {
    id: String(user.id),
    name: user.name ?? '',
    phone: user.phone ?? '',
    email: user.email ?? '',
    points: String(user.points ?? 0),
    referraled_with: user.referraled_with ?? user.referred_by ?? '',
    status: active,
    referral_code: user.referral_code ?? '',
    device_id: user.device_id ?? '',
  };
}

export async function legacyCheckDevice(request: Request, env: Env) {
  const p = await parseParams(request);
  const deviceId = p.get('device_id')?.trim() || '';
  if (!deviceId) return fail('device_id parameter is required');

  const user = await env.DB.prepare('SELECT id, device_id FROM users WHERE device_id = ? LIMIT 1').bind(deviceId).first<{id:number;device_id:string}>();
  if (!user) return fail('Device is not registered');
  return ok('Device already registered', { device_id: user.device_id });
}

export async function legacyRegister(request: Request, env: Env) {
  const p = await parseParams(request);
  const name = p.get('name')?.trim() || '';
  const email = p.get('email')?.trim().toLowerCase() || '';
  const password = p.get('password') || '';
  const phone = p.get('phone') || '';
  const country = p.get('t_getCountry') || '';
  const ip = p.get('t_ip_addr') || getClientIp(request);
  const registeredAt = p.get('t_registration_date') || new Date().toISOString();
  const deviceId = p.get('device_id')?.trim() || '';
  const referredBy = p.get('referral_with') || p.get('referred_by') || '';

  if (!name || !email || !password) return fail('All fields are required');

  const exists = await env.DB.prepare('SELECT id FROM users WHERE email = ? LIMIT 1').bind(email).first<{id:number}>();
  if (exists) return fail('Email is already registered');

  const settings = await env.DB.prepare('SELECT auto_ban_multi, daily_bonus, referral_bonus FROM site_settings WHERE id = 1 LIMIT 1').first<any>();
  const initialPoints = Number(p.get('t_sign_up_bonus') || settings?.daily_bonus || 25);
  const referralBonus = Number(p.get('t_referral_points') || settings?.referral_bonus || 100);

  if (Number(settings?.auto_ban_multi) === 1 && deviceId) {
    const duplicate = await env.DB.prepare('SELECT id FROM users WHERE device_id = ? LIMIT 1').bind(deviceId).first<{id:number}>();
    if (duplicate) return fail('Multiple accounts are not permitted on this device');
  }

  let referralCode = p.get('referral_code')?.trim() || generateReferralCode(name);
  const referralExists = await env.DB.prepare('SELECT id FROM users WHERE referral_code = ? LIMIT 1').bind(referralCode).first<{id:number}>();
  if (referralExists) referralCode = generateReferralCode(name);
  const passwordHash = await hashPassword(password);
  const result = await env.DB.prepare(
    `INSERT INTO users
      (name,email,password,points,device_id,referral_code,referred_by,status,ip_address,created_at,
       phone,country,ip_addr,date_registered,referraled_with,last_login)
     VALUES (?,?,?,?,?,?,?,0,?,?,?,?,?,?,?,?)`
  ).bind(
    name, email, passwordHash, initialPoints, deviceId, referralCode, referredBy,
    ip, registeredAt, phone, country, ip, registeredAt, referredBy, ''
  ).run();

  const userId = Number(result.meta.last_row_id);

  if (referredBy) {
    const referrer = await env.DB.prepare('SELECT id FROM users WHERE referral_code = ? LIMIT 1').bind(referredBy).first<{id:number}>();
    if (referrer && referrer.id !== userId) {
      await env.DB.prepare('UPDATE users SET points = points + ? WHERE id = ?').bind(referralBonus, referrer.id).run();
    }
  }

  if (deviceId) {
    await env.DB.prepare('INSERT INTO device_tracker (user_id,device_id,ip_address,created_at) VALUES (?,?,?,datetime("now"))')
      .bind(userId, deviceId, ip).run();
  }

  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ? LIMIT 1').bind(userId).first<any>();
  return ok('Registered successfully', legacyUser(user));
}

export async function legacyLogin(request: Request, env: Env) {
  const p = await parseParams(request);
  const email = p.get('email')?.trim().toLowerCase() || '';
  const password = p.get('password') || '';
  if (!email || !password) return fail('Email and password are required');

  const user = await env.DB.prepare('SELECT * FROM users WHERE email = ? LIMIT 1').bind(email).first<any>();
  if (!user) return fail('Invalid email or password');
  const hash = await hashPassword(password);
  if (user.password !== hash && user.password !== password) return fail('Invalid email or password');

  await env.DB.prepare('UPDATE users SET ip_address = ?, last_login = datetime("now") WHERE id = ?')
    .bind(getClientIp(request), user.id).run();

  return ok('Login successful', legacyUser(user));
}

export async function legacyUsers(request: Request, env: Env) {
  const p = await parseParams(request);
  const id = p.get('id') || p.get('user_id');
  if (!id) return fail('User ID is required');
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ? LIMIT 1').bind(id).first<any>();
  if (!user) return fail('User not found');
  return ok('User found', legacyUser(user));
}

export async function legacyChangeUsername(request: Request, env: Env) {
  const p = await parseParams(request);
  const id = p.get('id') || p.get('user_id');
  const name = p.get('name')?.trim() || '';
  if (!id || !name) return fail('User ID and new name are required');
  await env.DB.prepare('UPDATE users SET name = ? WHERE id = ?').bind(name, id).run();
  return ok('Username changed successfully', { name });
}

export async function legacyDeleteUser(request: Request, env: Env) {
  const p = await parseParams(request);
  const id = p.get('id') || p.get('user_id');
  if (!id) return fail('User ID is required');
  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
  return jsonResponse({ status: true, message: 'Account deleted successfully' });
}

export async function legacyReferral(request: Request, env: Env) {
  const p = await parseParams(request);
  const id = p.get('id') || p.get('user_id');
  if (!id) return fail('User ID is required');
  const user = await env.DB.prepare('SELECT referral_code, referred_by, referraled_with FROM users WHERE id = ? LIMIT 1').bind(id).first<any>();
  if (!user) return fail('User not found');
  return ok('Referral information', {
    referraled_with: user.referraled_with ?? user.referred_by ?? '',
    referral_code: user.referral_code ?? ''
  });
}

export async function legacyNotify(request: Request, env: Env) {
  const p = await parseParams(request);
  const userId = Number(p.get('user_id') || p.get('userid') || 0);
  if (!userId) return fail('User ID is required');

  await env.DB.prepare(
    `INSERT INTO notify
      (userid,username,email,character_name,message,withdrawal,status,date,transid,trans_status,t_device_name,t_device_bramd)
     VALUES (?,?,?,?,?,?,0,?,?,1,?,?)`
  ).bind(
    userId, p.get('t_name') || '', p.get('t_email') || '', p.get('t_name_character') || '',
    p.get('t_message') || '', p.get('t_min') || '', p.get('t_date') || new Date().toISOString(),
    p.get('t_transid') || '', p.get('t_device_name') || '', p.get('t_device_brand') || ''
  ).run();

  return jsonResponse({ status: true, message: 'Notification submitted successfully' });
}

export async function legacyUpdatePoints(request: Request, env: Env) {
  const p = await parseParams(request);
  const userId = p.get('user_id') || p.get('id');
  const points = Number(p.get('new_point') || p.get('points') || 0);
  if (!userId || !Number.isFinite(points)) return fail('Invalid user or points');

  await env.DB.prepare('UPDATE users SET points = MAX(0, points + ?) WHERE id = ?').bind(points, userId).run();
  if (p.get('trans_id')) {
    await env.DB.prepare(
      'INSERT INTO tracker_users (userid,points,trans_id,device_id,country,ip,type,date,placement) VALUES (?,?,?,?,?,?,?,?,?)'
    ).bind(userId, String(points), p.get('trans_id') || '', p.get('device_id') || '', p.get('getCountry') || '', getClientIp(request), p.get('reason') || '', p.get('date') || '', '')
      .run();
  }
  return jsonResponse({ status: true, message: 'Points updated successfully' });
}

export async function legacyController(env: Env) {
  const cfg = await env.DB.prepare('SELECT * FROM app_config WHERE id = 1 LIMIT 1').first<any>();
  const settings = await env.DB.prepare('SELECT * FROM site_settings WHERE id = 1 LIMIT 1').first<any>();
  const row = {
    c_sign_up_bonus: String(cfg?.c_sign_up_bonus ?? settings?.daily_bonus ?? 25),
    c_referral_points: String(cfg?.c_referral_points ?? settings?.referral_bonus ?? 100),
    c_vpn: String(cfg?.c_vpn ?? (settings?.auto_ban_vpn ? 'on' : 'off')),
    c_root: String(cfg?.c_root ?? (settings?.auto_ban_root ? 'on' : 'off')),
    onsignale_app_id: String(cfg?.onsignale_app_id ?? ''),
    c_multiple: String(cfg?.c_multiple ?? (settings?.auto_ban_multi ? 'on' : 'off')),
    device_id_count: String(cfg?.device_id_count ?? 10),
    game_url: String(cfg?.game_url ?? '')
  };
  return jsonResponse([row]);
}

export async function legacyPages(env: Env) {
  const cfg = await env.DB.prepare('SELECT site_page,rules_page,privacy_page,contact_page FROM app_config WHERE id = 1 LIMIT 1').first<any>();
  if (cfg) return jsonResponse([cfg]);

  const { results } = await env.DB.prepare('SELECT type, content FROM pages ORDER BY id ASC').all<any>();
  const row: Record<string,string> = {site_page:'',rules_page:'',privacy_page:'',contact_page:''};
  for (const p of results || []) {
    if (p.type === 'site') row.site_page = p.content;
    if (p.type === 'rules') row.rules_page = p.content;
    if (p.type === 'privacy') row.privacy_page = p.content;
    if (p.type === 'contact') row.contact_page = p.content;
  }
  return jsonResponse([row]);
}

export async function legacyTab(env: Env) {
  const cfg = await env.DB.prepare('SELECT tab_payeer,tab_paypal FROM app_config WHERE id = 1 LIMIT 1').first<any>();
  return jsonResponse([{ tab_payeer: cfg?.tab_payeer ?? 'Payeer', tab_paypal: cfg?.tab_paypal ?? 'PayPal' }]);
}

export async function legacyIds(env: Env) {
  const { results } = await env.DB.prepare('SELECT network_name,app_ids,app_placement FROM offerwall_ids ORDER BY id ASC').all();
  return jsonResponse(results || []);
}

export async function legacyDialog(request: Request, env: Env) {
  const row = await env.DB.prepare('SELECT title,message,image,status FROM dialog_msg WHERE id = 1 LIMIT 1').first<any>();
  if (!row || Number(row.status) !== 1) return jsonResponse({ status: false, message: 'No active dialog message' });
  return ok('Dialog message', { dlog_title: row.title ?? '', dlog_mess: row.message ?? '', dlog_image: row.image ?? '', statu: String(row.status ?? 1) });
}

export async function legacyCustomOfferwalls(env: Env) {
  const { results } = await env.DB.prepare('SELECT net_name,net_desc,net_image,net_app_ids,net_placement,type FROM sdk_offerwalls WHERE status_ = 1 ORDER BY id ASC').all();
  return jsonResponse(results || []);
}

function legacyCashoutRows(results: any[]) {
  return (results || []).map((r: any) => ({
    dollar_value: r.amount ?? '',
    type: r.name ?? '',
    cara_desc: r.amount ?? '',
    cara_image: r.image ?? '',
    cara_points: String(r.points ?? 0)
  }));
}

export async function legacyPayPal(request: Request, env: Env) {
  if (request.method === 'GET') {
    const { results } = await env.DB.prepare('SELECT name,amount,points,image FROM character WHERE name LIKE "%PayPal%" AND status = 1 ORDER BY points ASC').all();
    return jsonResponse(legacyCashoutRows(results as any[]));
  }
  return legacyWithdrawal(request, env, 'PayPal');
}

export async function legacyPayeer(request: Request, env: Env) {
  if (request.method === 'GET') {
    const { results } = await env.DB.prepare('SELECT name,amount,points,image FROM character WHERE name LIKE "%Payeer%" AND status = 1 ORDER BY points ASC').all();
    return jsonResponse(legacyCashoutRows(results as any[]));
  }
  return legacyWithdrawal(request, env, 'Payeer');
}

async function legacyWithdrawal(request: Request, env: Env, method: string) {
  const p = await parseParams(request);
  const userId = p.get('userid') || p.get('user_id') || p.get('id');
  const amount = p.get('amount') || p.get('t_min') || p.get('dollar_value') || '';
  const points = Number(p.get('points') || p.get('t_points') || p.get('cara_points') || 0);
  const account = p.get('account') || p.get('email') || p.get('t_email') || '';
  if (!userId || !amount || points <= 0 || !account) return fail('All fields are required');

  const user = await env.DB.prepare('SELECT points,status FROM users WHERE id = ? LIMIT 1').bind(userId).first<any>();
  if (!user) return fail('User not found');
  if (Number(user.status) === 1) return fail('Account is blocked');
  if (Number(user.points) < points) return fail('Insufficient points balance');

  await env.DB.batch([
    env.DB.prepare('UPDATE users SET points = points - ? WHERE id = ?').bind(points, userId),
    env.DB.prepare('INSERT INTO records (user_id,amount,points,payment_method,account,status,created_at) VALUES (?,?,?,?,?,"pending",datetime("now"))')
      .bind(userId, amount, points, method, account)
  ]);
  return jsonResponse({ status: true, message: 'Withdrawal request submitted successfully' });
}

export async function legacyTransData(request: Request, env: Env) {
  const p = await parseParams(request);
  const userId = p.get('userid') || p.get('user_id') || p.get('id');
  if (!userId) return jsonResponse({ status: false, message: 'User ID is required' });
  const { results } = await env.DB.prepare(
    'SELECT r.*, u.name as username, u.email as email FROM records r JOIN users u ON u.id = r.user_id WHERE r.user_id = ? ORDER BY r.id DESC LIMIT 50'
  ).bind(userId).all<any>();
  const out: Record<string, unknown> = { status: true };
  (results || []).forEach((r: any, i: number) => {
    out[String(i)] = {
      trans_status: r.status === 'completed' ? '1' : (r.status === 'refus' ? '2' : '0'),
      username: r.username ?? '', email: r.email ?? '', date: r.created_at ?? '',
      character_name: r.payment_method ?? '', withdrawal: r.amount ?? '', transid: String(r.id ?? '')
    };
  });
  return jsonResponse(out);
}

export async function legacyOffersTrans(request: Request, env: Env) {
  const p = await parseParams(request);
  const userId = p.get('userid') || p.get('user_id') || p.get('id');
  if (!userId) return jsonResponse({ status: false, message: 'User ID is required' });
  const { results } = await env.DB.prepare('SELECT offer_name,points,trans_id,date FROM offers_transaction WHERE user_id = ? ORDER BY id DESC LIMIT 50').bind(userId).all<any>();
  const out: Record<string, unknown> = { status: true };
  (results || []).forEach((r: any, i: number) => {
    out[String(i)] = { date: r.date ?? '', type: r.offer_name ?? '', trans_id: r.trans_id ?? '', points: String(r.points ?? 0) };
  });
  return jsonResponse(out);
}

export async function legacyForgot(request: Request, env: Env) {
  const p = await parseParams(request);
  const email = p.get('email')?.trim().toLowerCase() || '';
  if (!email) return fail('Email is required');
  const user = await env.DB.prepare('SELECT id FROM users WHERE email = ? LIMIT 1').bind(email).first<any>();
  if (!user) return fail('User with this email not found');
  return jsonResponse({ status: true, message: 'Verification request accepted' });
}

export async function legacyAuthLogin(request: Request, env: Env) {
  const p = await parseParams(request);
  const email = p.get('email')?.trim().toLowerCase() || '';
  const password = p.get('password') || '';
  const user = await env.DB.prepare('SELECT * FROM users WHERE email = ? LIMIT 1').bind(email).first<any>();
  if (!user) return jsonResponse({ success: false, message: 'Invalid email or password' });
  const hash = await hashPassword(password);
  if (user.password !== hash && user.password !== password) return jsonResponse({ success: false, message: 'Invalid email or password' });
  if (Number(user.status) === 1) return jsonResponse({ success: false, message: 'Account is blocked' });
  return jsonResponse({
    success: true,
    user: {
      id: String(user.id), first_name: user.name ?? '', username: user.name ?? '', email: user.email ?? '',
      referred_by: user.referraled_with ?? user.referred_by ?? '', referral_code: user.referral_code ?? ''
    },
    wallet: { balance: Number(user.points ?? 0) }
  });
}
