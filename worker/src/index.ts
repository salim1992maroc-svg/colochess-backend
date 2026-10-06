import { Env } from './types';
import { jsonResponse } from './utils/helpers';
import { handleRegister, handleLogin, handleForgotPassword, handleResetPassword } from './modules/auth';
import { handleCheckDeviceID, handleGetUserInfo, handleChangeUsername, handleDeleteUser, handleReferral, handleNotifications } from './modules/users';
import { handleUpdatePoints, handleSpin } from './modules/points';
import { handleCustomOfferwalls, handleOfferwallsApi, handleGetIds, handleDialogMsg, handlePagesInfo, handleTab } from './modules/offers';
import { handlePayPal, handlePayeer } from './modules/withdrawals';
import { handleTransData, handleOffersTrans } from './modules/transactions';
import { handleOkSpinPostback, handleLuckwalPostback, handleGenericPostback } from './modules/postbacks';
import { legacyCheckDevice, legacyRegister, legacyLogin, legacyUsers, legacyChangeUsername, legacyDeleteUser, legacyReferral, legacyNotify, legacyUpdatePoints, legacyController, legacyPages, legacyTab, legacyIds, legacyDialog, legacyCustomOfferwalls, legacyPayPal, legacyPayeer, legacyTransData, legacyOffersTrans, legacyForgot, legacyAuthLogin } from './modules/legacy';
import {
  authenticateAdmin,
  handleAdminLogin,
  handleAdminStats,
  handleAdminUsers,
  handleAdminUpdateUser,
  handleAdminWithdrawals,
  handleAdminWithdrawalAction,
  handleAdminSettings,
  handleAdminPushNotification,
} from './modules/admin';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // 1. CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const url = new URL(request.url);
    // Strip trailing slashes and normalize path
    let path = url.pathname.replace(/\/+$/, '');
    if (!path.startsWith('/')) path = `/${path}`;

    // Normalize path by stripping optional '/admin_game' prefix used by the legacy server
    const normalizedPath = path.replace(/^\/admin_game/, '');

    try {
      // -------------------------------------------------------------
      // A. POSTBACK ROUTES (High priority, machine-to-machine)
      // -------------------------------------------------------------
      if (normalizedPath === '/postbacks/okspin.php' || normalizedPath === '/postbacks/okspin') {
        return handleOkSpinPostback(request, env);
      }

      if (normalizedPath === '/postbacks/luckwal.php' || normalizedPath === '/postbacks/luckwal') {
        return handleLuckwalPostback(request, env);
      }

      if (normalizedPath === '/postback.php' || normalizedPath === '/postback') {
        return handleGenericPostback(request, env);
      }

      // -------------------------------------------------------------
      // B. ANDROID CLIENT API ROUTES (Supporting both .php & clean paths)
      // -------------------------------------------------------------
      // Legacy PHP-compatible API used by the original Android client.
      // Keep these exact response shapes isolated from the newer JSON API.
      switch (normalizedPath) {
        case '/api/checkDeviceID.php': return legacyCheckDevice(request, env);
        case '/api/registers.php': return legacyRegister(request, env);
        case '/api/login.php': return legacyLogin(request, env);
        case '/api/forget.php': return legacyForgot(request, env);
        case '/api/users.php': return legacyUsers(request, env);
        case '/api/changeusername.php': return legacyChangeUsername(request, env);
        case '/api/delete_user.php': return legacyDeleteUser(request, env);
        case '/api/referral.php': return legacyReferral(request, env);
        case '/api/notify.php': return legacyNotify(request, env);
        case '/api/updateP.php': return legacyUpdatePoints(request, env);
        case '/api/controller.php': return legacyController(env);
        case '/api/pagesinfo.php': return legacyPages(env);
        case '/api/tab.php': return legacyTab(env);
        case '/api/ids.php': return legacyIds(env);
        case '/api/dialogmsg.php': return legacyDialog(request, env);
        case '/api/customofferwalls.php': return legacyCustomOfferwalls(env);
        case '/api/paypal.php': return legacyPayPal(request, env);
        case '/api/payeer.php': return legacyPayeer(request, env);
        case '/api/transData.php': return legacyTransData(request, env);
        case '/api/offerstrans.php': return legacyOffersTrans(request, env);
      }

      switch (normalizedPath) {
        // Authentication
        case '/api/registers.php':
        case '/api/registers':
          return handleRegister(request, env);

        case '/api/login.php':
        case '/api/login':
          return handleLogin(request, env);

        case '/api/forget.php':
        case '/api/forget':
          return handleForgotPassword(request, env);

        case '/api/rest_pass.php':
        case '/api/rest_pass':
          return handleResetPassword(request, env);

        // User & Device
        case '/api/checkDeviceID.php':
        case '/api/checkDeviceID':
          return handleCheckDeviceID(request, env);

        case '/api/users.php':
        case '/api/users':
          return handleGetUserInfo(request, env);

        case '/api/changeusername.php':
        case '/api/changeusername':
          return handleChangeUsername(request, env);

        case '/api/delete_user.php':
        case '/api/delete_user':
          return handleDeleteUser(request, env);

        case '/api/referral.php':
        case '/api/referral':
          return handleReferral(request, env);

        case '/api/notify.php':
        case '/api/notify':
          return handleNotifications(request, env);

        // Points & Gameplay
        case '/api/updateP.php':
        case '/api/updateP':
          return handleUpdatePoints(request, env);

        case '/api/spin.php':
        case '/api/spin':
          return handleSpin(request, env);

        // Offers & Settings
        case '/api/customofferwalls.php':
        case '/api/customofferwalls':
          return handleCustomOfferwalls(env);

        case '/api/offerwalls.api.php':
        case '/api/offerwalls.api':
        case '/api/offerwalls':
          return handleOfferwallsApi(env);

        case '/api/ids.php':
        case '/api/ids':
          return handleGetIds(env);

        case '/api/dialogmsg.php':
        case '/api/dialogmsg':
          return handleDialogMsg(env);

        case '/api/pagesinfo.php':
        case '/api/pagesinfo':
          return handlePagesInfo(request, env);

        case '/api/tab.php':
        case '/api/tab':
          return handleTab(env);

        // Withdrawals
        case '/api/paypal.php':
        case '/api/paypal':
          return handlePayPal(request, env);

        case '/api/payeer.php':
        case '/api/payeer':
          return handlePayeer(request, env);

        case '/api/transData.php':
        case '/api/transData':
          return handleTransData(request, env);

        case '/api/offerstrans.php':
        case '/api/offerstrans':
          return handleOffersTrans(request, env);
      }

      // -------------------------------------------------------------
      // C. ADMIN DASHBOARD API ROUTES
      // -------------------------------------------------------------
      if (normalizedPath === '/api/auth/login') {
        return legacyAuthLogin(request, env);
      }

      if (normalizedPath === '/admin/api/login') {
        return handleAdminLogin(request, env);
      }

      if (normalizedPath.startsWith('/admin/api/')) {
        const adminUser = await authenticateAdmin(request, env);
        if (!adminUser) {
          return jsonResponse({ status: 401, message: 'Unauthorized. Admin session required.' }, 401);
        }

        switch (normalizedPath) {
          case '/admin/api/me':
            return jsonResponse({ status: 200, username: adminUser });

          case '/admin/api/stats':
            return handleAdminStats(env);

          case '/admin/api/users':
            return handleAdminUsers(request, env);

          case '/admin/api/users/update':
            return handleAdminUpdateUser(request, env);

          case '/admin/api/withdrawals':
            return handleAdminWithdrawals(request, env);

          case '/admin/api/withdrawals/action':
            return handleAdminWithdrawalAction(request, env);

          case '/admin/api/settings':
            return handleAdminSettings(request, env);

          case '/admin/api/notify':
            return handleAdminPushNotification(request, env);
        }
      }

      // Health / Status endpoint
      if (normalizedPath === '/' || normalizedPath === '/status') {
        return jsonResponse({
          status: 200,
          service: 'Colochess Cloudflare Worker & D1 Backend',
          version: '1.0.0',
          time: new Date().toISOString(),
        });
      }

      // 404 Route not found
      return jsonResponse({ status: 404, message: 'Endpoint not found' }, 404);
    } catch (err: unknown) {
      console.error('Unhandled worker error:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      return jsonResponse({ status: 500, message: 'Internal Server Error', error: errMsg }, 500);
    }
  },
};
