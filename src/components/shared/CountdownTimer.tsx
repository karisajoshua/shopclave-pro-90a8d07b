import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  endsAt: string;
  variant?: "badge" | "banner";
}

const CountdownTimer = ({ endsAt, variant = "banner" }: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0, expired: false });

  useEffect(() => {
    const calc = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0, expired: true };
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      return { d, h, m, s, expired: false };
    };

    setTimeLeft(calc());
    const interval = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  if (timeLeft.expired) return null;

  if (variant === "badge") {
    const parts = [];
    if (timeLeft.d > 0) parts.push(`${timeLeft.d}d`);
    parts.push(`${timeLeft.h}h`);
    parts.push(`${timeLeft.m}m`);
    return (
      <span className="inline-flex items-center gap-1 bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded">
        <Clock className="h-2.5 w-2.5" />
        {parts.join(" ")}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
      <Clock className="h-4 w-4 text-destructive shrink-0" />
      <span className="text-sm font-semibold text-destructive">Deal ends in:</span>
      <div className="flex gap-1.5">
        {timeLeft.d > 0 && (
          <span className="bg-destructive text-destructive-foreground text-xs font-bold px-1.5 py-0.5 rounded">{timeLeft.d}d</span>
        )}
        <span className="bg-destructive text-destructive-foreground text-xs font-bold px-1.5 py-0.5 rounded">{String(timeLeft.h).padStart(2, '0')}h</span>
        <span className="bg-destructive text-destructive-foreground text-xs font-bold px-1.5 py-0.5 rounded">{String(timeLeft.m).padStart(2, '0')}m</span>
        <span className="bg-destructive text-destructive-foreground text-xs font-bold px-1.5 py-0.5 rounded">{String(timeLeft.s).padStart(2, '0')}s</span>
      </div>
    </div>
  );
};

export default CountdownTimer;
