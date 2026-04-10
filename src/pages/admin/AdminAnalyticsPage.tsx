import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Cookie, Users, ShoppingBag } from "lucide-react";

const AdminAnalyticsPage = () => {
  const { data: consents = [] } = useQuery({
    queryKey: ["cookie-consents"],
    queryFn: async () => {
      const { data } = await supabase
        .from("cookie_consents")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      return (data || []) as any[];
    },
  });

  const { data: userCount = 0 } = useQuery({
    queryKey: ["admin-user-count"],
    queryFn: async () => {
      const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: orderCount = 0 } = useQuery({
    queryKey: ["admin-order-count"],
    queryFn: async () => {
      const { count } = await supabase.from("orders").select("id", { count: "exact", head: true });
      return count || 0;
    },
  });

  const total = consents.length;
  const analyticsRate = total ? Math.round((consents.filter((c: any) => c.analytics).length / total) * 100) : 0;
  const marketingRate = total ? Math.round((consents.filter((c: any) => c.marketing).length / total) * 100) : 0;
  const prefsRate = total ? Math.round((consents.filter((c: any) => c.preferences).length / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <BarChart3 className="h-6 w-6" /> Analytics & Tracking
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4" /> Total Users</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{userCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><ShoppingBag className="h-4 w-4" /> Total Orders</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{orderCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Cookie className="h-4 w-4" /> Cookie Consents</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{total}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Analytics Acceptance</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{analyticsRate}%</p></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Analytics Cookies", rate: analyticsRate },
          { label: "Marketing Cookies", rate: marketingRate },
          { label: "Preference Cookies", rate: prefsRate },
        ].map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{item.label}</CardTitle></CardHeader>
            <CardContent>
              <div className="w-full bg-secondary rounded-full h-3">
                <div className="bg-primary h-3 rounded-full transition-all" style={{ width: `${item.rate}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{item.rate}% acceptance rate</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Recent Cookie Consent Records</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Essential</TableHead>
                  <TableHead>Analytics</TableHead>
                  <TableHead>Preferences</TableHead>
                  <TableHead>Marketing</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consents.slice(0, 20).map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs">{new Date(c.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-xs font-mono truncate max-w-[120px]">{c.session_id}</TableCell>
                    <TableCell><Badge variant={c.essential ? "default" : "outline"} className="text-xs">{c.essential ? "Yes" : "No"}</Badge></TableCell>
                    <TableCell><Badge variant={c.analytics ? "default" : "outline"} className="text-xs">{c.analytics ? "Yes" : "No"}</Badge></TableCell>
                    <TableCell><Badge variant={c.preferences ? "default" : "outline"} className="text-xs">{c.preferences ? "Yes" : "No"}</Badge></TableCell>
                    <TableCell><Badge variant={c.marketing ? "default" : "outline"} className="text-xs">{c.marketing ? "Yes" : "No"}</Badge></TableCell>
                  </TableRow>
                ))}
                {consents.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No consent records yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAnalyticsPage;
