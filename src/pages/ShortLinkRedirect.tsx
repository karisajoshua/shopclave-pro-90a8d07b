import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const ShortLinkRedirect = () => {
  const { code } = useParams<{ code: string }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!code) {
        setError("Invalid link.");
        return;
      }
      const { data, error } = await supabase
        .from("short_links" as any)
        .select("target_url")
        .eq("code", code)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        setError("This link does not exist or has expired.");
        return;
      }

      // Best-effort click increment (non-blocking)
      supabase.rpc("increment_short_link_click" as any, { _code: code }).then(() => {});

      window.location.replace((data as any).target_url);
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center">
        {error ? (
          <>
            <h1 className="text-2xl font-bold mb-2">Link not found</h1>
            <p className="text-muted-foreground">{error}</p>
            <a href="/" className="inline-block mt-4 text-primary underline">Go home</a>
          </>
        ) : (
          <p className="text-muted-foreground">Redirecting…</p>
        )}
      </div>
    </div>
  );
};

export default ShortLinkRedirect;
