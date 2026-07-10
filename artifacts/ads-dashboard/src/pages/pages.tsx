import {
  useListPages,
  getListPagesQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Flag } from "lucide-react";

export default function PagesPage() {
  const params = { mine: true };
  const { data: pages, isLoading } = useListPages(params, {
    query: { queryKey: getListPagesQueryKey(params) },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pages</h1>
        <p className="text-sm text-muted-foreground">
          Pages you own or manage. Boosted posts and page ads run from these
          pages.
        </p>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Loading pages...
        </div>
      ) : !pages || pages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Flag className="h-8 w-8 text-muted-foreground" />
            <div className="font-medium">No pages yet</div>
            <p className="max-w-sm text-sm text-muted-foreground">
              Create a page on HiMewo first. Pages you own or have access to
              will show up here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pages.map((p) => (
            <Card key={p.id} data-testid={`ads-page-${p.id}`}>
              <CardContent className="flex items-center gap-3 py-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={p.avatarUrl ?? undefined} />
                  <AvatarFallback>
                    {p.name.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">{p.name}</span>
                    {p.category && (
                      <Badge variant="secondary">{p.category}</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {p.followerCount} follower{p.followerCount === 1 ? "" : "s"}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
