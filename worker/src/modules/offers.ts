import { Env } from '../types';
import { jsonResponse, parseParams } from '../utils/helpers';

export async function handleCustomOfferwalls(env: Env): Promise<Response> {
  const { results } = await env.DB.prepare(
    'SELECT id, title, description, image, url, status FROM custom_offerwalls WHERE status = 1 ORDER BY id ASC'
  ).all();

  return jsonResponse(results || []);
}

export async function handleOfferwallsApi(env: Env): Promise<Response> {
  const { results } = await env.DB.prepare(
    'SELECT id, title, description, image, url_or_sdk_key, status FROM offerwalls WHERE status = 1 ORDER BY id ASC'
  ).all();

  return jsonResponse(results || []);
}

export async function handleGetIds(env: Env): Promise<Response> {
  // Returns SDK placement & app IDs
  const settings = await env.DB.prepare('SELECT * FROM site_settings WHERE id = 1 LIMIT 1').first<Record<string, unknown>>();

  return jsonResponse({
    status: 200,
    ...settings,
  });
}

export async function handleDialogMsg(env: Env): Promise<Response> {
  const dialog = await env.DB.prepare(
    'SELECT title, message, image, status FROM dialog_msg WHERE id = 1 LIMIT 1'
  ).first<{ title: string; message: string; image: string; status: number }>();

  if (!dialog || dialog.status !== 1) {
    return jsonResponse({ status: 0, title: '', message: '', image: '' });
  }

  return jsonResponse({
    status: 1,
    title: dialog.title,
    message: dialog.message,
    image: dialog.image,
  });
}

export async function handlePagesInfo(request: Request, env: Env): Promise<Response> {
  const params = await parseParams(request);
  const type = params.get('type') || 'privacy';

  const page = await env.DB.prepare('SELECT title, content FROM pages WHERE type = ? LIMIT 1').bind(type).first<{ title: string; content: string }>();

  if (!page) {
    return jsonResponse({ status: 404, title: 'Not Found', content: '<p>Page not found</p>' });
  }

  return jsonResponse({
    status: 200,
    title: page.title,
    content: page.content,
  });
}

export async function handleTab(env: Env): Promise<Response> {
  // Returns payment tabs (PayPal, Payeer)
  const { results } = await env.DB.prepare(
    'SELECT DISTINCT name as tab_name FROM character WHERE status = 1 ORDER BY id ASC'
  ).all<{ tab_name: string }>();

  return jsonResponse(results || [{ tab_name: 'PayPal' }, { tab_name: 'Payeer' }]);
}
