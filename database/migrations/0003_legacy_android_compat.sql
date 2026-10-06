-- Legacy Android API compatibility for the original Colochess client.
-- Applied after 0001/0002. Do not edit older migrations.

ALTER TABLE users ADD COLUMN phone TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN country TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN ip_addr TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN date_registered TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN referraled_with TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN last_login TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

CREATE TABLE IF NOT EXISTS app_config (
    id INTEGER PRIMARY KEY,
    c_sign_up_bonus INTEGER NOT NULL DEFAULT 25,
    c_referral_points INTEGER NOT NULL DEFAULT 100,
    c_vpn TEXT NOT NULL DEFAULT 'off',
    c_root TEXT NOT NULL DEFAULT 'off',
    onsignale_app_id TEXT NOT NULL DEFAULT '',
    c_multiple TEXT NOT NULL DEFAULT 'off',
    device_id_count INTEGER NOT NULL DEFAULT 10,
    game_url TEXT NOT NULL DEFAULT '',
    site_page TEXT NOT NULL DEFAULT '',
    rules_page TEXT NOT NULL DEFAULT '',
    privacy_page TEXT NOT NULL DEFAULT '',
    contact_page TEXT NOT NULL DEFAULT '',
    tab_payeer TEXT NOT NULL DEFAULT 'Payeer',
    tab_paypal TEXT NOT NULL DEFAULT 'PayPal'
);

CREATE TABLE IF NOT EXISTS offerwall_ids (
    id INTEGER PRIMARY KEY,
    network_name TEXT NOT NULL,
    app_ids TEXT NOT NULL,
    app_placement TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS sdk_offerwalls (
    id INTEGER PRIMARY KEY,
    net_name TEXT NOT NULL,
    net_desc TEXT NOT NULL DEFAULT '',
    net_image TEXT NOT NULL DEFAULT '',
    net_app_ids TEXT NOT NULL DEFAULT '',
    net_placement TEXT NOT NULL DEFAULT 'null',
    type TEXT NOT NULL,
    status_ INTEGER NOT NULL DEFAULT 1,
    sdk_or_web TEXT NOT NULL DEFAULT 'sdk',
    postback_url TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS notify (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userid INTEGER NOT NULL,
    username TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    character_name TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL DEFAULT '',
    withdrawal TEXT NOT NULL DEFAULT '',
    status INTEGER NOT NULL DEFAULT 0,
    date TEXT NOT NULL DEFAULT '',
    transid TEXT NOT NULL DEFAULT '',
    trans_status INTEGER NOT NULL DEFAULT 1,
    t_device_name TEXT NOT NULL DEFAULT '',
    t_device_bramd TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_notify_userid ON notify(userid);
CREATE INDEX IF NOT EXISTS idx_notify_transid ON notify(transid);

CREATE TABLE IF NOT EXISTS tracker_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userid TEXT NOT NULL,
    points TEXT NOT NULL DEFAULT '0',
    trans_id TEXT DEFAULT '',
    device_id TEXT DEFAULT '',
    country TEXT DEFAULT '',
    ip TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL DEFAULT '',
    date TEXT NOT NULL DEFAULT '',
    placement TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_tracker_users_userid ON tracker_users(userid);
CREATE INDEX IF NOT EXISTS idx_tracker_users_trans_id ON tracker_users(trans_id);

INSERT OR IGNORE INTO app_config
(id, c_sign_up_bonus, c_referral_points, c_vpn, c_root, onsignale_app_id, c_multiple, device_id_count, game_url,
 site_page, rules_page, privacy_page, contact_page, tab_payeer, tab_paypal)
VALUES
(1, 25, 100, 'off', 'off', '', 'off', 10, '',
 '/pages/site', '/pages/rules', '/pages/privacy', '/pages/contact', 'Payeer', 'PayPal');

INSERT OR IGNORE INTO offerwall_ids (id, network_name, app_ids, app_placement) VALUES
(1, 'TapJoy', 'ano1fL9eQLCFWQcvHXXsIQECIVzbjO2fYHWYbefCwPYm5Nph31FzNagArybQ', 'Colo Chess'),
(2, 'IronSource', '1821c4e4d', 'DefaultOfferWall'),
(3, 'Youmi', '', 'null'),
(4, 'OkSpin', 'XKVZaIuJkfGiaXL4YEK24yzWPckOUxIK', '10069');

INSERT OR IGNORE INTO sdk_offerwalls
(id, net_name, net_desc, net_image, net_app_ids, net_placement, type, status_, sdk_or_web, postback_url)
VALUES
(1, 'TapJoy', 'Check this offerwall', 'tapjoy.png',
 'ano1fL9eQLCFWqcvHXXsIQECIVzbjO2fYHWYbefCwPYm5Nph31FzNagArybQ', 'Colo Chess', 'tapjoy', 1, 'sdk', ''),
(2, 'IronSource', 'Check this offerwall', 'ironsrs.png',
 '1821c4e4d', 'DefaultOfferWall', 'ironsource', 1, 'sdk', ''),
(4, 'OkSpin', 'Check this offerwall', 'okspin.png',
 'XKVZaIuJkfGiaXL4YEK24yzWPckOUxIK', '10069', 'okspin', 1, 'sdk', '');
