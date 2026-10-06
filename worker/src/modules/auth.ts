import { Env, UserRow } from '../types';
import { jsonResponse, getClientIp, hashPassword, generateReferralCode, generateRandomCode, parseParams } from '../utils/helpers';
import { sendEmail } from '../services/email';

export async function handleRegister(request: Request, env: Env): Promise<Response> {
  const params = await parseParams(request);
  const name = params.get('name')?.trim() || '';
  const email = params.get('email')?.trim().toLowerCase() || '';
  const password = params.get('password') || '';
  const deviceId = params.get('device_id')?.trim() || '';
  const referredBy = params.get('referred_by')?.trim() || '';
  const clientIp = getClientIp(request);

  if (!name || !email || !password) {
    return jsonResponse({ status: 400, message: 'All fields are required' });
  }

  // 1. Check if email already exists
  const existingUser = await env.DB.prepare('SELECT id FROM users WHERE email = ? LIMIT 1').bind(email).first<UserRow>();
  if (existingUser) {
    return jsonResponse({ status: 400, message: 'Email is already registered' });
  }

  // 2. Anti-fraud check: auto_ban_multi (multiple accounts per device)
  const settings = await env.DB.prepare('SELECT auto_ban_multi, daily_bonus, referral_bonus FROM site_settings WHERE id = 1 LIMIT 1').first<{ auto_ban_multi: number; daily_bonus: number; referral_bonus: number }>();
  const initialPoints = settings?.daily_bonus || 25;
  const referralBonus = settings?.referral_bonus || 100;

  if (settings?.auto_ban_multi === 1 && deviceId) {
    const existingDevice = await env.DB.prepare('SELECT id FROM users WHERE device_id = ? LIMIT 1').bind(deviceId).first<UserRow>();
    if (existingDevice) {
      return jsonResponse({ status: 403, message: 'Multiple accounts are not permitted on this device' });
    }
  }

  // 3. Hash password & generate unique referral code
  const passwordHash = await hashPassword(password);
  const referralCode = generateReferralCode(name);

  // 4. Create user record
  const insertResult = await env.DB.prepare(
    'INSERT INTO users (name, email, password, points, device_id, referral_code, referred_by, status, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, datetime("now"))'
  ).bind(name, email, passwordHash, initialPoints, deviceId, referralCode, referredBy, clientIp).run();

  const userId = insertResult.meta.last_row_id;

  // 5. Attribute referral bonus if valid
  if (referredBy) {
    const referrer = await env.DB.prepare('SELECT id FROM users WHERE referral_code = ? LIMIT 1').bind(referredBy).first<UserRow>();
    if (referrer && referrer.id !== userId) {
      await env.DB.prepare('UPDATE users SET points = points + ? WHERE id = ?').bind(referralBonus, referrer.id).run();
      await env.DB.prepare(
        'INSERT INTO notifications (user_id, title, message, date) VALUES (?, "Referral Reward", ?, datetime("now"))'
      ).bind(referrer.id, `You earned ${referralBonus} points from a new referral!`).run();
    }
  }

  // 6. Log device
  if (deviceId) {
    await env.DB.prepare(
      'INSERT INTO device_tracker (user_id, device_id, ip_address, created_at) VALUES (?, ?, ?, datetime("now"))'
    ).bind(userId, deviceId, clientIp).run();
  }

  return jsonResponse({
    status: 200,
    message: 'Registered successfully',
    user: {
      id: userId,
      name,
      email,
      points: initialPoints,
      device_id: deviceId,
      referral_code: referralCode,
    },
  });
}

export async function handleLogin(request: Request, env: Env): Promise<Response> {
  const params = await parseParams(request);
  const email = params.get('email')?.trim().toLowerCase() || '';
  const password = params.get('password') || '';
  const clientIp = getClientIp(request);

  if (!email || !password) {
    return jsonResponse({ status: 400, message: 'Email and password are required' });
  }

  const user = await env.DB.prepare('SELECT * FROM users WHERE email = ? LIMIT 1').bind(email).first<UserRow>();

  if (!user) {
    return jsonResponse({ status: 400, message: 'Invalid email or password' });
  }

  // Check ban status
  if (user.status === 1) {
    return jsonResponse({ status: 403, message: 'Your account has been suspended' });
  }

  // Verify password (supports SHA-256 and legacy plaintext if present)
  const passwordHash = await hashPassword(password);
  const passwordMatches = user.password === passwordHash || user.password === password;

  if (!passwordMatches) {
    return jsonResponse({ status: 400, message: 'Invalid email or password' });
  }

  // Update IP
  await env.DB.prepare('UPDATE users SET ip_address = ? WHERE id = ?').bind(clientIp, user.id).run();

  return jsonResponse({
    status: 200,
    message: 'Login successful',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      points: user.points,
      device_id: user.device_id,
      referral_code: user.referral_code,
    },
  });
}

export async function handleForgotPassword(request: Request, env: Env): Promise<Response> {
  const params = await parseParams(request);
  const email = params.get('email')?.trim().toLowerCase() || '';

  if (!email) {
    return jsonResponse({ status: 400, message: 'Email is required' });
  }

  const user = await env.DB.prepare('SELECT id, name FROM users WHERE email = ? LIMIT 1').bind(email).first<UserRow>();
  if (!user) {
    return jsonResponse({ status: 404, message: 'User with this email not found' });
  }

  const code = generateRandomCode(6);
  // Store verification code in device_tracker or temp table
  await env.DB.prepare(
    'INSERT INTO device_tracker (user_id, device_id, ip_address, created_at) VALUES (?, ?, ?, datetime("now"))'
  ).bind(user.id, `RESET_${code}`, getClientIp(request)).run();

  await sendEmail(env, {
    to: email,
    subject: 'Password Reset Verification Code',
    html: `<h3>Password Reset</h3><p>Hello ${user.name},</p><p>Your password reset code is: <strong>${code}</strong></p><p>If you did not request this, please ignore this email.</p>`,
    text: `Your password reset code is: ${code}`,
  });

  return jsonResponse({ status: 200, message: 'Verification code sent to your email' });
}

export async function handleResetPassword(request: Request, env: Env): Promise<Response> {
  const params = await parseParams(request);
  const email = params.get('email')?.trim().toLowerCase() || '';
  const code = params.get('code')?.trim() || '';
  const newPassword = params.get('password') || '';

  if (!email || !code || !newPassword) {
    return jsonResponse({ status: 400, message: 'Email, code, and new password are required' });
  }

  const user = await env.DB.prepare('SELECT id FROM users WHERE email = ? LIMIT 1').bind(email).first<UserRow>();
  if (!user) {
    return jsonResponse({ status: 404, message: 'User not found' });
  }

  // Verify code
  const expectedTag = `RESET_${code}`;
  const validCode = await env.DB.prepare(
    'SELECT id FROM device_tracker WHERE user_id = ? AND device_id = ? ORDER BY id DESC LIMIT 1'
  ).bind(user.id, expectedTag).first();

  if (!validCode) {
    return jsonResponse({ status: 400, message: 'Invalid or expired verification code' });
  }

  const newHash = await hashPassword(newPassword);
  await env.DB.prepare('UPDATE users SET password = ? WHERE id = ?').bind(newHash, user.id).run();

  // Clean up reset code
  await env.DB.prepare('DELETE FROM device_tracker WHERE user_id = ? AND device_id = ?').bind(user.id, expectedTag).run();

  return jsonResponse({ status: 200, message: 'Password updated successfully' });
}
