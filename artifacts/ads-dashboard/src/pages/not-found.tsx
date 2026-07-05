import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] w-full flex flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="text-muted-foreground">
        This page could not be found.
      </p>
      <Link href="/">
        <Button>Go to dashboard</Button>
      </Link>
    </div>
  );
}
