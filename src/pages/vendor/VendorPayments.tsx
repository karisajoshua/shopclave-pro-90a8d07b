import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const COUNTRIES = [
  { value: "nigeria", label: "Nigeria (NGN)" },
  { value: "ghana", label: "Ghana (GHS)" },
  { value: "south africa", label: "South Africa (ZAR)" },
  { value: "kenya", label: "Kenya (KES)" },
  { value: "egypt", label: "Egypt (EGP)" },
  { value: "cote d'ivoire", label: "Côte d'Ivoire (XOF)" },
];

interface Bank {
  name: string;
  code: string;
}

const VendorPayments = () => {
  const { vendor } = useOutletContext<{ vendor: any }>();
  const queryClient = useQueryClient();

  const [country, setCountry] = useState("nigeria");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [banks, setBanks] = useState<Bank[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  const { data: account, isLoading } = useQuery({
    queryKey: ["vendor-paystack-account", vendor?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("vendor_paystack_accounts")
        .select("*")
        .eq("vendor_id", vendor.id)
        .maybeSingle();
      return data;
    },
    enabled: !!vendor?.id,
  });

  useEffect(() => {
    if (account?.country) setCountry(account.country);
  }, [account?.country]);

  // Load the bank list for the selected country
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setBanksLoading(true);
      setBanks([]);
      try {
        const { data, error } = await supabase.functions.invoke("paystack-banks", {
          body: { country },
        });
        if (cancelled) return;
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        setBanks(data?.banks || []);
      } catch (e: any) {
        if (!cancelled) toast.error(e.message || "Could not load bank list");
      } finally {
        if (!cancelled) setBanksLoading(false);
      }
    };
    if (!account || editing) load();
    return () => {
      cancelled = true;
    };
  }, [country, account, editing]);

  const handleSave = async () => {
    if (!bankCode || !accountNumber) {
      toast.error("Select your bank and enter your account number");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("paystack-subaccount", {
        body: {
          bank_code: bankCode,
          account_number: accountNumber.trim(),
          country,
          business_name: vendor?.store_name || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Payout account verified: ${data?.account_name || "saved"}`);
      setEditing(false);
      setAccountNumber("");
      setBankCode("");
      queryClient.invalidateQueries({ queryKey: ["vendor-paystack-account", vendor?.id] });
    } catch (e: any) {
      toast.error(e.message || "Could not save payout details");
    } finally {
      setBusy(false);
    }
  };

  const connected = !!account?.subaccount_code;
  const showForm = !connected || editing;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Payments</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add your bank account so online payments are split to you automatically. Barakaz deducts
          its commission from each order before your share is settled.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Paystack payouts</CardTitle>
                <CardDescription>Receive your share directly to your bank</CardDescription>
              </div>
            </div>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : connected ? (
              <Badge className="bg-success/15 text-success border-success/30">
                <ShieldCheck className="h-3 w-3 mr-1" /> Active
              </Badge>
            ) : (
              <Badge variant="outline">Not connected</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {connected && !editing && (
            <>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-md border">
                  <div className="text-xs text-muted-foreground">Bank</div>
                  <div className="font-medium">{account?.bank_name || account?.bank_code}</div>
                </div>
                <div className="p-3 rounded-md border">
                  <div className="text-xs text-muted-foreground">Account</div>
                  <div className="font-medium">•••• {account?.account_number_last4}</div>
                </div>
                <div className="p-3 rounded-md border">
                  <div className="text-xs text-muted-foreground">Account name</div>
                  <div className="font-medium">{account?.account_name || "—"}</div>
                </div>
                <div className="p-3 rounded-md border">
                  <div className="text-xs text-muted-foreground">Settlement currency</div>
                  <div className="font-medium uppercase">{account?.currency}</div>
                </div>
              </div>
              <Button variant="outline" onClick={() => setEditing(true)}>
                Update bank details
              </Button>
            </>
          )}

          {showForm && (
            <>
              {!connected && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Until you add payout details, Barakaz holds your share of each online payment
                    and releases it through a withdrawal request.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Bank country</Label>
                  <Select value={country} onValueChange={(v) => { setCountry(v); setBankCode(""); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Bank</Label>
                  <Select value={bankCode} onValueChange={setBankCode} disabled={banksLoading || banks.length === 0}>
                    <SelectTrigger>
                      <SelectValue placeholder={banksLoading ? "Loading banks..." : "Select your bank"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {banks.map((b) => (
                        <SelectItem key={b.code} value={b.code}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label>Account number</Label>
                  <Input
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="0123456789"
                    inputMode="numeric"
                  />
                  <p className="text-xs text-muted-foreground">
                    We verify the account with your bank before saving — the account holder name
                    must match your business records.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                  {connected ? "Update payout account" : "Save payout account"}
                </Button>
                {editing && (
                  <Button variant="ghost" onClick={() => setEditing(false)} disabled={busy}>
                    Cancel
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How payouts work</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            When a buyer pays online, Paystack splits the payment at the moment of the charge: your
            share goes to your connected bank account, and Barakaz keeps the platform commission
            (based on the product's category) plus a small processing fee.
          </p>
          <p>
            Paystack settles to your bank on its standard schedule — typically the next working day
            for local accounts.
          </p>
          <p>
            M-Pesa, bank transfer and cash on delivery remain available to buyers and are settled
            directly between buyer and vendor — those don't pass through Paystack.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorPayments;
