import { loadEnv } from "vite";
import { createClient } from "@supabase/supabase-js";
const env = loadEnv("development", process.cwd(), "VITE_");
if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY)
  throw new Error("Supabase not configured");
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
const { error, status } = await client.from("profiles").select("id").limit(1);
console.log(
  JSON.stringify({
    status,
    schemaAvailable: !error,
    error: error ? { code: error.code, message: error.message } : null,
  }),
);
if (error) process.exitCode = 1;
