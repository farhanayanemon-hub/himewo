import { MainLayout } from "@/components/layout/main-layout";
import { Clock } from "lucide-react";

export default function MemoriesPage() {
  return (
    <MainLayout>
      <div className="bg-card border border-border rounded-2xl p-6 card-depth animate-in fade-in">
        <h1 className="text-xl font-bold flex items-center gap-2 mb-2">
          <Clock className="w-6 h-6 text-primary" /> Memories
        </h1>
        <p className="text-muted-foreground text-sm mb-8">
          Look back on your posts from days gone by, right here.
        </p>
        <div className="flex flex-col items-center text-center py-12">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-foreground font-semibold">No memories yet</p>
          <p className="text-muted-foreground text-sm mt-1 max-w-sm">
            Once you've been posting for a while, you'll see "on this day"
            memories here.
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
