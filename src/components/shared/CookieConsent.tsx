import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Shield } from "lucide-react";
import { Link } from "react-router-dom";

const CONSENT_KEY = "cookie_consent";

interface ConsentChoices {
  essential: boolean;
  analytics: boolean;
  preferences: boolean;
  marketing: boolean;
  timestamp: string;
}

const getSessionId = () => {
  let sid = sessionStorage.getItem("cc_session_id");
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem("cc_session_id", sid);
  }
  return sid;
};

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [choices, setChoices] = useState<ConsentChoices>({
    essential: true,
    analytics: false,
    preferences: false,
    marketing: false,
    timestamp: "",
  });

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const saveConsent = async (c: ConsentChoices) => {
    const withTs = { ...c, timestamp: new Date().toISOString() };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(withTs));
    setVisible(false);
    setShowPrefs(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("cookie_consents").insert({
        user_id: user?.id || null,
        session_id: getSessionId(),
        essential: c.essential,
        analytics: c.analytics,
        preferences: c.preferences,
        marketing: c.marketing,
      } as any);
    } catch {}
  };

  const acceptAll = () => saveConsent({ essential: true, analytics: true, preferences: true, marketing: true, timestamp: "" });
  const rejectNonEssential = () => saveConsent({ essential: true, analytics: false, preferences: false, marketing: false, timestamp: "" });
  const savePreferences = () => saveConsent(choices);

  if (!visible) return null;

  return (
    <>
      <div className="fixed bottom-16 md:bottom-0 inset-x-0 z-[100] p-2 md:p-6">
        <div className="max-w-4xl mx-auto bg-card border border-border rounded-xl shadow-2xl p-3 md:p-6">
          <div className="flex items-start gap-2 md:gap-3 mb-2 md:mb-4">
            <Shield className="h-4 w-4 md:h-6 md:w-6 text-primary shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm md:text-base text-foreground mb-0.5 md:mb-1">We value your privacy</h3>
              <p className="text-xs md:text-sm text-muted-foreground leading-snug md:leading-relaxed line-clamp-3 md:line-clamp-none">
                We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic.
                By clicking "Accept All", you consent to our use of cookies.{" "}
                <Link to="/cookie-policy" className="text-primary hover:underline">Cookie Policy</Link>
              </p>
            </div>
          </div>
          <div className="flex flex-row gap-2 justify-end">
            <Button variant="outline" size="sm" className="text-xs px-2 md:px-3" onClick={() => setShowPrefs(true)}>
              Preferences
            </Button>
            <Button variant="outline" size="sm" className="text-xs px-2 md:px-3" onClick={rejectNonEssential}>
              Reject
            </Button>
            <Button size="sm" className="text-xs px-2 md:px-3" onClick={acceptAll}>
              Accept All
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showPrefs} onOpenChange={setShowPrefs}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cookie Preferences</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {[
              { key: "essential" as const, label: "Essential", desc: "Required for the site to function. Cannot be disabled.", disabled: true },
              { key: "analytics" as const, label: "Analytics", desc: "Help us understand how visitors interact with the site.", disabled: false },
              { key: "preferences" as const, label: "Preferences", desc: "Remember your settings and personalization choices.", disabled: false },
              { key: "marketing" as const, label: "Marketing", desc: "Used to deliver relevant ads and track campaigns.", disabled: false },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch
                  checked={choices[item.key]}
                  disabled={item.disabled}
                  onCheckedChange={(v) => setChoices((p) => ({ ...p, [item.key]: v }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPrefs(false)}>Cancel</Button>
            <Button onClick={savePreferences}>Save Preferences</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CookieConsent;
