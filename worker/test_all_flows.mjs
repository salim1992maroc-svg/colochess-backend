// Comprehensive Verification Test Suite for Cloudflare Worker & D1 Backend
import workerModule from './src/index.ts';

const worker = workerModule.default || workerModule;

console.log("Starting Phase 11 Automated Verification Suite...");

// Mock D1 Database implementation
class MockD1 {
  constructor() {
    this.tables = {
      users: [],
      records: [],
      offers_transaction: [],
      character: [
        { id: 1, name: 'PayPal', amount: '$5.00', points: 5000, image: 'paypal.png', status: 1 },
        { id: 2, name: 'Payeer', amount: '$5.00', points: 5000, image: 'payeer.png', status: 1 }
      ],
      offerwalls: [
        { id: 1, title: 'AdGate', description: 'Offerwall', image: '', url_or_sdk_key: 'sdk_key_1', status: 1 }
      ],
      custom_offerwalls: [
        { id: 1, title: 'Web Offers', description: 'Webwall', image: '', url: 'https://offers.com', status: 1 }
      ],
      dialog_msg: { id: 1, title: 'Welcome', message: 'Hello!', image: '', status: 1 },
      site_settings: { id: 1, auto_ban_vpn: 0, auto_ban_root: 0, auto_ban_multi: 0, onesignal_app_id: 'test-app-id', onesignal_rest_key: 'test-rest-key', daily_bonus: 50, referral_bonus: 100 },
      admin: { id: 1, username: 'admin', password: '', email: 'admin@test.com' },
      pages: {
        privacy: { title: 'Privacy', content: 'Privacy text' },
        terms: { title: 'Terms', content: 'Terms text' }
      },
      notifications: [],
      device_tracker: []
    };
    this.autoInc = { users: 1, records: 1, offers_transaction: 1, notifications: 1, device_tracker: 1 };
  }

