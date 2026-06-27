import { useState } from "react";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import { Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface EmojiPickerButtonProps {
  onSelect: (emoji: string) => void;
  className?: string;
}

export function EmojiPickerButton({ onSelect, className }: EmojiPickerButtonProps) {
  const [open, setOpen] = useState(false);

  const handleEmojiClick = (data: EmojiClickData) => {
    onSelect(data.emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={
            className ??
            "rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }
        >
          <Smile className="w-5 h-5 text-yellow-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-none" align="end">
        <EmojiPicker
          onEmojiClick={handleEmojiClick}
          theme={Theme.AUTO}
          lazyLoadEmojis
          skinTonesDisabled
        />
      </PopoverContent>
    </Popover>
  );
}
