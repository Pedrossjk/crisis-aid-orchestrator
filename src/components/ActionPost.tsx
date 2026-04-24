import { MapPin, Clock, Users, Sparkles, Share2, Bookmark, Flame, MoreHorizontal, ThumbsUp, MessageCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { CrisisAction } from "@/lib/mock-data";
import { helpTypeLabels, urgencyLabels } from "@/lib/mock-data";

const urgencyAccent: Record<string, string> = {
  high: "border-l-urgent",
  medium: "border-l-warning",
  low: "border-l-success",
};

const urgencyDot: Record<string, string> = {
  high: "bg-urgent",
  medium: "bg-warning",
  low: "bg-success",
};

/**
 * Social-feed-style action post for the volunteer feed.
 * Single-column, full-width, with author + timestamp + action footer.
 */
export function ActionPost({ action }: { action: CrisisAction }) {
  const filled = (action.volunteersJoined / action.volunteersNeeded) * 100;

  return (
    <article className={cn(
      "border border-border/50 border-l-3 bg-card shadow-soft transition-all hover:shadow-elegant",
      urgencyAccent[action.urgency]
    )}>
      {/* Header: org + meta */}
      <header className="flex items-center gap-3 px-5 pt-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-hero text-sm font-bold text-primary-foreground">
          {action.orgAvatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold truncate">{action.org}</p>
            <span className="text-muted-foreground">·</span>
            <p className="text-xs text-muted-foreground truncate">{action.postedAgo}</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn("h-1.5 w-1.5 rounded-full", urgencyDot[action.urgency])} />
            <span>{urgencyLabels[action.urgency]}</span>
            <span>·</span>
            <MapPin className="h-3 w-3" />
            <span className="truncate">{action.location}</span>
            <span>·</span>
            <span>{action.distanceKm} km</span>
          </div>
        </div>
        {action.isAiRecommended && (
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-ai/10 px-2 py-0.5 text-[10px] font-bold text-ai">
            <Sparkles className="h-2.5 w-2.5" /> Para você
          </span>
        )}
        <button className="rounded-lg p-1.5 hover:bg-muted transition" aria-label="Mais opções">
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
        </button>
      </header>

      {/* Body */}
      <div className="px-5 pt-3">
        <h3 className="text-base font-bold leading-snug flex items-center gap-2">
          {action.urgency === "high" && <Flame className="h-4 w-4 text-urgent shrink-0" />}
          {action.title}
        </h3>
        <p className="mt-1.5 text-sm text-muted-foreground line-clamp-3">{action.description}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {action.helpTypes.map((t) => (
            <span key={t} className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              #{helpTypeLabels[t].toLowerCase()}
            </span>
          ))}
        </div>
      </div>

      {/* Stats strip */}
      <div className="mx-5 mt-4 flex items-center gap-4 rounded-xl bg-muted/50 px-4 py-2.5 text-xs">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{action.effort}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span><strong>{action.volunteersJoined}</strong>/{action.volunteersNeeded} voluntários</span>
        </div>
        <div className="ml-auto h-1.5 w-20 overflow-hidden rounded-full bg-background">
          <div className={cn("h-full", urgencyDot[action.urgency])} style={{ width: `${filled}%` }} />
        </div>
      </div>

      {/* Action bar */}
      <footer className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 px-3 py-2">
        <div className="flex">
          <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5">
            <ThumbsUp className="h-4 w-4" /> Apoio
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5">
            <MessageCircle className="h-4 w-4" /> Pergunta
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5">
            <Share2 className="h-4 w-4" /> Compartilhar
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5">
            <Bookmark className="h-4 w-4" />
          </Button>
        </div>
        <Button asChild size="sm" className="bg-primary hover:bg-primary/90">
          <Link to="/volunteer/action/$actionId" params={{ actionId: action.id }}>
            Quero ajudar
          </Link>
        </Button>
      </footer>
    </article>
  );
}
