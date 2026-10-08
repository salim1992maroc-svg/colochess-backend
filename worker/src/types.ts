export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  ENVIRONMENT?: string;
  ADMIN_JWT_SECRET?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  ONESIGNAL_APP_ID?: string;
  ONESIGNAL_REST_KEY?: string;
}

export interface UserRow {
  id: number;
  name: string;
  email: string;
  password: string;
  points: number;
  device_id: string;
  referral_code: string;
  referred_by: string;
  status: number;
  ip_address: string;
  created_at: string;
}

export interface RecordRow {
  id: number;
  user_id: number;
  amount: string;
  points: number;
  payment_method: string;
  account: string;
  status: string;
  created_at: string;
}

export interface OfferTransactionRow {
  id: number;
  user_id: number;
  offer_name: string;
  points: number;
  trans_id: string;
  date: string;
}
