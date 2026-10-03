-- D1 SQLite Migration: 0002_seed_data.sql
-- Initial configuration, pages, payment packages, and settings

-- Default Site Settings
INSERT OR IGNORE INTO site_settings (id, auto_ban_vpn, auto_ban_root, auto_ban_multi, onesignal_app_id, onesignal_rest_key, spin_points, daily_bonus, referral_bonus)
VALUES (1, 0, 0, 0, 'your-onesignal-app-id', 'your-onesignal-rest-key', '5,10,15,20,50,0,100', 25, 100);

-- Default Pages
INSERT OR IGNORE INTO pages (id, type, title, content)
VALUES 
(1, 'privacy', 'Privacy Policy', '<h1>Privacy Policy</h1><p>We respect your privacy. All user information is kept strictly confidential and secure.</p>'),
(2, 'terms', 'Terms and Conditions', '<h1>Terms of Service</h1><p>By using this application, you agree to our terms of service.</p>'),
(3, 'rules', 'Game and Reward Rules', '<h1>Rules</h1><p>Only one account per device. VPN and Root access are strictly monitored.</p>');

-- Default Cashout Packages (PayPal)
INSERT OR IGNORE INTO character (id, name, amount, points, image, status)
VALUES 
(1, 'PayPal', '$1.00 USD', 1000, 'paypal.png', 1),
(2, 'PayPal', '$5.00 USD', 5000, 'paypal.png', 1),
(3, 'PayPal', '$10.00 USD', 10000, 'paypal.png', 1),
(4, 'Payeer', '$1.00 USD', 1000, 'payeer.png', 1),
(5, 'Payeer', '$5.00 USD', 5000, 'payeer.png', 1);

-- Default Dialog Message
INSERT OR IGNORE INTO dialog_msg (id, title, message, image, status)
VALUES (1, 'Welcome to Colochess!', 'Play games, complete offers, and redeem your coins for real rewards!', '', 0);

-- Default Admin Account (password will be set via setup/env)
INSERT OR IGNORE INTO admin (id, username, password, email)
VALUES (1, 'admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'admin@colochess.com');
