import { MainLayout } from "@/components/layout/main-layout";
import { avatarSrc } from "@/lib/avatar";
import { useSearchAll } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Loader2, Search, Users, Flag } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function SearchPage() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split("?")[1]);
  const q = searchParams.get("q") || "";

  const { data, isLoading } = useSearchAll({ q, limit: 10 });
  const people = data?.people ?? [];
  const pages = data?.pages ?? [];
  const groups = data?.groups ?? [];
  const total = people.length + pages.length + groups.length;

  return (
    <MainLayout>
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm animate-in fade-in">
        <h1 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Search className="w-6 h-6 text-primary" />
          Search Results for "{q}"
        </h1>

        {isLoading ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : total === 0 ? (
          <div className="py-10 text-center text-muted-foreground">No results found.</div>
        ) : (
          <div className="space-y-8">
            {people.length > 0 && (
              <section>
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">
                  People
                </h2>
                <div className="space-y-3">
                  {people.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-4 p-4 border border-border rounded-xl hover:bg-muted/50 transition-colors"
                    >
                      <Link href={`/profile/${user.id}`} className="w-14 h-14 shrink-0">
                        <img
                          src={avatarSrc(user.avatarUrl)}
                          className="w-full h-full rounded-full object-cover bg-muted"
                          alt=""
                        />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/profile/${user.id}`}
                          className="font-bold hover:underline truncate block"
                        >
                          {user.displayName}
                        </Link>
                        <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
                      </div>
                      <Link href={`/profile/${user.id}`}>
                        <Button variant="secondary">View Profile</Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {pages.length > 0 && (
              <section>
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">
                  Hubs
                </h2>
                <div className="space-y-3">
                  {pages.map((page) => (
                    <div
                      key={page.id}
                      className="flex items-center gap-4 p-4 border border-border rounded-xl hover:bg-muted/50 transition-colors"
                    >
                      <Link href={`/pages/${page.id}`} className="w-14 h-14 shrink-0">
                        {page.avatarUrl ? (
                          <img
                            src={page.avatarUrl}
                            className="w-full h-full rounded-full object-cover bg-muted"
                            alt=""
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-muted flex items-center justify-center">
                            <Flag className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/pages/${page.id}`}
                          className="font-bold hover:underline truncate block"
                        >
                          {page.name}
                        </Link>
                        <p className="text-sm text-muted-foreground truncate">
                          Hub{page.category ? ` · ${page.category}` : ""} · {page.followerCount}{" "}
                          followers
                        </p>
                      </div>
                      <Link href={`/pages/${page.id}`}>
                        <Button variant="secondary">View Hub</Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {groups.length > 0 && (
              <section>
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">
                  Circles
                </h2>
                <div className="space-y-3">
                  {groups.map((group) => (
                    <div
                      key={group.id}
                      className="flex items-center gap-4 p-4 border border-border rounded-xl hover:bg-muted/50 transition-colors"
                    >
                      <Link href={`/groups/${group.id}`} className="w-14 h-14 shrink-0">
                        {group.avatarUrl ? (
                          <img
                            src={group.avatarUrl}
                            className="w-full h-full rounded-full object-cover bg-muted"
                            alt=""
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-muted flex items-center justify-center">
                            <Users className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/groups/${group.id}`}
                          className="font-bold hover:underline truncate block"
                        >
                          {group.name}
                        </Link>
                        <p className="text-sm text-muted-foreground truncate capitalize">
                          Circle · {group.privacy} · {group.memberCount} members
                        </p>
                      </div>
                      <Link href={`/groups/${group.id}`}>
                        <Button variant="secondary">View Circle</Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
