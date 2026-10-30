/**
 * تعاریف بایندینگ‌ها و تایپ‌های سرورلس Cloudflare Worker در Hono
 */

export type Bindings = {
  DB: D1Database;
  KV: KVNamespace;
  ENVIRONMENT?: string;
};

export type Variables = {
  userId?: string;
  user?: {
    id: string;
    name: string;
    syncToken: string;
  };
};

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
