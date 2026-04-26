import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useOcoyaPosts, useDeleteOcoyaPost } from "@/hooks/useOcoya";

interface Props {
  workspaceId?: string;
}

const statusVariant = (status?: string): "default" | "secondary" | "destructive" | "outline" => {
  switch ((status || "").toLowerCase()) {
    case "published":
      return "default";
    case "scheduled":
      return "secondary";
    case "failed":
      return "destructive";
    default:
      return "outline";
  }
};

const ScheduledList = ({ workspaceId }: Props) => {
  const postsQuery = useOcoyaPosts(workspaceId);
  const deletePost = useDeleteOcoyaPost(workspaceId);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      await deletePost.mutateAsync(pendingDeleteId);
      toast.success("Post deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setPendingDeleteId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Scheduled & Drafts</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => postsQuery.refetch()}
          disabled={postsQuery.isFetching}
        >
          {postsQuery.isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {postsQuery.isLoading ? (
          <div className="flex items-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading posts…
          </div>
        ) : postsQuery.error ? (
          <p className="text-sm text-destructive">
            {(postsQuery.error as Error).message}
          </p>
        ) : !postsQuery.data || postsQuery.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No posts yet. Compose one to get started.</p>
        ) : (
          <ul className="divide-y">
            {postsQuery.data.map((p) => (
              <li key={p.id} className="py-3 flex items-start gap-3">
                {p.mediaUrls?.[0] && (
                  <img
                    src={p.mediaUrls[0]}
                    alt=""
                    className="w-14 h-14 rounded object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={statusVariant(p.status)}>{p.status || "draft"}</Badge>
                    {p.scheduledAt && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(p.scheduledAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p className="text-sm mt-1 line-clamp-2">{p.caption || <em>(no caption)</em>}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPendingDeleteId(p.id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <AlertDialog open={!!pendingDeleteId} onOpenChange={(o) => !o && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the post from Ocoya. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deletePost.isPending}>
              {deletePost.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default ScheduledList;