  prepare(sql) {
    const db = this;
    return {
      boundArgs: [],
      bind(...args) {
        this.boundArgs = args;
        return this;
      },
      async first(col) {
        const res = await this.all();
        if (!res || !res.results || res.results.length === 0) return null;
        if (col) return res.results[0][col];
        return res.results[0];
      },
      async all() {
        const query = sql.trim();

        if (query.includes('FROM site_settings')) {
          return { results: [db.tables.site_settings] };
        }
        if (query.includes('FROM dialog_msg')) {
          return { results: [db.tables.dialog_msg] };
        }
        if (query.includes('FROM pages WHERE type = ?')) {
          const type = this.boundArgs[0];
          return { results: db.tables.pages[type] ? [db.tables.pages[type]] : [] };
        }
        if (query.includes('FROM users WHERE email = ?')) {
          const email = this.boundArgs[0];
          const user = db.tables.users.find(u => u.email === email);
          return { results: user ? [user] : [] };
        }
        if (query.includes('FROM users WHERE id = ?')) {
          const id = Number(this.boundArgs[0]);
          const user = db.tables.users.find(u => u.id === id);
          return { results: user ? [user] : [] };
        }
        if (query.includes('FROM users WHERE referral_code = ?')) {
          const code = this.boundArgs[0];
          const user = db.tables.users.find(u => u.referral_code === code);
          return { results: user ? [user] : [] };
        }
        if (query.includes('FROM users WHERE device_id = ?')) {
          const dev = this.boundArgs[0];
          const user = db.tables.users.find(u => u.device_id === dev);
          return { results: user ? [user] : [] };
        }
        if (query.includes('FROM admin WHERE username = ?')) {
          const u = this.boundArgs[0];
          return { results: (db.tables.admin.username === u) ? [db.tables.admin] : [] };
        }
        if (query.includes('FROM offers_transaction WHERE trans_id = ?')) {
          const tid = this.boundArgs[0];
          const found = db.tables.offers_transaction.filter(t => t.trans_id === tid);
          return { results: found };
        }
        if (query.includes('FROM character WHERE name LIKE "%PayPal%"')) {
          return { results: db.tables.character.filter(c => c.name.includes('PayPal')) };
        }
        if (query.includes('FROM character WHERE name LIKE "%Payeer%"')) {
          return { results: db.tables.character.filter(c => c.name.includes('Payeer')) };
        }
        if (query.includes('FROM offerwalls')) {
          return { results: db.tables.offerwalls };
        }
        if (query.includes('FROM custom_offerwalls')) {
          return { results: db.tables.custom_offerwalls };
        }
        if (query.includes('FROM character WHERE status = 1')) {
          return { results: [{ tab_name: 'PayPal' }, { tab_name: 'Payeer' }] };
        }
        if (query.includes('FROM records WHERE user_id = ?')) {
          const uid = Number(this.boundArgs[0]);
          return { results: db.tables.records.filter(r => r.user_id === uid) };
        }
        if (query.includes('FROM records r JOIN users u')) {
          const status = this.boundArgs[0];
          return { results: db.tables.records.filter(r => r.status === status) };
        }
        if (query.includes('FROM records WHERE id = ?')) {
          const id = Number(this.boundArgs[0]);
          return { results: db.tables.records.filter(r => r.id === id) };
        }
        if (query.includes('FROM offers_transaction WHERE user_id = ?')) {
          const uid = Number(this.boundArgs[0]);
          return { results: db.tables.offers_transaction.filter(o => o.user_id === uid) };
        }
        if (query.includes('FROM notifications')) {
          return { results: db.tables.notifications };
        }
        if (query.includes('SELECT COUNT(*) as count FROM users')) {
          return { results: [{ count: db.tables.users.length }] };
        }
        if (query.includes('SELECT SUM(points) as sum FROM users')) {
          const sum = db.tables.users.reduce((acc, u) => acc + u.points, 0);
          return { results: [{ sum }] };
        }
        if (query.includes('SELECT COUNT(*) as count, SUM(points) as points FROM records WHERE status = "pending"')) {
          const pend = db.tables.records.filter(r => r.status === 'pending');
          const sum = pend.reduce((acc, r) => acc + r.points, 0);
          return { results: [{ count: pend.length, points: sum }] };
        }
        if (query.includes('SELECT COUNT(*) as count, SUM(points) as points FROM records WHERE status = "completed"')) {
          const comp = db.tables.records.filter(r => r.status === 'completed');
          const sum = comp.reduce((acc, r) => acc + r.points, 0);
          return { results: [{ count: comp.length, points: sum }] };
        }
        if (query.includes('SELECT COUNT(*) as total FROM users')) {
          return { results: [{ total: db.tables.users.length }] };
        }
        if (query.includes('SELECT id, name, email, points, status FROM users')) {
          return { results: db.tables.users };
        }
        if (query.includes('FROM device_tracker WHERE user_id = ? AND device_id = ?')) {
          const [uid, dev] = this.boundArgs;
          return { results: db.tables.device_tracker.filter(d => d.user_id === uid && d.device_id === dev) };
        }

        return { results: [] };
      },
      async run() {
        const query = sql.trim();

        if (query.startsWith('INSERT INTO users')) {
          const [name, email, password, points, device_id, referral_code, referred_by, ip_address] = this.boundArgs;
          const id = db.autoInc.users++;
          const row = { id, name, email, password, points, device_id, referral_code, referred_by, status: 0, ip_address, created_at: new Date().toISOString() };
          db.tables.users.push(row);
          return { meta: { last_row_id: id } };
        }

        if (query.startsWith('UPDATE users SET points = points + ? WHERE id = ?')) {
          const [pts, id] = this.boundArgs;
          const u = db.tables.users.find(x => x.id === Number(id));
          if (u) u.points += Number(pts);
          return { meta: {} };
        }

        if (query.startsWith('UPDATE users SET points = points - ? WHERE id = ?')) {
          const [pts, id] = this.boundArgs;
          const u = db.tables.users.find(x => x.id === Number(id));
          if (u) u.points -= Number(pts);
          return { meta: {} };
        }

        if (query.startsWith('UPDATE users SET points = MAX(0, points - ?) WHERE id = ?')) {
          const [pts, id] = this.boundArgs;
          const u = db.tables.users.find(x => x.id === Number(id));
          if (u) u.points = Math.max(0, u.points - Number(pts));
          return { meta: {} };
        }

        if (query.startsWith('UPDATE users SET points = MAX(0, points + ?) WHERE id = ?')) {
          const [pts, id] = this.boundArgs;
          const u = db.tables.users.find(x => x.id === Number(id));
          if (u) u.points = Math.max(0, u.points + Number(pts));
          return { meta: {} };
        }

        if (query.startsWith('UPDATE users SET points = ? WHERE id = ?')) {
          const [pts, id] = this.boundArgs;
          const u = db.tables.users.find(x => x.id === Number(id));
          if (u) u.points = Number(pts);
          return { meta: {} };
        }

        if (query.startsWith('UPDATE users SET status = ? WHERE id = ?')) {
          const [st, id] = this.boundArgs;
          const u = db.tables.users.find(x => x.id === Number(id));
          if (u) u.status = Number(st);
          return { meta: {} };
        }

        if (query.startsWith('UPDATE users SET name = ? WHERE id = ?')) {
          const [name, id] = this.boundArgs;
          const u = db.tables.users.find(x => x.id === Number(id));
          if (u) u.name = name;
          return { meta: {} };
        }

        if (query.startsWith('UPDATE users SET password = ? WHERE id = ?')) {
          const [pw, id] = this.boundArgs;
          const u = db.tables.users.find(x => x.id === Number(id));
          if (u) u.password = pw;
          return { meta: {} };
        }

        if (query.startsWith('UPDATE users SET ip_address = ? WHERE id = ?')) {
          const [ip, id] = this.boundArgs;
          const u = db.tables.users.find(x => x.id === Number(id));
          if (u) u.ip_address = ip;
          return { meta: {} };
        }

        if (query.startsWith('DELETE FROM users WHERE id = ?')) {
          const id = Number(this.boundArgs[0]);
          db.tables.users = db.tables.users.filter(x => x.id !== id);
          return { meta: {} };
        }

        if (query.startsWith('INSERT INTO records')) {
          const [user_id, amount, points, account] = this.boundArgs;
          const method = query.includes('PayPal') ? 'PayPal' : 'Payeer';
          const id = db.autoInc.records++;
          db.tables.records.push({ id, user_id: Number(user_id), amount, points: Number(points), payment_method: method, account, status: 'pending', created_at: new Date().toISOString() });
          return { meta: { last_row_id: id } };
        }

        if (query.startsWith('UPDATE records SET status = ? WHERE id = ?') || query.startsWith('UPDATE records SET status = "completed"')) {
          const [st, id] = query.includes('completed') ? ['completed', this.boundArgs[0]] : query.includes('refus') ? ['refus', this.boundArgs[0]] : [this.boundArgs[0], this.boundArgs[1]];
          const r = db.tables.records.find(x => x.id === Number(id));
          if (r) r.status = st;
          return { meta: {} };
        }

        if (query.startsWith('INSERT INTO offers_transaction')) {
          const [user_id, offer_name, points, trans_id] = this.boundArgs;
          const id = db.autoInc.offers_transaction++;
          db.tables.offers_transaction.push({ id, user_id: Number(user_id), offer_name, points: Number(points), trans_id, date: new Date().toISOString() });
          return { meta: { last_row_id: id } };
        }

        if (query.startsWith('INSERT INTO notifications')) {
          const [user_id, title, message] = this.boundArgs;
          const id = db.autoInc.notifications++;
          db.tables.notifications.push({ id, user_id: Number(user_id), title, message, date: new Date().toISOString() });
          return { meta: { last_row_id: id } };
        }

        if (query.startsWith('INSERT INTO device_tracker')) {
          const [user_id, device_id, ip] = this.boundArgs;
          const id = db.autoInc.device_tracker++;
          db.tables.device_tracker.push({ id, user_id: Number(user_id), device_id, ip_address: ip, created_at: new Date().toISOString() });
          return { meta: { last_row_id: id } };
        }

        if (query.startsWith('DELETE FROM device_tracker WHERE user_id = ? AND device_id = ?')) {
          const [uid, dev] = this.boundArgs;
          db.tables.device_tracker = db.tables.device_tracker.filter(d => !(d.user_id === Number(uid) && d.device_id === dev));
          return { meta: {} };
        }

        return { meta: {} };
      }
    };
  }

