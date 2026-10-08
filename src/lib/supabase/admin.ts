import "server-only";

import { createClient } from "@supabase/supabase-js";

export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error("Supabase Storage server configuration is missing.");
  }
  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getLungRecordingsBucket() {
  const bucket = process.env.LUNG_RECORDINGS_BUCKET;
  if (!bucket) throw new Error("Lung recordings bucket is not configured.");
  return bucket;
}
