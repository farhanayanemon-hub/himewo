import { BadgeCheck } from "lucide-react";

export function VerifiedBadge({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <BadgeCheck
      className={`${className} inline-block text-white fill-purple-600 dark:fill-purple-500 shrink-0 drop-shadow-sm`}
      aria-label="Verified"
    />
  );
}

