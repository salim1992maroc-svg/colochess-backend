-- D1 SQLite Migration: 0001_initial_schema.sql
-- Converted from pointgam_colochess.sql for Cloudflare D1
-- Preserves all tables, column names, relationships, and data types

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 0,
    device_id TEXT DEFAULT '',
    referral_code TEXT UNIQUE,
    referred_by TEXT DEFAULT '',
    status INTEGER NOT NULL DEFAULT 0, -- 0 = active, 1 = banned
    ip_address TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_device_id ON users(device_id);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);

-- 2. Withdrawal Records (PayPal / Payeer)
CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount TEXT NOT NULL,
    points INTEGER NOT NULL,
    payment_method TEXT NOT NULL,
    account TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, refus
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_records_user_id ON records(user_id);
CREATE INDEX IF NOT EXISTS idx_records_status ON records(status);

-- 3. Offerwall Completed Transactions
CREATE TABLE IF NOT EXISTS offers_transaction (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    offer_name TEXT NOT NULL,
    points INTEGER NOT NULL,
    trans_id TEXT NOT NULL,
    date TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Note: Non-unique index to safely support existing historical data with duplicate or empty trans_ids
CREATE INDEX IF NOT EXISTS idx_offers_trans_id ON offers_transaction(trans_id);
CREATE INDEX IF NOT EXISTS idx_offers_trans_user_id ON offers_transaction(user_id);

-- 4. Reward / Redemption Packages (Characters)
CREATE TABLE IF NOT EXISTS character (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    amount TEXT NOT NULL,
    points INTEGER NOT NULL,
    image TEXT DEFAULT '',
    status INTEGER NOT NULL DEFAULT 1 -- 1 = active, 0 = inactive
);

-- 5. Offerwalls (SDK Integrated)
CREATE TABLE IF NOT EXISTS offerwalls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    image TEXT DEFAULT '',
    url_or_sdk_key TEXT DEFAULT '',
    status INTEGER NOT NULL DEFAULT 1
);

-- 6. Custom Offerwalls (Web-based)
CREATE TABLE IF NOT EXISTS custom_offerwalls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    image TEXT DEFAULT '',
    url TEXT DEFAULT '',
    status INTEGER NOT NULL DEFAULT 1
);

-- 7. In-App Dialog Messages / Announcements
CREATE TABLE IF NOT EXISTS dialog_msg (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    image TEXT DEFAULT '',
    status INTEGER NOT NULL DEFAULT 1
);

-- 8. Global Settings / Anti-Fraud Toggles
CREATE TABLE IF NOT EXISTS site_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    auto_ban_vpn INTEGER NOT NULL DEFAULT 0,
    auto_ban_root INTEGER NOT NULL DEFAULT 0,
    auto_ban_multi INTEGER NOT NULL DEFAULT 0,
    onesignal_app_id TEXT DEFAULT '',
    onesignal_rest_key TEXT DEFAULT '',
    spin_points TEXT DEFAULT '10,20,50,100,0',
    daily_bonus INTEGER NOT NULL DEFAULT 25,
    referral_bonus INTEGER NOT NULL DEFAULT 100
);

-- 9. Admin Credentials
CREATE TABLE IF NOT EXISTS admin (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    email TEXT DEFAULT ''
);

-- 10. Information Pages (Privacy Policy, Terms, Rules)
CREATE TABLE IF NOT EXISTS pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL UNIQUE, -- privacy, terms, rules
    title TEXT NOT NULL,
    content TEXT NOT NULL
);

-- 11. User Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    date TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- 12. Device & Fraud Tracker Logs
CREATE TABLE IF NOT EXISTS device_tracker (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER DEFAULT 0,
    device_id TEXT NOT NULL,
    ip_address TEXT DEFAULT '',
    vpn_detected INTEGER DEFAULT 0,
    root_detected INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_device_tracker_device_id ON device_tracker(device_id);
