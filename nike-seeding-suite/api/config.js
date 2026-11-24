// Exposes the public Supabase settings to the browser.
// The anon/publishable key is safe to expose: access is controlled by Row Level Security (see supabase/schema.sql).
export default function handler(req, res) {
  const env = process.env;
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    supabaseUrl: env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "",
    supabaseAnonKey:
      env.SUPABASE_ANON_KEY ||
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      env.SUPABASE_PUBLISHABLE_KEY ||
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      "",
  });
}
