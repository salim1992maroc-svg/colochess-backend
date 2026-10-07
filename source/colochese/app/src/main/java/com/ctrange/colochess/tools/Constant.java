package com.ctrange.colochess.tools;

public class Constant {

    // Main domain & base URL configured for HTTPS directly through Cloudflare
    public static final String MAIN_URL = "https://colochess-backend.malakmalki125.workers.dev/";
    public static final String BASE_URL = MAIN_URL;

    // API Routes (exact mappings preserved)
    public static final String CHECK_DEVICE_ID = BASE_URL + "api/checkDeviceID.php";
    public static final String DIALOG_MSG = BASE_URL + "api/dialogmsg.php";
    public static final String LOGIN = BASE_URL + "api/login.php";
    public static final String SIGN_UP = BASE_URL + "api/registers.php";
    public static final String FORGOT = BASE_URL + "api/forget.php";
    public static final String RESET_PASS = BASE_URL + "api/rest_pass.php";
    public static final String USERS = BASE_URL + "api/users.php";
    public static final String NOTIFY = BASE_URL + "api/notify.php";
    public static final String SPIN = BASE_URL + "api/spin.php";
    public static final String CHANGE_USERNAME = BASE_URL + "api/changeusername.php";
    public static final String DELETE_USER = BASE_URL + "api/delete_user.php";
    public static final String REFERRAL = BASE_URL + "api/referral.php";
    public static final String PAGES_INFO = BASE_URL + "api/pagesinfo.php";
    public static final String CUSTOM_OFFERWALLS = BASE_URL + "api/customofferwalls.php";
    public static final String OFFERWALLS_API = BASE_URL + "api/offerwalls.api.php";
    public static final String IDS = BASE_URL + "api/ids.php";
    public static final String TAB = BASE_URL + "api/tab.php";
    public static final String PAYPAL = BASE_URL + "api/paypal.php";
    public static final String PAYEER = BASE_URL + "api/payeer.php";
    public static final String TRANS_DATA = BASE_URL + "api/transData.php";
    public static final String OFFERS_TRANS = BASE_URL + "api/offerstrans.php";
    public static final String UPDATE_POINTS = BASE_URL + "api/updateP.php";
}
