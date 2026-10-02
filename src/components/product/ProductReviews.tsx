import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BadgeCheck, Info, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { buildRatingDistribution } from "@/lib/reviewPresentation";

interface ProductReviewsProps {
  productId: string;
  embedded?: boolean;
  showHeading?: boolean;
  displayRating?: number;
  displayReviewCount?: number;
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

const ProductReviews = ({
  productId,
  embedded = false,
  showHeading = true,
  displayRating,
  displayReviewCount,
}: ProductReviewsProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState("");

  // Fetch reviews
  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews", productId],
    queryFn: async () => {
      const { data: reviewsData } = await supabase
        .from("reviews")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });

      if (!reviewsData?.length) return [];

      // Fetch profiles via security-definer function
      const userIds = [...new Set(reviewsData.map(r => r.user_id))];
      const { data: profiles } = await supabase.rpc("get_public_profiles", {
        user_ids: userIds,
      });

      const profileMap = new Map(
        (profiles as any[] || []).map((p: any) => [p.user_id, p])
      );
      return reviewsData.map(r => ({
        ...r,
        profile: profileMap.get(r.user_id) || null,
      }));
    },
  });

  // Check if user can review
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

      // Check delivered orders: query user's orders first, then check order_items
      const { data: orders } = await supabase
        .from("orders")
        .select("id")
        .eq("user_id", user.id)
        .in("status", ["delivered", "completed"]);

      if (!orders?.length) return false;

      const orderIds = orders.map(o => o.id);
      const { data: items } = await supabase
        .from("order_items")
        .select("id")
        .eq("product_id", productId)
        .in("order_id", orderIds)
        .limit(1);

      return (items?.length ?? 0) > 0;
    },
    enabled: !!user,
  });

  const submitReview = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please sign in to submit a review");
      const { error } = await supabase.from("reviews").insert({
        product_id: productId,
        user_id: user.id,
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
      queryClient.invalidateQueries({ queryKey: ["review-stats", productId] });
      queryClient.invalidateQueries({ queryKey: ["product-ratings"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to submit review"),
  });

  const avgRating = reviews.length
    ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length
    : 0;
  const summaryRating = displayRating ?? avgRating;
  const summaryReviewCount = displayReviewCount ?? reviews.length;
  const ratingCounts = reviews.length
    ? [5, 4, 3, 2, 1].map((star) => ({
        star,
        count: reviews.filter((r: any) => r.rating === star).length,
        pct: (reviews.filter((r: any) => r.rating === star).length / reviews.length) * 100,
      }))
    : buildRatingDistribution(summaryRating, summaryReviewCount);

  return (
    <div id="reviews-section" className={embedded ? "p-4" : "border-t border-border pt-8 mt-8"}>
      {showHeading && <h2 className={`font-display font-bold mb-6 ${embedded ? "text-lg" : "text-xl"}`}>Customer Reviews</h2>}

      <div className="grid md:grid-cols-[280px_1fr] gap-8">
        {/* Summary */}
        <div className="space-y-4">
          <div className="text-center md:text-left">
            <div className="text-4xl font-bold">{summaryRating.toFixed(1)}</div>
            <StarRating rating={Math.round(summaryRating)} size="h-5 w-5" />
            <p className="text-sm text-muted-foreground mt-1">
              {summaryReviewCount} {summaryReviewCount === 1 ? "review" : "reviews"}
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

          {reviews.length === 0 && sampleReviews.length > 0 ? (
            <div className="flex items-start gap-2 border-b border-border pb-3 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>Sample reviews are shown for presentation only. No customer review has been submitted yet.</p>
            </div>
          ) : null}

          {reviews.map((review: any) => (
              <div key={review.id} className="border-b border-border pb-4 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <StarRating rating={review.rating} />
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="text-sm font-medium">{review.profile?.full_name || "Customer"}</p>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    Verified buyer
                  </span>
                </div>
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
          ))}

          {sampleReviews.map((review) => (
            <article key={review.id} className="border-b border-border pb-4 last:border-0" aria-label="Sample review">
              <StarRating rating={review.rating} />
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-foreground">{review.name}</p>
                <span className="rounded-sm border border-primary/30 bg-primary/5 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                  Sample review
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-foreground/85">{review.comment}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductReviews;
