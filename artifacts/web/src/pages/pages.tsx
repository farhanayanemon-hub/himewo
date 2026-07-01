import { MainLayout } from "@/components/layout/main-layout";
import {
  useListPages,
  useGetPage,
  useGetPagePosts,
  useCreatePage,
  useFollowPage,
  useUnfollowPage,
  getListPagesQueryKey,
  getGetPageQueryKey,
} from "@workspace/api-client-react";
import { useParams, Link, useLocation } from "wouter";
import { PostCard } from "@/components/post-card";
import { PostComposer } from "@/components/post-composer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, FileText } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export default function PagesView() {
  const { id } = useParams<{ id: string }>();

  if (id) {
    return <PageDetail id={Number(id)} />;
  }

  return <PageList />;
}

function PageList() {
  const { data: pages, isLoading } = useListPages();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  const createPage = useCreatePage();

  const handleCreate = () => {
    if (!name.trim()) return;
    createPage.mutate(
      {
        data: {
          name: name.trim(),
          category: category.trim() || undefined,
          description: description.trim() || undefined,
        },
      },
      {
        onSuccess: (page) => {
          queryClient.invalidateQueries({ queryKey: getListPagesQueryKey() });
          setOpen(false);
          setName("");
          setCategory("");
          setDescription("");
          navigate(`/pages/${page.id}`);
        },
      }
    );
  };

  return (
    <MainLayout>
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm animate-in fade-in">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold">Pages</h1>
          <Button onClick={() => setOpen(true)}>Create Page</Button>
        </div>

        {isLoading ? (
          <div className="py-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : pages?.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">No pages found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pages?.map(page => (
              <Link key={page.id} href={`/pages/${page.id}`}>
                <div className="border border-border rounded-xl p-4 flex gap-4 hover:bg-muted/50 transition-colors group cursor-pointer">
                  <div className="w-16 h-16 rounded-full bg-muted shrink-0 overflow-hidden">
                    {page.avatarUrl ? (
                      <img src={page.avatarUrl} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
                        <FileText className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h3 className="font-bold text-lg truncate group-hover:text-primary transition-colors">{page.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">{page.category || "General"}</p>
                    <div className="text-xs font-medium text-muted-foreground mt-1">
                      {page.followerCount} followers
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Page</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="page-name">Name</Label>
              <Input
                id="page-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Page name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="page-category">Category</Label>
              <Input
                id="page-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Business, Community"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="page-description">Description</Label>
              <Textarea
                id="page-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this page about?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!name.trim() || createPage.isPending}>
              {createPage.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

function PageDetail({ id }: { id: number }) {
  const { data: page, isLoading } = useGetPage(id);
  const { data: posts, isLoading: postsLoading } = useGetPagePosts(id);
  const queryClient = useQueryClient();

  const followPage = useFollowPage();
  const unfollowPage = useUnfollowPage();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListPagesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetPageQueryKey(id) });
  };

  if (isLoading) {
    return <MainLayout><div className="py-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></MainLayout>;
  }

  if (!page) {
    return <MainLayout><div className="py-10 text-center text-muted-foreground">Page not found</div></MainLayout>;
  }

  const handleFollow = () => {
    if (page.viewerFollows) {
      unfollowPage.mutate({ id }, { onSuccess: invalidate });
    } else {
      followPage.mutate({ id }, { onSuccess: invalidate });
    }
  };

  return (
    <MainLayout>
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm mb-6 animate-in fade-in">
        <div className="h-48 bg-muted relative">
          {page.coverUrl ? (
            <img src={page.coverUrl} className="w-full h-full object-cover" alt="Cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-primary/20 to-primary/40" />
          )}
        </div>
        <div className="px-6 pb-6 relative">
          <div className="flex justify-between items-end mb-4">
            <img 
              src={page.avatarUrl || ""} 
              className="w-32 h-32 rounded-full border-4 border-card object-cover -mt-16 bg-muted relative z-10" 
              alt="Avatar" 
            />
            <Button
              variant={page.viewerFollows ? "secondary" : "default"}
              onClick={handleFollow}
              disabled={followPage.isPending || unfollowPage.isPending}
            >
              {(followPage.isPending || unfollowPage.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {page.viewerFollows ? "Following" : "Follow"}
            </Button>
          </div>
          <div>
            <h1 className="text-2xl font-bold">{page.name}</h1>
            <p className="text-muted-foreground text-sm mb-2">{page.category}</p>
            {page.description && <p className="text-[15px] mb-4">{page.description}</p>}
            <div className="text-sm text-muted-foreground font-medium">
              <span>{page.followerCount} Followers</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="font-bold text-lg px-2">Posts</h2>
        {page.viewerCanPost && <PostComposer pageId={id} />}
        {postsLoading ? (
          <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : posts?.length === 0 ? (
          <div className="py-10 text-center bg-card border border-border rounded-xl text-muted-foreground">No posts yet.</div>
        ) : (
          posts?.map(post => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </MainLayout>
  );
}
