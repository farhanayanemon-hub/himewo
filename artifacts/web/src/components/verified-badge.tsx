import { BadgeCheck } from "lucide-react";

export function VerifiedBadge({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <BadgeCheck
      className={`${className} inline-block text-primary shrink-0 fill-primary/15`}
      aria-label="Verified"
    />
  );
}
