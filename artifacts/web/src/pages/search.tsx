import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { avatarSrc } from "@/lib/avatar";
import { useSearchAll, getSearchAllQueryKey } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Loader2, Search, Users, Flag, X } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SearchPage() {
  const [location, navigate] = useLocation();

  const getQueryFromUrl = () => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    return (params.get("q") || "").trim();
  };

  const [q, setQ] = useState(getQueryFromUrl());
  const [inputValue, setInputValue] = useState(getQueryFromUrl());

  useEffect(() => {
    const handleUrlChange = () => {
      const current = getQueryFromUrl();
      setQ(current);
      setInputValue(current);
    };
    handleUrlChange();
    window.addEventListener("popstate", handleUrlChange);
    return () => window.removeEventListener("popstate", handleUrlChange);
  }, [location]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputValue.trim();
    setQ(trimmed);
    if (trimmed) {
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    } else {
      navigate("/search");
    }
  };

  const handleClear = () => {
    setInputValue("");
    setQ("");
    navigate("/search");
  };

  const searchParams = { q, limit: 15 };
  const { data, isLoading } = useSearchAll(
    searchParams,
    { query: { enabled: q.length > 0, queryKey: getSearchAllQueryKey(searchParams) } }
  );

  const people = data?.people ?? [];
  const pages = data?.pages ?? [];
  const groups = data?.groups ?? [];
  const total = people.length + pages.length + groups.length;

  return (
    <MainLayout>
      <div className="bg-card border border-border rounded-2xl p-4 md:p-6 shadow-sm animate-in fade-in space-y-6">
        {/* Search Header and Input */}
        <div>
          <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Search people, hubs, circles..."
                className="pl-10 pr-10 h-12 rounded-xl text-base bg-muted/40 border-border focus-visible:ring-primary/20"
                autoFocus
              />
              {inputValue ? (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : null}
            </div>
            <Button type="submit" className="h-12 px-6 rounded-xl font-semibold">
              Search
            </Button>
          </form>
        </div>

        {q ? (
          <h1 className="text-lg font-bold flex items-center gap-2 text-foreground">
            <Search className="w-5 h-5 text-primary" />
            Search Results for <span className="text-primary">"{q}"</span>
          </h1>
        ) : (
          <div className="py-12 text-center text-muted-foreground space-y-2">
            <Search className="w-12 h-12 mx-auto text-muted-foreground/40 stroke-1" />
            <p className="font-medium text-base">Type something above to search</p>
            <p className="text-sm text-muted-foreground/80">Find friends, explore creator hubs, and discover circles.</p>
          </div>
        )}

        {q ? (
          isLoading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : total === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <p className="font-semibold text-base">No results found for "{q}"</p>
              <p className="text-sm text-muted-foreground/80 mt-1">Try different keywords or check spelling.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {people.length > 0 && (
                <section>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" /> People ({people.length})
                  </h2>
                  <div className="space-y-3">
                    {people.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-4 p-4 border border-border rounded-xl hover:bg-muted/50 transition-colors"
                      >
                        <Link href={`/${user.username || user.id}`} className="w-12 h-12 shrink-0">
                          <img
                            src={avatarSrc(user.avatarUrl)}
                            className="w-full h-full rounded-full object-cover bg-muted"
                            alt=""
                          />
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/${user.username || user.id}`}
                            className="font-bold hover:underline truncate block text-[15px]"
                          >
                            {user.displayName}
                          </Link>
                          <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
                        </div>
                        <Link href={`/${user.username || user.id}`}>
                          <Button variant="secondary" size="sm" className="rounded-lg">
                            View Profile
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {pages.length > 0 && (
                <section>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
                    <Flag className="w-4 h-4" /> Hubs ({pages.length})
                  </h2>
                  <div className="space-y-3">
                    {pages.map((page) => (
                      <div
                        key={page.id}
                        className="flex items-center gap-4 p-4 border border-border rounded-xl hover:bg-muted/50 transition-colors"
                      >
                        <Link href={`/pages/${page.id}`} className="w-12 h-12 shrink-0">
                          {page.avatarUrl ? (
                            <img
                              src={page.avatarUrl}
                              className="w-full h-full rounded-full object-cover bg-muted"
                              alt=""
                            />
                          ) : (
                            <div className="w-full h-full rounded-full bg-muted flex items-center justify-center">
                              <Flag className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/pages/${page.id}`}
                            className="font-bold hover:underline truncate block text-[15px]"
                          >
                            {page.name}
                          </Link>
                          <p className="text-sm text-muted-foreground truncate">
                            Hub{page.category ? ` · ${page.category}` : ""} · {page.followerCount}{" "}
                            followers
                          </p>
                        </div>
                        <Link href={`/pages/${page.id}`}>
                          <Button variant="secondary" size="sm" className="rounded-lg">
                            View Hub
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {groups.length > 0 && (
                <section>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" /> Circles ({groups.length})
                  </h2>
                  <div className="space-y-3">
                    {groups.map((group) => (
                      <div
                        key={group.id}
                        className="flex items-center gap-4 p-4 border border-border rounded-xl hover:bg-muted/50 transition-colors"
                      >
                        <Link href={`/groups/${group.id}`} className="w-12 h-12 shrink-0">
                          {group.avatarUrl ? (
                            <img
                              src={group.avatarUrl}
                              className="w-full h-full rounded-full object-cover bg-muted"
                              alt=""
                            />
                          ) : (
                            <div className="w-full h-full rounded-full bg-muted flex items-center justify-center">
                              <Users className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/groups/${group.id}`}
                            className="font-bold hover:underline truncate block text-[15px]"
                          >
                            {group.name}
                          </Link>
                          <p className="text-sm text-muted-foreground truncate capitalize">
                            Circle · {group.privacy} · {group.memberCount} members
                          </p>
                        </div>
                        <Link href={`/groups/${group.id}`}>
                          <Button variant="secondary" size="sm" className="rounded-lg">
                            View Circle
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )
        ) : null}
      </div>
    </MainLayout>
  );
}