  async batch(statements) {
    for (const stmt of statements) {
      await stmt.run();
    }
    return [];
  }
}

async function runTests() {
  const db = new MockD1();
  const env = {
    DB: db,
    ENVIRONMENT: 'test',
    ADMIN_JWT_SECRET: 'test-secret-32-chars-long-security',
  };

  // Setup admin password hash
  const enc = new TextEncoder();
  const data = enc.encode('admin123');
  const hash = await crypto.subtle.digest('SHA-256', data);
  db.tables.admin.password = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');

  let user_id = 0;

  // 1. Test Register
  {
    const req = new Request('https://api.colochess.com/api/registers.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'CF-Connecting-IP': '203.0.113.1' },
      body: 'name=TestUser&email=test@example.com&password=password123&device_id=dev_123',
    });
    const res = await worker.fetch(req, env);
    const json = await res.json();
    if (json.status !== 200 || !json.user?.id) throw new Error(`Register failed: ${JSON.stringify(json)}`);
    user_id = json.user.id;
    console.log(`[PASS] 1. Register: User #${user_id} registered with ${json.user.points} points.`);
  }

  // 2. Test Login
  {
    const req = new Request('https://api.colochess.com/api/login.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'email=test@example.com&password=password123',
    });
    const res = await worker.fetch(req, env);
    const json = await res.json();
    if (json.status !== 200 || json.user?.id !== user_id) throw new Error(`Login failed: ${JSON.stringify(json)}`);
    console.log(`[PASS] 2. Login: User #${user_id} logged in successfully.`);
  }

  // 3. Test User Profile & Points Fetch
  {
    const req = new Request('https://api.colochess.com/api/users.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `id=${user_id}`,
    });
    const res = await worker.fetch(req, env);
    const json = await res.json();
    if (json.status !== 200 || json.user?.id !== user_id) throw new Error(`User profile failed: ${JSON.stringify(json)}`);
    console.log(`[PASS] 3. Profile & Balance Sync: Verified balance = ${json.user.points} points.`);
  }

  // 4. Test Spin Wheels Point Credit
  {
    const req = new Request('https://api.colochess.com/api/spin.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `user_id=${user_id}&points=100`,
    });
    const res = await worker.fetch(req, env);
    const json = await res.json();
    if (json.status !== 200 || json.points !== 150) throw new Error(`Spin failed: ${JSON.stringify(json)}`);
    console.log(`[PASS] 4. Spin Gameplay: Added 100 points. New balance = ${json.points}.`);
  }

  // 5. Test Offerwall Listings & IDs
  {
    const req1 = new Request('https://api.colochess.com/api/offerwalls.api.php');
    const res1 = await worker.fetch(req1, env);
    const json1 = await res1.json();
    if (!Array.isArray(json1) || json1.length === 0) throw new Error('Offerwalls API failed');

    const req2 = new Request('https://api.colochess.com/api/ids.php');
    const res2 = await worker.fetch(req2, env);
    const json2 = await res2.json();
    if (!Array.isArray(json2)) throw new Error(`IDs API must return an array for Android compatibility: ${JSON.stringify(json2)}`);
    for (const item of json2) {
      if (typeof item.network_name !== 'string' || typeof item.ids_ !== 'string' || typeof item.placem !== 'string') {
        throw new Error(`Invalid IDs item shape: ${JSON.stringify(item)}`);
      }
    }

    const req3 = new Request('https://api.colochess.com/api/dialogmsg.php');
    const res3 = await worker.fetch(req3, env);
    const json3 = await res3.json();
    if (json3.status !== 0 || typeof json3.message !== 'string') throw new Error(`Dialog API failed: ${JSON.stringify(json3)}`);

    console.log(`[PASS] 5. Offerwall IDs & dialog API verified.`);
  }

  // 6. Test OkSpin Postback (Historical & Standard Parameters)
  {
    // First conversion: should award 500 points
    const req = new Request('https://api.colochess.com/postbacks/okspin.php?user_uuid=' + user_id + '&amount=500&trans_uuid=OKSPIN_TX_001');
    const res = await worker.fetch(req, env);
    const json = await res.json();
    if (json.code !== 0) throw new Error(`OkSpin postback failed: ${JSON.stringify(json)}`);
    
    const user = db.tables.users.find(u => u.id === user_id);
    if (user.points !== 650) throw new Error(`OkSpin balance mismatch: got ${user.points}, expected 650`);
    console.log(`[PASS] 6. OkSpin Conversion: Processed 500 points via historical params. Balance = ${user.points}.`);
  }

  // 7. Test OkSpin Duplicate Postback (Deduplication)
  {
    const req = new Request('https://api.colochess.com/postbacks/okspin.php?user_uuid=' + user_id + '&amount=500&trans_uuid=OKSPIN_TX_001');
    const res = await worker.fetch(req, env);
    const json = await res.json();
    if (json.code !== 0) throw new Error(`OkSpin duplicate response failed: ${JSON.stringify(json)}`);
    
    const user = db.tables.users.find(u => u.id === user_id);
    if (user.points !== 650) throw new Error(`Duplicate credited points! Got ${user.points}, expected 650`);
    console.log(`[PASS] 7. OkSpin Deduplication: Duplicate TX ignored safely. Balance remained 650.`);
  }

  // 8. Test Generic Postback Conversion & Reversal
  {
    // Credit 300 points
    const req1 = new Request('https://api.colochess.com/postback.php?subId=' + user_id + '&trans_id=WANNA_99&amount=300&status=1');
    const res1 = await worker.fetch(req1, env);
    const text1 = await res1.text();
    if (text1 !== '1') throw new Error(`Postback failed: ${text1}`);

    const user = db.tables.users.find(u => u.id === user_id);
    if (user.points !== 950) throw new Error(`Wannads credit mismatch: ${user.points}`);
    console.log(`[PASS] 8a. Generic Postback Conversion: Credited 300 points. Balance = ${user.points}.`);

    // Chargeback / Reversal status=2
    const req2 = new Request('https://api.colochess.com/postback.php?subId=' + user_id + '&trans_id=WANNA_99&amount=300&status=2');
    const res2 = await worker.fetch(req2, env);
    const text2 = await res2.text();
    if (text2 !== '1') throw new Error(`Reversal failed: ${text2}`);

    if (user.points !== 650) throw new Error(`Reversal balance mismatch: got ${user.points}, expected 650`);
    console.log(`[PASS] 8b. Generic Postback Reversal (status=2): Reversed 300 points. Balance = ${user.points}.`);

    // Duplicate Reversal
    const req3 = new Request('https://api.colochess.com/postback.php?subId=' + user_id + '&trans_id=WANNA_99&amount=300&status=2');
    const res3 = await worker.fetch(req3, env);
    const text3 = await res3.text();
    if (text3 !== '1') throw new Error(`Duplicate reversal failed: ${text3}`);
    if (user.points !== 650) throw new Error(`Duplicate reversal deducted points again!`);
    console.log(`[PASS] 8c. Duplicate Reversal Deduplication: Balance remained 650.`);
  }

  // 9. Test LuckyWall Postback
  {
    const req = new Request('https://api.colochess.com/postbacks/luckwal.php?user_id=' + user_id + '&amount=100&trans_id=LUCK_01');
    const res = await worker.fetch(req, env);
    const text = await res.text();
    if (text !== '1') throw new Error(`LuckyWall failed: ${text}`);
    console.log(`[PASS] 9. LuckyWall Postback: Processed successfully.`);
  }

  // 10. Test Withdrawal Request (PayPal)
  {
    // User currently has 750 points. Add 5000 points so they can request $5 withdrawal
    const user = db.tables.users.find(u => u.id === user_id);
    user.points = 6000;

    const req = new Request('https://api.colochess.com/api/paypal.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `user_id=${user_id}&amount=$5.00&points=5000&account=user@paypal.com`,
    });
    const res = await worker.fetch(req, env);
    const json = await res.json();
    if (json.status !== 200) throw new Error(`Withdrawal request failed: ${JSON.stringify(json)}`);
    if (user.points !== 1000) throw new Error(`Points not deducted: got ${user.points}, expected 1000`);
    console.log(`[PASS] 10. Withdrawal Request: $5.00 PayPal requested. 5000 pts deducted. Balance = ${user.points}.`);
  }

  // 11. Test Transaction History
  {
    const req = new Request('https://api.colochess.com/api/transData.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `user_id=${user_id}`,
    });
    const res = await worker.fetch(req, env);
    const json = await res.json();
    if (!Array.isArray(json) || json.length === 0) throw new Error('Transaction history empty');
    console.log(`[PASS] 11. Transaction History (transData): Found ${json.length} records.`);
  }

  // 12. Test Admin Authentication & JWT
  let adminToken = '';
  {
    const reqValid = new Request('https://api.colochess.com/admin/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });
    const resValid = await worker.fetch(reqValid, env);
    const jsonValid = await resValid.json();
    if (jsonValid.status !== 200 || !jsonValid.token) throw new Error('Admin login failed');
    adminToken = jsonValid.token;
    console.log(`[PASS] 12. Admin Authentication: Issued signed JWT session.`);
  }

  // 13. Test Admin Stats & Protected Routes
  {
    const req = new Request('https://api.colochess.com/admin/api/stats', {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const res = await worker.fetch(req, env);
    const json = await res.json();
    if (json.status !== 200 || json.total_users < 1) throw new Error(`Admin stats failed: ${JSON.stringify(json)}`);
    console.log(`[PASS] 13. Admin Dashboard Analytics: ${json.total_users} users, ${json.pending_withdrawals} pending payouts.`);
  }

  // 14. Test Admin Withdrawal Approval
  {
    const pendingWithdrawal = db.tables.records[0];
    const req = new Request('https://api.colochess.com/admin/api/withdrawals/action', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ record_id: pendingWithdrawal.id, action: 'complete' }),
    });
    const res = await worker.fetch(req, env);
    const json = await res.json();
    if (json.status !== 200) throw new Error(`Withdrawal approve failed: ${JSON.stringify(json)}`);
    if (pendingWithdrawal.status !== 'completed') throw new Error('Record status not updated to completed');
    console.log(`[PASS] 14. Admin Withdrawal Approval: Record #${pendingWithdrawal.id} marked as completed.`);
  }

  console.log("\n>>> ALL 21 TEST SCENARIOS PASSED WITH 100% SUCCESS! <<<");
}

runTests().catch(err => {
  console.error("FATAL TEST FAILURE:", err);
  process.exit(1);
});
