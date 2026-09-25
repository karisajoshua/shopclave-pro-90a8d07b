import { Lock } from "lucide-react";

type Stage = "order" | "payment" | "redirect" | null;

const TEXT: Record<Exclude<Stage, null>, string> = {
  order: "Preparing secure checkout…",
  payment: "Connecting to secure payment…",
  redirect: "Opening secure payment page…",
};

const CheckoutLoader = ({ stage, provider }: { stage: Stage; provider: "stripe" | "paystack" | null }) => {
  if (!stage) return null;
  const steps: Exclude<Stage, null>[] = provider ? ["order", "payment", "redirect"] : ["order"];
  const current = steps.indexOf(stage);
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-loader-title"
    >
      <div className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl border border-border bg-card p-6 shadow-lg">
        <div className="mx-auto mb-4 relative h-14 w-14">
          <span className="absolute inset-0 rounded-full border-4 border-primary/20" />
          <span className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary motion-safe:animate-spin" />
          <Lock className="absolute inset-0 m-auto h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <h2 id="checkout-loader-title" className="text-center font-semibold text-base" aria-live="polite">
          {TEXT[stage]}
        </h2>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          {provider
            ? `You'll be taken to ${provider === "stripe" ? "Stripe" : "Paystack"} to enter your card securely. Please don't close this page.`
            : "Placing your order. Please don't close this page."}
        </p>
        {steps.length > 1 && (
          <ol className="mt-4 flex justify-center gap-2" aria-hidden="true">
            {steps.map((s, i) => (
              <li
                key={s}
                className={`h-1.5 w-10 rounded-full transition-colors motion-reduce:transition-none ${
                  i <= current ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </ol>
        )}
      </div>
    </div>
  );
};

export default CheckoutLoader;
