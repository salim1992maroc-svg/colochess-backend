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
  // The legacy Android client expects an ARRAY of offer-network records, not
  // the site_settings object. Support both the newer network columns and the
  // original offerwalls schema so the endpoint remains backward compatible.
  try {
    const modern = await env.DB.prepare(
      `SELECT network_name, ids_, placem, app_ids, app_placement, title, url_or_sdk_key, description
       FROM offerwalls WHERE status = 1 ORDER BY id ASC`
    ).all<Record<string, unknown>>();

    const rows = (modern.results || []).map((row) => ({
      network_name: String(row.network_name ?? row.title ?? ''),
      ids_: String(row.ids_ ?? row.app_ids ?? row.url_or_sdk_key ?? ''),
      placem: String(row.placem ?? row.app_placement ?? row.description ?? ''),
      app_ids: String(row.app_ids ?? row.ids_ ?? row.url_or_sdk_key ?? ''),
      app_placement: String(row.app_placement ?? row.placem ?? row.description ?? ''),
    }));

    return jsonResponse(rows);
  } catch {
    // Older D1 schema has no network_name/ids_/placem columns. Fall back to
    // the original columns instead of returning HTTP 500 to the Android app.
    const legacy = await env.DB.prepare(
      'SELECT title, description, url_or_sdk_key FROM offerwalls WHERE status = 1 ORDER BY id ASC'
    ).all<{ title: string; description: string; url_or_sdk_key: string }>();

    const rows = (legacy.results || []).map((row) => ({
      network_name: row.title || '',
      ids_: row.url_or_sdk_key || '',
      placem: row.description || '',
      app_ids: row.url_or_sdk_key || '',
      app_placement: row.description || '',
    }));

    return jsonResponse(rows);
  }
}

export async function handleDialogMsg(env: Env): Promise<Response> {
  const dialog = await env.DB.prepare(
    'SELECT title, message, image, status FROM dialog_msg WHERE id = 1 LIMIT 1'
  ).first<{ title: string; message: string; image: string; status: number }>();

  if (!dialog || dialog.status !== 1) {
    return jsonResponse({ status: 0, success: false, title: '', message: '', image: '' });
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
