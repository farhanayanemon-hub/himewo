import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Eye, EyeOff, Pin, Star, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { fmtRelative } from "../lib/format";
import { useAuth } from "../lib/auth";
import type {
  CommentRow,
  Paged,
  PostRow,
  ReelRow,
  StoryRow,
} from "../lib/types";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Input,
  Loading,
  Pagination,
  Table,
  Td,
  Th,
} from "../components/ui";
import { PageHeader } from "../components/Layout";

type Tab = "posts" | "comments" | "reels" | "stories";
const TABS: { key: Tab; label: string }[] = [
  { key: "posts", label: "Posts" },
  { key: "comments", label: "Comments" },
  { key: "reels", label: "Reels" },
  { key: "stories", label: "Stories" },
];

export function Content() {
  const [tab, setTab] = useState<Tab>("posts");
  return (
    <div>
      <PageHeader
        title="Content"
        description="Review and moderate user-generated content."
      />
      <div className="mb-4 flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={
              "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors " +
              (tab === t.key
                ? "bg-brand-50 text-brand-700"
                : "text-slate-500 hover:bg-slate-50")
            }
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "posts" && <PostsTab />}
      {tab === "comments" && <CommentsTab />}
      {tab === "reels" && <ReelsTab />}
      {tab === "stories" && <StoriesTab />}
    </div>
  );
}

