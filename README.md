# Colochess - Cloudflare Serverless Architecture & Migration

This repository contains the complete source code for **Colochess** migrated to a serverless, zero-cost-hosting architecture powered by **Cloudflare Workers** and **Cloudflare D1**.

## Architecture Overview

```
colochess/
├── worker/                    # Cloudflare Worker REST API & Postback Router
│   ├── src/
│   │   ├── modules/          # Modular API handlers (auth, users, points, offers, postbacks, admin)
│   │   ├── services/         # Email (Resend/MailChannels) & OneSignal Push
│   │   ├── utils/            # Helpers, WebCrypto hashing, CF-Connecting-IP
│   │   ├── types.ts          # TypeScript interfaces
│   │   └── index.ts          # Master route dispatcher
│   ├── package.json
│   └── tsconfig.json
│
├── database/
│   └── migrations/           # Versioned Cloudflare D1 SQLite migrations
│       ├── 0001_initial_schema.sql
│       └── 0002_seed_data.sql
│
├── admin/                     # Admin Dashboard Frontend (Cloudflare Pages compatible)
│   ├── index.html            # Admin login
│   ├── dashboard.html        # Analytics & Stats overview
│   ├── users.html            # User balance & ban management
│   ├── withdrawals.html      # Cashout approval / refusal workflow
│   ├── settings.html         # Anti-fraud toggles & OneSignal broadcast
│   └── app.js                # Client controller (stateless signed JWT)
│
├── source/
│   └── colochese/            # Native Android Client (Java, Gradle)
│       └── app/src/main/java/com/ctrange/colochess/tools/Constant.java
│
├── wrangler.toml              # Cloudflare Worker & D1 Binding config
├── .env.example               # Template environment variables
└── .gitignore                 # Security rules preventing secret leaks
```

---

## Deployment & Setup Guide

### 1. Cloudflare D1 Database Provisioning

Install wrangler if not already installed, then create your D1 database:

```bash
# Log in to Cloudflare
npx wrangler login

# Create the D1 database
npx wrangler d1 create colochess-db
```

Wrangler will output your `database_id`. Copy it into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "colochess-db"
database_id = "YOUR_D1_DATABASE_ID"
```

Apply the database migrations:

```bash
# Local testing
npx wrangler d1 execute colochess-db --local --file=./database/migrations/0001_initial_schema.sql
npx wrangler d1 execute colochess-db --local --file=./database/migrations/0002_seed_data.sql

# Production deployment
npx wrangler d1 execute colochess-db --remote --file=./database/migrations/0001_initial_schema.sql
npx wrangler d1 execute colochess-db --remote --file=./database/migrations/0002_seed_data.sql
```

---

### 2. Cloudflare Worker Deployment

```bash
# Deploy the Worker
npx wrangler deploy
```

Upon deployment, Cloudflare gives you a free HTTPS URL:
`https://colochess-backend.<your-subdomain>.workers.dev`

---

### 3. Admin Panel Deployment (Cloudflare Pages)

The `admin/` folder contains pure HTML/CSS/JS that communicates directly with your Worker API. You can deploy it for free using Cloudflare Pages:

1. In the Cloudflare Dashboard, go to **Workers & Pages** → **Create application** → **Pages** → **Direct Upload**.
2. Upload the `admin/` folder (or connect your GitHub repository pointing to the `admin/` directory).
3. The dashboard will be accessible at: `https://colochess-admin.pages.dev`
4. Default credentials:
   - Username: `admin`
   - Default initial password hash in seed data: `admin123` (Change upon first login).

---

### 4. Android Configuration

Update `source/colochese/app/src/main/java/com/ctrange/colochess/tools/Constant.java`:

```java
public static final String MAIN_URL = "https://colochess-backend.<your-subdomain>.workers.dev/";
public static final String BASE_URL = MAIN_URL;
```

---

### 5. Postback URLs Configuration for Ad Networks

Configure your offerwall dashboards with the following postback URLs:

* **OkSpin:**
  ```text
  https://colochess-backend.<your-subdomain>.workers.dev/postbacks/okspin.php?user_uuid={cdid}&amount={amount}&trans_uuid={trans_id}&gaid={did}&country={country}&ip={ip}&pos={pos}
  ```
  *(Also accepts standard parameters: `userId`, `transId`, `points`)*

* **LuckyWall:**
  ```text
  https://colochess-backend.<your-subdomain>.workers.dev/postbacks/luckwal.php?user_id={user_id}&amount={amount}&trans_id={trans_id}
  ```

* **Wannads / AdGate / Notik / Monlix / BitLabs / Offerdaddy (Shared Postback):**
  ```text
  https://colochess-backend.<your-subdomain>.workers.dev/postback.php?subId={subId}&trans_id={trans_id}&amount={amount}&status={status}&offer_name={offer_name}
  ```
