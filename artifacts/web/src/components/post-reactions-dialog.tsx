import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useListPostReactions,
  getListPostReactionsQueryKey,
  ReactionType,
} from "@workspace/api-client-react";
import { reactionConfig } from "@/components/reaction-picker";
import { avatarSrc } from "@/lib/avatar";
import { Loader2, Users } from "lucide-react";

interface PostReactionsDialogProps {
  postId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PostReactionsDialog({
  postId,
  open,
  onOpenChange,
}: PostReactionsDialogProps) {
  const [activeFilter, setActiveFilter] = useState<"all" | ReactionType>("all");

  const { data: reactions, isLoading } = useListPostReactions(postId, {
    query: {
      enabled: open && !!postId,
      queryKey: getListPostReactionsQueryKey(postId),
    },
  });

  const allReactions = reactions ?? [];

  // Group counts by reaction type
  const countsByType = useMemo(() => {
    const map = new Map<ReactionType, number>();
    for (const r of allReactions) {
      const t = r.type as ReactionType;
      map.set(t, (map.get(t) ?? 0) + 1);
    }
    return map;
  }, [allReactions]);

  // Filtered list
  const filtered = useMemo(() => {
    if (activeFilter === "all") return allReactions;
    return allReactions.filter((r) => r.type === activeFilter);
  }, [allReactions, activeFilter]);

  // Distinct reaction types present
  const presentTypes = useMemo(() => {
    const set = new Set<ReactionType>();
    for (const r of allReactions) {
      set.add(r.type as ReactionType);
    }
    return Array.from(set);
  }, [allReactions]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-full max-h-[80vh] h-[500px] flex flex-col p-0 rounded-2xl overflow-hidden">
        <DialogHeader className="px-5 pt-4 pb-2 border-b border-border/60">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <span>People who reacted</span>
            {allReactions.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted font-normal text-muted-foreground">
                {allReactions.length}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Reaction tabs filter */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border/60 overflow-x-auto bg-muted/20">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 ${
              activeFilter === "all"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            All {allReactions.length > 0 && `(${allReactions.length})`}
          </button>
          {presentTypes.map((type) => {
            const count = countsByType.get(type) ?? 0;
            const config = reactionConfig[type];
            return (
              <button
                key={type}
                type="button"
                onClick={() => setActiveFilter(type)}
                className={`px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 flex items-center gap-1 ${
                  activeFilter === type
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <span>{config?.emoji}</span>
                <span>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Reactions list */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/50 px-2 py-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-xs">Loading reactions...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2 text-center px-4">
              <Users className="w-8 h-8 opacity-40" />
              <p className="text-sm font-medium">No reactions found</p>
            </div>
          ) : (
            filtered.map((item, i) => {
              const profile = item.user;
              const page = item.page;
              const rType = item.type as ReactionType;
              const emoji = reactionConfig[rType]?.emoji ?? "👍";

              const name = page ? page.name : profile?.displayName ?? "User";
              const targetHref = page
                ? `/pages/${page.id}`
                : `/${profile?.username || profile?.id}`;
              const avatar = page ? page.avatarUrl : profile?.avatarUrl;

              return (
                <div
                  key={`${item.user?.id}-${i}`}
                  className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <Link
                    href={targetHref}
                    onClick={() => onOpenChange(false)}
                    className="flex items-center gap-3 min-w-0 flex-1 group"
                  >
                    <div className="relative shrink-0">
                      <img
                        src={avatarSrc(avatar)}
                        className="w-10 h-10 rounded-full object-cover bg-muted"
                        alt={name}
                      />
                      {/* Mini reaction badge */}
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-card border border-border shadow-xs flex items-center justify-center text-[12px] leading-none">
                        {emoji}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-foreground truncate group-hover:underline">
                        {name}
                      </p>
                      {!page && profile?.username && (
                        <p className="text-xs text-muted-foreground truncate">
                          @{profile.username}
                        </p>
                      )}
                    </div>
                  </Link>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
