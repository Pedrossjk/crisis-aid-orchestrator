import { MapPin, Clock, Users, Sparkles, Share2, ArrowRight, Flame } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CrisisAction } from "@/lib/mock-data";
import { helpTypeLabels, urgencyLabels } from "@/lib/mock-data";

const urgencyStyles = {
  high: "bg-urgent text-urgent-foreground",
  medium: "bg-warning text-warning-foreground",
  low: "bg-success text-success-foreground",
};

export function ActionCard({ action, compact = false }: { action: CrisisAction; compact?: boolean }) {
  const filledPct = (action.volunteersJoined / action.volunteersNeeded) * 100;

  return (
    <article className="group relative flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-5 shadow-soft transition-all hover:shadow-elegant hover:-translate-y-0.5">
      {action.isAiRecommended && (
        <div className="absolute -top-2 left-4 flex items-center gap-1 rounded-full bg-gradient-ai px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ai-foreground shadow-glow">
          <Sparkles className="h-2.5 w-2.5" />
          IA recomenda
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-hero text-sm font-bold text-primary-foreground">
            {action.orgAvatar}
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">{action.org}</p>
            <p className="text-xs text-muted-foreground">{action.postedAgo}</p>
          </div>
        </div>
        <Badge className={cn("border-0 text-[10px] font-bold uppercase", urgencyStyles[action.urgency])}>
          {action.urgency === "high" && <Flame className="mr-1 h-3 w-3" />}
          {urgencyLabels[action.urgency]}
        </Badge>
      </div>

      <div>
        <h3 className="text-base font-bold leading-snug">{action.title}</h3>
        {!compact && <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{action.description}</p>}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {action.helpTypes.map((t) => (
          <span key={t} className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {helpTypeLabels[t]}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          <span>{action.distanceKm} km</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          <span className="truncate">{action.effort}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          <span>{action.volunteersJoined}/{action.volunteersNeeded}</span>
        </div>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            action.urgency === "high" ? "bg-urgent" : action.urgency === "medium" ? "bg-warning" : "bg-success"
          )}
          style={{ width: `${filledPct}%` }}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button asChild className="flex-1 bg-primary hover:bg-primary/90">
          <Link to="/volunteer/action/$actionId" params={{ actionId: action.id }}>
            Quero ajudar
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
        <Button variant="outline" size="icon" aria-label="Compartilhar">
          <Share2 className="h-4 w-4" />
        </Button>
      </div>
    </article>
  );
}
