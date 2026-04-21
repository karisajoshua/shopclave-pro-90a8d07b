import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";

interface OpenDisputeDialogProps {
  orderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpened?: () => void;
}

export const OpenDisputeDialog = ({ orderId, open, onOpenChange, onOpened }: OpenDisputeDialogProps) => {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleOpen = async () => {
    if (!reason.trim() || reason.trim().length < 10) {
      toast.error("Please describe the issue (at least 10 characters)");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("open_dispute", { _order_id: orderId, _reason: reason.trim() });
      if (error) throw error;
      toast.success("Dispute opened. Chat is now locked for evidence.");
      setReason("");
      onOpenChange(false);
      onOpened?.();
    } catch (e: any) {
      toast.error(e.message || "Failed to open dispute");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Open a Dispute
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Once opened, chat for this order will be locked. Messages, attachments, and history will be preserved as evidence for our review team.
          </p>
          <Textarea
            placeholder="Describe what went wrong (min. 10 characters)…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={5}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleOpen} disabled={submitting}>
            {submitting ? "Opening…" : "Open Dispute"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
