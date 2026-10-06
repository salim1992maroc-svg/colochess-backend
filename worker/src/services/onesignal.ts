import { Env } from '../types';

export async function sendOneSignalPush(
  env: Env,
  title: string,
  message: string,
  playerIds?: string[]
): Promise<{ success: boolean; data?: unknown }> {
  // Query DB settings if not in env
  let appId = env.ONESIGNAL_APP_ID;
  let restKey = env.ONESIGNAL_REST_KEY;

  if (!appId || !restKey) {
    const settings = await env.DB.prepare('SELECT onesignal_app_id, onesignal_rest_key FROM site_settings WHERE id = 1 LIMIT 1').first<{ onesignal_app_id: string; onesignal_rest_key: string }>();
    if (settings) {
      appId = appId || settings.onesignal_app_id;
      restKey = restKey || settings.onesignal_rest_key;
    }
  }

  if (!appId || !restKey || appId === 'your-onesignal-app-id') {
    return { success: false, data: 'OneSignal credentials not configured' };
  }

  try {
    const body: Record<string, unknown> = {
      app_id: appId,
      headings: { en: title },
      contents: { en: message },
    };

    if (playerIds && playerIds.length > 0) {
      body.include_player_ids = playerIds;
    } else {
      body.included_segments = ['All'];
    }

    const res = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Basic ${restKey}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return { success: res.ok, data };
  } catch (err) {
    console.error('OneSignal push error:', err);
    return { success: false, data: String(err) };
  }
}
