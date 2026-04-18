import { supabase } from "@/integrations/supabase/client";

const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function generateCode(length = 8): string {
  let out = "";
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  for (let i = 0; i < length; i++) {
    out += ALPHABET[arr[i] % ALPHABET.length];
  }
  return out;
}

/**
 * Returns a short link URL like https://barakaz.com/s/abc123 for the given target URL.
 * Reuses an existing row if the current user already shortened this URL.
 */
export async function getOrCreateShortLink(targetUrl: string): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("You must be signed in to create short links.");

  // Try to reuse
  const { data: existing } = await supabase
    .from("short_links" as any)
    .select("code")
    .eq("target_url", targetUrl)
    .eq("created_by", userId)
    .maybeSingle();

  let code: string | undefined = (existing as any)?.code;

  if (!code) {
    // Insert new with up to 5 retries on collision
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateCode(8);
      const { data, error } = await supabase
        .from("short_links" as any)
        .insert({ code: candidate, target_url: targetUrl, created_by: userId })
        .select("code")
        .single();
      if (!error && data) {
        code = (data as any).code;
        break;
      }
      // 23505 = unique violation
      if (error && (error as any).code !== "23505") {
        throw error;
      }
    }
    if (!code) throw new Error("Could not generate a unique short code.");
  }

  return `${window.location.origin}/s/${code}`;
}
