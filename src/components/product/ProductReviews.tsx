import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useTranslation } from "@/contexts/TranslationContext";

interface ProductReviewsProps {
  productId: string;
}

const StarRating = ({
  rating,
  onRate,
  interactive = false,
  size = "h-4 w-4",
}: {
  rating: number;
  onRate?: (r: number) => void;
  interactive?: boolean;
  size?: string;
}) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star
        key={i}
        className={`${size} ${interactive ? "cursor-pointer" : ""} ${
          i <= rating ? "fill-warning text-warning" : "text-muted-foreground/30"
        }`}
        onClick={() => interactive && onRate?.(i)}
      />
    ))}
  </div>
);

const ProductReviews = ({ productId }: ProductReviewsProps) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState("");

  // Fetch reviews with profile info
  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews", productId],
    queryFn: async () => {
      // Fetch reviews
      const { data: reviewsData } = await supabase
        .from("reviews")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });
      
      if (!reviewsData?.length) return [];
      
      // Fetch profiles for review authors
      const userIds = [...new Set(reviewsData.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      return reviewsData.map(r => ({
        ...r,
        profile: profileMap.get(r.user_id) || null,
      }));
    },
  });

  // Check if user can review (has delivered order for this product)
  const { data: canReview } = useQuery({
    queryKey: ["can-review", productId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      // Check if already reviewed
      const { data: existing } = await supabase
        .from("reviews")
        .select("id")
        .eq("product_id", productId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing) return false;

      // Check if has delivered order
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("id, orders!inner(status, user_id)")
        .eq("product_id", productId);
      
      const hasDelivered = orderItems?.some(
        (oi: any) => oi.orders?.user_id === user.id && 
        ["delivered", "completed"].includes(oi.orders?.status)
      );
      return !!hasDelivered;
    },
    enabled: !!user,
  });

  const submitReview = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("reviews").insert({
        product_id: productId,
        user_id: user!.id,
        rating: newRating,
        comment: newComment || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Review submitted!");
      setNewRating(0);
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ["reviews", productId] });
      queryClient.invalidateQueries({ queryKey: ["can-review", productId] });
    },
    onError: () => toast.error("Failed to submit review"),
  });

  // Calculate stats
  const avgRating = reviews.length
    ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length
    : 0;
  const ratingCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r: any) => r.rating === star).length,
    pct: reviews.length ? (reviews.filter((r: any) => r.rating === star).length / reviews.length) * 100 : 0,
  }));

  return (
    <div id="reviews-section" className="border-t border-border pt-8 mt-8">
      <h2 className="font-display text-xl font-bold mb-6">Customer Reviews</h2>

      <div className="grid md:grid-cols-[280px_1fr] gap-8">
        {/* Summary */}
        <div className="space-y-4">
          <div className="text-center md:text-left">
            <div className="text-4xl font-bold">{avgRating.toFixed(1)}</div>
            <StarRating rating={Math.round(avgRating)} size="h-5 w-5" />
            <p className="text-sm text-muted-foreground mt-1">
              {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
            </p>
          </div>
          <div className="space-y-2">
            {ratingCounts.map(({ star, count, pct }) => (
              <div key={star} className="flex items-center gap-2 text-sm">
                <span className="w-12">{star} star</span>
                <Progress value={pct} className="h-2 flex-1" />
                <span className="w-8 text-right text-muted-foreground">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reviews list + form */}
        <div className="space-y-6">
          {/* Submit form */}
          {canReview && (
            <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/30">
              <h3 className="font-semibold">Write a Review</h3>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Your Rating</p>
                <StarRating rating={newRating} onRate={setNewRating} interactive size="h-6 w-6" />
              </div>
              <Textarea
                placeholder="Share your experience with this product..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
              />
              <Button
                onClick={() => submitReview.mutate()}
                disabled={newRating === 0 || submitReview.isPending}
                size="sm"
              >
                {submitReview.isPending ? "Submitting..." : "Submit Review"}
              </Button>
            </div>
          )}

          {/* Reviews list */}
          {reviews.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">No reviews yet. Be the first to review this product!</p>
          ) : (
            reviews.map((review: any) => (
              <div key={review.id} className="border-b border-border pb-4 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <StarRating rating={review.rating} />
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    Verified Purchase
                  </Badge>
                </div>
                <p className="text-sm font-medium">
                  {review.profile?.full_name || "Customer"}
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                  {new Date(review.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                {review.comment && (
                  <p className="text-sm text-foreground leading-relaxed">{review.comment}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductReviews;