function useModeration(kind: string) {
  const qc = useQueryClient();
  const { can } = useAuth();
  const patch = useMutation({
    mutationFn: (v: { id: number; body: Record<string, unknown> }) =>
      api.patch(`/admin/${kind}/${v.id}`, v.body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [kind] }),
  });
  const remove = useMutation({
    mutationFn: (id: number) => api.del(`/admin/${kind}/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [kind] }),
  });
  return { patch, remove, canModerate: can("content.moderate") };
}

function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <Card className="mb-4 p-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pl-9"
        />
      </div>
    </Card>
  );
}

function AuthorCell({ author }: { author: { displayName: string; username: string; avatarUrl: string | null } | null }) {
  if (!author) return <span className="text-xs text-slate-400">Unknown</span>;
  return (
    <div className="flex items-center gap-2">
      <Avatar src={author.avatarUrl} name={author.displayName} size={28} />
      <div className="text-xs">
        <div className="font-medium text-slate-800">{author.displayName}</div>
        <div className="text-slate-400">@{author.username}</div>
      </div>
    </div>
  );
}

function IconBtn({
  active,
  title,
  onClick,
  disabled,
  children,
  tone = "brand",
}: {
  active?: boolean;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  tone?: "brand" | "amber" | "rose";
}) {
  const tones = {
    brand: active ? "bg-brand-100 text-brand-700" : "text-slate-400 hover:bg-slate-100",
    amber: active ? "bg-amber-100 text-amber-700" : "text-slate-400 hover:bg-slate-100",
    rose: "text-slate-400 hover:bg-rose-100 hover:text-rose-600",
  };
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={"rounded-lg p-2 transition-colors disabled:opacity-40 " + tones[tone]}
    >
      {children}
    </button>
  );
}

function PostsTab() {
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 25;
  const { patch, remove, canModerate } = useModeration("posts");
  const query = useQuery({
    queryKey: ["posts", q, offset],
    queryFn: () =>
      api.get<Paged<PostRow>>("/admin/content/posts", { q, limit, offset }),
  });
  return (
    <>
      <SearchBar value={q} onChange={(v) => { setQ(v); setOffset(0); }} placeholder="Search post text" />
      <Card>
        {query.isLoading && <Loading />}
        <ErrorNote error={query.error || patch.error || remove.error} />
        {query.data?.items.length === 0 && <EmptyState title="No posts" />}
        {query.data && query.data.items.length > 0 && (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Author</Th>
                  <Th>Content</Th>
                  <Th>Flags</Th>
                  <Th>Posted</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <Td><AuthorCell author={p.author} /></Td>
                    <Td className="max-w-xs">
                      <p className="line-clamp-2 text-slate-700">{p.content || <span className="text-slate-400">(no text)</span>}</p>
                    </Td>
                    <Td>
                      <div className="flex gap-1">
                        {p.hidden && <Badge tone="red">Hidden</Badge>}
                        {p.pinned && <Badge tone="blue">Pinned</Badge>}
                        {p.featured && <Badge tone="amber">Featured</Badge>}
                      </div>
                    </Td>
                    <Td className="text-xs text-slate-500">{fmtRelative(p.createdAt)}</Td>
                    <Td>
                      <div className="flex justify-end">
                        <IconBtn title={p.hidden ? "Unhide" : "Hide"} active={p.hidden} disabled={!canModerate || patch.isPending} onClick={() => patch.mutate({ id: p.id, body: { hidden: !p.hidden } })}>
                          {p.hidden ? <EyeOff size={16} /> : <Eye size={16} />}
                        </IconBtn>
                        <IconBtn title="Pin" active={p.pinned} disabled={!canModerate || patch.isPending} onClick={() => patch.mutate({ id: p.id, body: { pinned: !p.pinned } })}>
                          <Pin size={16} />
                        </IconBtn>
                        <IconBtn title="Feature" tone="amber" active={p.featured} disabled={!canModerate || patch.isPending} onClick={() => patch.mutate({ id: p.id, body: { featured: !p.featured } })}>
                          <Star size={16} />
                        </IconBtn>
                        <IconBtn title="Delete" tone="rose" disabled={!canModerate || remove.isPending} onClick={() => { if (confirm("Delete this post?")) remove.mutate(p.id); }}>
                          <Trash2 size={16} />
                        </IconBtn>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination offset={offset} limit={limit} count={query.data.items.length} onChange={setOffset} />
          </>
        )}
      </Card>
    </>
  );
}

function CommentsTab() {
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 25;
  const { patch, remove, canModerate } = useModeration("comments");
  const query = useQuery({
    queryKey: ["comments", q, offset],
    queryFn: () =>
      api.get<Paged<CommentRow>>("/admin/content/comments", { q, limit, offset }),
  });
  return (
    <>
      <SearchBar value={q} onChange={(v) => { setQ(v); setOffset(0); }} placeholder="Search comment text" />
      <Card>
        {query.isLoading && <Loading />}
        <ErrorNote error={query.error || patch.error || remove.error} />
        {query.data?.items.length === 0 && <EmptyState title="No comments" />}
        {query.data && query.data.items.length > 0 && (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Author</Th>
                  <Th>Comment</Th>
                  <Th>Flags</Th>
                  <Th>Posted</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <Td><AuthorCell author={c.author} /></Td>
                    <Td className="max-w-xs"><p className="line-clamp-2 text-slate-700">{c.content}</p></Td>
                    <Td>{c.hidden && <Badge tone="red">Hidden</Badge>}</Td>
                    <Td className="text-xs text-slate-500">{fmtRelative(c.createdAt)}</Td>
                    <Td>
                      <div className="flex justify-end">
                        <IconBtn title={c.hidden ? "Unhide" : "Hide"} active={c.hidden} disabled={!canModerate || patch.isPending} onClick={() => patch.mutate({ id: c.id, body: { hidden: !c.hidden } })}>
                          {c.hidden ? <EyeOff size={16} /> : <Eye size={16} />}
                        </IconBtn>
                        <IconBtn title="Delete" tone="rose" disabled={!canModerate || remove.isPending} onClick={() => { if (confirm("Delete this comment?")) remove.mutate(c.id); }}>
                          <Trash2 size={16} />
                        </IconBtn>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination offset={offset} limit={limit} count={query.data.items.length} onChange={setOffset} />
          </>
        )}
      </Card>
    </>
  );
}

function ReelsTab() {
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 25;
  const { patch, remove, canModerate } = useModeration("reels");
  const query = useQuery({
    queryKey: ["reels", q, offset],
    queryFn: () =>
      api.get<Paged<ReelRow>>("/admin/content/reels", { q, limit, offset }),
  });
  return (
    <>
      <SearchBar value={q} onChange={(v) => { setQ(v); setOffset(0); }} placeholder="Search reel captions" />
      <Card>
        {query.isLoading && <Loading />}
        <ErrorNote error={query.error || patch.error || remove.error} />
        {query.data?.items.length === 0 && <EmptyState title="No reels" />}
        {query.data && query.data.items.length > 0 && (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Author</Th>
                  <Th>Caption</Th>
                  <Th>Flags</Th>
                  <Th>Posted</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <Td><AuthorCell author={r.author} /></Td>
                    <Td className="max-w-xs"><p className="line-clamp-2 text-slate-700">{r.caption || <span className="text-slate-400">(no caption)</span>}</p></Td>
                    <Td>
                      <div className="flex gap-1">
                        {r.hidden && <Badge tone="red">Hidden</Badge>}
                        {r.featured && <Badge tone="amber">Featured</Badge>}
                      </div>
                    </Td>
                    <Td className="text-xs text-slate-500">{fmtRelative(r.createdAt)}</Td>
                    <Td>
                      <div className="flex justify-end">
                        <IconBtn title={r.hidden ? "Unhide" : "Hide"} active={r.hidden} disabled={!canModerate || patch.isPending} onClick={() => patch.mutate({ id: r.id, body: { hidden: !r.hidden } })}>
                          {r.hidden ? <EyeOff size={16} /> : <Eye size={16} />}
                        </IconBtn>
                        <IconBtn title="Feature" tone="amber" active={r.featured} disabled={!canModerate || patch.isPending} onClick={() => patch.mutate({ id: r.id, body: { featured: !r.featured } })}>
                          <Star size={16} />
                        </IconBtn>
                        <IconBtn title="Delete" tone="rose" disabled={!canModerate || remove.isPending} onClick={() => { if (confirm("Delete this reel?")) remove.mutate(r.id); }}>
                          <Trash2 size={16} />
                        </IconBtn>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination offset={offset} limit={limit} count={query.data.items.length} onChange={setOffset} />
          </>
        )}
      </Card>
    </>
  );
}

function StoriesTab() {
  const [offset, setOffset] = useState(0);
  const [activeOnly, setActiveOnly] = useState(true);
  const limit = 25;
  const { patch, remove, canModerate } = useModeration("stories");
  const query = useQuery({
    queryKey: ["stories", activeOnly, offset],
    queryFn: () =>
      api.get<Paged<StoryRow>>("/admin/content/stories", {
        active: activeOnly ? "true" : "",
        limit,
        offset,
      }),
  });
  return (
    <>
      <Card className="mb-4 flex items-center justify-between p-3">
        <span className="text-sm text-slate-600">Show active stories only</span>
        <Button size="sm" variant={activeOnly ? "primary" : "outline"} onClick={() => { setActiveOnly((v) => !v); setOffset(0); }}>
          {activeOnly ? "Active only" : "All stories"}
        </Button>
      </Card>
      <Card>
        {query.isLoading && <Loading />}
        <ErrorNote error={query.error || patch.error || remove.error} />
        {query.data?.items.length === 0 && <EmptyState title="No stories" />}
        {query.data && query.data.items.length > 0 && (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Author</Th>
                  <Th>Caption</Th>
                  <Th>Status</Th>
                  <Th>Expires</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <Td><AuthorCell author={s.author} /></Td>
                    <Td className="max-w-xs"><p className="line-clamp-2 text-slate-700">{s.caption || <span className="text-slate-400">(no caption)</span>}</p></Td>
                    <Td>{s.hidden && <Badge tone="red">Hidden</Badge>}</Td>
                    <Td className="text-xs text-slate-500">{fmtRelative(s.expiresAt)}</Td>
                    <Td>
                      <div className="flex justify-end">
                        <IconBtn title={s.hidden ? "Unhide" : "Hide"} active={s.hidden} disabled={!canModerate || patch.isPending} onClick={() => patch.mutate({ id: s.id, body: { hidden: !s.hidden } })}>
                          {s.hidden ? <EyeOff size={16} /> : <Eye size={16} />}
                        </IconBtn>
                        <IconBtn title="Delete" tone="rose" disabled={!canModerate || remove.isPending} onClick={() => { if (confirm("Delete this story?")) remove.mutate(s.id); }}>
                          <Trash2 size={16} />
                        </IconBtn>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination offset={offset} limit={limit} count={query.data.items.length} onChange={setOffset} />
          </>
        )}
      </Card>
    </>
  );
}
