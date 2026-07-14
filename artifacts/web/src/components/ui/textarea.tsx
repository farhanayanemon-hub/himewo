import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[100px] w-full rounded-2xl border border-input bg-muted/40 px-5 py-3.5 text-[17px] shadow-sm transition-all duration-200 placeholder:text-muted-foreground/70 hover:border-muted-foreground/30 focus:outline-none focus-visible:outline-none focus-visible:bg-background disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
