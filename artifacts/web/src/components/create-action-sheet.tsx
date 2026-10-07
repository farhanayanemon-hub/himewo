import { useState } from "react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BookImage,
  Film,
  PenSquare,
  CalendarDays,
  BarChart3,
  Radio,
} from "lucide-react";
import { CreatePostDialog } from "@/components/create-post-dialog";

export interface CreateOption {
  id: string;
  title: string;
  sub: string;
  icon: any;
  color: string;
  bgColor: string;
  action: () => void;
}

export function useCreateActions(onClose?: () => void) {
  const [, navigate] = useLocation();
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [isPollMode, setIsPollMode] = useState(false);

  const options: CreateOption[] = [
    {
      id: "story",
      title: "Story",
      sub: "Share photos, videos or text with filters",
      icon: BookImage,
      color: "text-purple-500",
      bgColor: "bg-purple-500/15",
      action: () => {
        onClose?.();
        window.dispatchEvent(new CustomEvent("himewo:open-create-story"));
        navigate("/stories");
      },
    },
    {
      id: "reel",
      title: "Reel",
      sub: "Share short-form videos with music",
      icon: Film,
      color: "text-pink-500",
      bgColor: "bg-pink-500/15",
      action: () => {
        onClose?.();
        window.dispatchEvent(new CustomEvent("himewo:open-create-reel"));
        navigate("/reels");
      },
    },
    {
      id: "post",
      title: "Post",
      sub: "Share updates & photos to feed",
      icon: PenSquare,
      color: "text-blue-500",
      bgColor: "bg-blue-500/15",
      action: () => {
        onClose?.();
        setIsPollMode(false);
        setPostDialogOpen(true);
      },
    },
    {
      id: "event",
      title: "Events",
      sub: "Plan and host an occasion",
      icon: CalendarDays,
      color: "text-amber-500",
      bgColor: "bg-amber-500/15",
      action: () => {
        onClose?.();
        navigate("/events");
      },
    },
    {
      id: "poll",
      title: "Poll",
      sub: "Ask questions and gather votes",
      icon: BarChart3,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/15",
      action: () => {
        onClose?.();
        setIsPollMode(true);
        setPostDialogOpen(true);
      },
    },
    {
      id: "live",
      title: "Live",
      sub: "Broadcast live video to friends",
      icon: Radio,
      color: "text-rose-500",
      bgColor: "bg-rose-500/15",
      action: () => {
        onClose?.();
        navigate("/live");
      },
    },
  ];

  return {
    options,
    postDialogOpen,
    setPostDialogOpen,
    isPollMode,
  };
}

export function CreateActionSheetModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { options, postDialogOpen, setPostDialogOpen, isPollMode } = useCreateActions(() => onOpenChange(false));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md p-0 overflow-hidden border border-border/80 rounded-3xl shadow-2xl bg-card">
          <DialogHeader className="p-4 border-b border-border/60">
            <DialogTitle className="text-base font-bold text-center">
              Create Content
            </DialogTitle>
          </DialogHeader>
          <div className="p-3 grid grid-cols-2 gap-2.5">
            {options.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  onClick={opt.action}
                  className="flex items-center gap-3 p-3 rounded-2xl border border-border/50 hover:border-primary/40 hover:bg-muted/60 transition-all text-left group active:scale-95"
                >
                  <div className={`w-10 h-10 rounded-xl ${opt.bgColor} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                    <Icon className={`w-5 h-5 ${opt.color}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-foreground truncate">{opt.title}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{opt.sub}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <CreatePostDialog
        open={postDialogOpen}
        onOpenChange={setPostDialogOpen}
        isPoll={isPollMode}
      />
    </>
  );
}
