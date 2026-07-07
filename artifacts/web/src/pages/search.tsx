import { MainLayout } from "@/components/layout/main-layout";
import { avatarSrc } from "@/lib/avatar";
import { useSearchUsers } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Loader2, Search } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function SearchPage() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1]);
  const q = searchParams.get('q') || "";

  const { data: users, isLoading } = useSearchUsers({ q });

  return (
    <MainLayout>
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm animate-in fade-in">
        <h1 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Search className="w-6 h-6 text-primary" /> 
          Search Results for "{q}"
        </h1>

        <div className="space-y-4">
          {isLoading ? (
            <div className="py-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : users?.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">No users found.</div>
          ) : (
            users?.map(user => (
              <div key={user.id} className="flex items-center gap-4 p-4 border border-border rounded-xl hover:bg-muted/50 transition-colors">
                <Link href={`/profile/${user.id}`} className="w-16 h-16 shrink-0">
                  <img src={avatarSrc(user.avatarUrl)} className="w-full h-full rounded-full object-cover bg-muted" alt="" />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/profile/${user.id}`} className="font-bold text-lg hover:underline truncate block">
                    {user.displayName}
                  </Link>
                  <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
                </div>
                <Button variant="secondary">View Profile</Button>
              </div>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
}