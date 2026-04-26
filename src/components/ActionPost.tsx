import { MapPin, Clock, Users, HeartHandshake, Share2, Bookmark, BookmarkCheck, Flame, MoreHorizontal, MessageCircle, EyeOff, Copy, CheckCircle2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import type { CrisisAction } from "@/lib/mock-data";
import { helpTypeLabels, urgencyLabels } from "@/lib/mock-data";
import { useState } from "react";

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
export function ActionPost({ action, onHide }: { action: CrisisAction; onHide?: (id: string) => void }) {
  const filled = (action.volunteersJoined / action.volunteersNeeded) * 100;
  const [saved, setSaved] = useState(false);
  const [questionOpen, setQuestionOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [questionSent, setQuestionSent] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/volunteer/action/${action.id}`;

  function handleSendQuestion() {
    if (!question.trim()) return;
    setQuestionSent(true);
    setTimeout(() => {
      setQuestionSent(false);
      setQuestion("");
      setQuestionOpen(false);
    }, 1500);
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <>
      {/* Dialog: Pergunta */}
      <Dialog open={questionOpen} onOpenChange={setQuestionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Fazer uma pergunta</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl bg-muted p-3 text-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-hero text-xs font-bold text-primary-foreground shrink-0">
                {action.orgAvatar}
              </div>
              <div className="min-w-0">
                <p className="font-semibold truncate">{action.org}</p>
                <p className="text-xs text-muted-foreground truncate">{action.title}</p>
              </div>
            </div>
            <Textarea
              placeholder="Ex: Preciso levar algum equipamento específico?"
              className="resize-none"
              rows={4}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuestionOpen(false)}>Cancelar</Button>
            {questionSent ? (
              <Button className="bg-gradient-hero" disabled>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Enviada!
              </Button>
            ) : (
              <Button className="bg-gradient-hero" onClick={handleSendQuestion} disabled={!question.trim()}>
                Enviar pergunta
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Compartilhar */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Compartilhar ação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-muted p-3 text-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-hero text-xs font-bold text-primary-foreground shrink-0">
                {action.orgAvatar}
              </div>
              <div className="min-w-0">
                <p className="font-semibold truncate">{action.title}</p>
                <p className="text-xs text-muted-foreground">{action.org} · {action.location}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              <span className="flex-1 truncate">{shareUrl}</span>
              <button
                onClick={handleCopyLink}
                className="shrink-0 rounded p-1 hover:bg-muted transition"
                aria-label="Copiar link"
              >
                {copied ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground text-center">Compartilhe o link acima com amigos ou redes sociais.</p>
          </div>
          <DialogFooter>
            <Button className="w-full bg-gradient-hero" onClick={handleCopyLink}>
              {copied ? <><CheckCircle2 className="mr-2 h-4 w-4" /> Link copiado!</> : <><Copy className="mr-2 h-4 w-4" /> Copiar link</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <article className={cn(
      "bg-card shadow-soft transition-all hover:shadow-elegant",
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
            <MapPin className="h-3 w-3" />
            <span className="truncate">{action.location}</span>
            <span>·</span>
            <span>{action.distanceKm > 0 ? `${action.distanceKm} km` : "—"}</span>
          </div>
        </div>
        <span className={cn("hidden sm:inline-flex items-center gap-1 rounded-full bg-ai/10 px-2 py-0.5 text-[11px] text-white", urgencyDot[action.urgency])}>
          {urgencyLabels[action.urgency]}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-lg p-1.5 hover:bg-muted transition" aria-label="Mais opções">
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              className="text-muted-foreground gap-2 cursor-pointer"
              onClick={() => onHide?.(action.id)}
            >
              <EyeOff className="h-4 w-4" /> Ocultar ação
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Body */}
      <div className="px-5 pt-3">
        <h3 className="text-base font-bold leading-snug flex items-center gap-2">
          {action.urgency === "high" && <Flame className="h-4 w-4 text-primary shrink-0" />}
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
      <div className="mx-5 mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-muted/50 px-4 py-2.5 text-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{action.effort}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span><strong>{action.volunteersJoined}</strong>/{action.volunteersNeeded} vagas</span>
        </div>
      </div>

      {/* Action bar */}
      <footer className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 px-3 py-2">
        <div className="flex">
          <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5">
            <Link className="flex gap-1.5" to="/volunteer/action/$actionId" params={{ actionId: action.id }}>
              <HeartHandshake className="h-4 w-4" /> Quero Ajudar
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground gap-1.5"
            onClick={() => setQuestionOpen(true)}
          >
            <MessageCircle className="h-4 w-4" /> Pergunta
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground gap-1.5"
            onClick={() => setShareOpen(true)}
          >
            <Share2 className="h-4 w-4" /> Compartilhar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn("gap-1.5 transition-colors", saved ? "text-primary" : "text-muted-foreground")}
            onClick={() => setSaved((v) => !v)}
            aria-label={saved ? "Remover dos salvos" : "Salvar"}
          >
            {saved ? <BookmarkCheck className="h-4 w-4 fill-primary text-primary" /> : <Bookmark className="h-4 w-4" />}
          </Button>
        </div>
      </footer>
    </article>
    </>
  );
}
