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
  gradient: string;
  action: () => void;
}

export function useCreateActions(onClose?: () => void) {
  const [, navigate] = useLocation();
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [isPollMode, setIsPollMode] = useState(false);

  const options: CreateOption[] = [
    {
      id: "post",
      title: "Post",
      sub: "Share updates & photos to feed",
      icon: PenSquare,
      color: "text-sky-500",
      bgColor: "bg-sky-500/15",
      gradient: "from-sky-500 to-blue-600",
      action: () => {
        onClose?.();
        setIsPollMode(false);
        setPostDialogOpen(true);
      },
    },
    {
      id: "story",
      title: "Story",
      sub: "Share photos, videos or text",
      icon: BookImage,
      color: "text-purple-500",
      bgColor: "bg-purple-500/15",
      gradient: "from-[#833AB4] via-[#FD1D1D] to-[#F77737]",
      action: () => {
        onClose?.();
        window.dispatchEvent(new CustomEvent("himewo:open-create-story"));
        navigate("/stories");
      },
    },
    {
      id: "reel",
      title: "Reel",
      sub: "Share short videos with audio",
      icon: Film,
      color: "text-pink-500",
      bgColor: "bg-pink-500/15",
      gradient: "from-pink-500 to-purple-600",
      action: () => {
        onClose?.();
        window.dispatchEvent(new CustomEvent("himewo:open-create-reel"));
        navigate("/reels");
      },
    },
    {
      id: "live",
      title: "Live",
      sub: "Broadcast live to followers",
      icon: Radio,
      color: "text-rose-500",
      bgColor: "bg-rose-500/15",
      gradient: "from-rose-500 to-red-600",
      action: () => {
        onClose?.();
        navigate("/live");
      },
    },
    {
      id: "event",
      title: "Event",
      sub: "Plan and host an occasion",
      icon: CalendarDays,
      color: "text-amber-500",
      bgColor: "bg-amber-500/15",
      gradient: "from-amber-500 to-orange-500",
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
      gradient: "from-emerald-500 to-teal-600",
      action: () => {
        onClose?.();
        setIsPollMode(true);
        setPostDialogOpen(true);
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
        <DialogContent className="max-w-sm p-0 overflow-hidden border border-border/70 rounded-3xl shadow-2xl bg-card">
          <DialogHeader className="py-4 px-6 border-b border-border/50">
            <DialogTitle className="text-base font-bold text-center tracking-tight">
              Create
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 grid grid-cols-3 gap-y-6 gap-x-3">
            {options.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  onClick={opt.action}
                  className="flex flex-col items-center justify-center gap-2.5 group transition-all cursor-pointer focus:outline-none"
                >
                  <div
                    className={`w-14 h-14 rounded-full bg-gradient-to-tr ${opt.gradient} flex items-center justify-center text-white shadow-md transition-all duration-200 group-hover:scale-110 group-active:scale-95 group-hover:shadow-lg`}
                  >
                    <Icon className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <span className="text-xs font-semibold text-foreground/90 group-hover:text-foreground transition-colors text-center">
                    {opt.title}
                  </span>
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
