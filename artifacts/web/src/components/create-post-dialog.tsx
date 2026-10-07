import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PostComposer } from "@/components/post-composer";

export function CreatePostDialog({
  open,
  onOpenChange,
  isPoll = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPoll?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden border border-border/80 rounded-2xl sm:rounded-3xl shadow-2xl">
        <DialogHeader className="p-4 border-b border-border/60">
          <DialogTitle className="text-base font-bold text-center">
            {isPoll ? "Create Poll" : "Create Post"}
          </DialogTitle>
        </DialogHeader>
        <div className="p-4 max-h-[80vh] overflow-y-auto">
          <PostComposer
            onPosted={() => onOpenChange(false)}
            className="border-0 shadow-none bg-transparent p-0"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
