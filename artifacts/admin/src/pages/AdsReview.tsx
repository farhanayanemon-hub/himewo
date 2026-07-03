import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { fmtDateTime, fmtRelative } from "../lib/format";
import { useAuth } from "../lib/auth";
import type { Paged, AdRow, AdReviewStatus } from "../lib/types";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Loading,
  Modal,
  Pagination,
  Select,
  Table,
  Td,
  Textarea,
  Th,
} from "../components/ui";
import { PageHeader } from "../components/Layout";

const STATUS_TONE: Record<AdReviewStatus, "amber" | "green" | "red"> = {
  pending: "amber",
  approved: "green",
  rejected: "red",
};

function boostLabel(ad: AdRow): string | null {
  if (ad.boostedPostId != null) return `Boosted post #${ad.boostedPostId}`;
  if (ad.boostedPageId != null) return `Boosted page #${ad.boostedPageId}`;
  return null;
}

export function AdsReview() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const [status, setStatus] = useState<AdReviewStatus>("pending");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<AdRow | null>(null);
  const [note, setNote] = useState("");
  const limit = 25;

  const query = useQuery({
    queryKey: ["admin-ads", status, offset],
    queryFn: () =>
      api.get<Paged<AdRow>>("/admin/ads", { status, limit, offset }),
  });

  const review = useMutation({
    mutationFn: (v: { id: number; action: "approve" | "reject"; note?: string }) =>
      api.post(`/admin/ads/${v.id}/${v.action}`, { note: v.note }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-ads"] });
      setSelected(null);
      setNote("");
    },
  });

  const canManage = can("ads.manage");

  return (
    <div>
      <PageHeader
        title="Ads Review"
        description="Review advertiser and boosted-content ads before they go live."
      />

      <Card className="mb-4 p-3">
        <div className="flex flex-wrap gap-2">
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as AdReviewStatus);
              setOffset(0);
            }}
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </Select>
        </div>
      </Card>

      <Card>
        {query.isLoading && <Loading />}
        <ErrorNote error={query.error} />
        {query.data?.items.length === 0 && (
          <EmptyState
            title="No ads"
            description="Nothing matches this status filter."
          />
        )}
        {query.data && query.data.items.length > 0 && (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Ad</Th>
                  <Th>Advertiser</Th>
                  <Th>Objective</Th>
                  <Th>Status</Th>
                  <Th>Created</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((ad) => {
                  const boost = boostLabel(ad);
                  return (
                    <tr key={ad.id} className="hover:bg-slate-50">
                      <Td className="max-w-xs">
                        <p className="line-clamp-1 font-medium text-slate-800">
                          {ad.name}
                        </p>
                        {boost && (
                          <span className="text-xs text-slate-400">{boost}</span>
                        )}
                      </Td>
                      <Td>
                        {ad.owner ? (
                          <div className="flex items-center gap-2">
                            <Avatar
                              src={ad.owner.avatarUrl}
                              name={ad.owner.displayName}
                              size={24}
                            />
                            <span className="text-xs text-slate-600">
                              @{ad.owner.username}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </Td>
                      <Td>
                        <span className="text-xs text-slate-600">
                          {ad.objective ?? "—"}
                        </span>
                      </Td>
                      <Td>
                        <Badge tone={STATUS_TONE[ad.reviewStatus]}>
                          {ad.reviewStatus}
                        </Badge>
                      </Td>
                      <Td className="text-xs text-slate-500">
                        {fmtRelative(ad.createdAt)}
                      </Td>
                      <Td>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelected(ad);
                            setNote(ad.reviewNote ?? "");
                          }}
                        >
                          Review
                        </Button>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            <Pagination
              offset={offset}
              limit={limit}
              total={query.data.total}
              count={query.data.items.length}
              onChange={setOffset}
            />
          </>
        )}
      </Card>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Ad #${selected.id}` : ""}
        footer={
          canManage && selected ? (
            <>
              <Button
                variant="ghost"
                onClick={() =>
                  review.mutate({
                    id: selected.id,
                    action: "reject",
                    note,
                  })
                }
                loading={review.isPending}
              >
                Reject
              </Button>
              <Button
                onClick={() =>
                  review.mutate({
                    id: selected.id,
                    action: "approve",
                    note,
                  })
                }
                loading={review.isPending}
              >
                Approve
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => setSelected(null)}>
              Close
            </Button>
          )
        }
      >
        {selected && (
          <div className="space-y-4 text-sm">
            <ErrorNote error={review.error} />
            <Field label="Name">{selected.name}</Field>
            {selected.creative?.headline && (
              <Field label="Headline">{selected.creative.headline}</Field>
            )}
            {selected.creative?.primaryText && (
              <Field label="Primary text">{selected.creative.primaryText}</Field>
            )}
            {selected.creative?.mediaUrls?.[0] && (
              <img
                src={selected.creative.mediaUrls[0]}
                alt="Ad creative"
                className="max-h-48 rounded-lg border border-slate-200"
              />
            )}
            {boostLabel(selected) && (
              <Field label="Boost">{boostLabel(selected)}</Field>
            )}
            <Field label="Advertiser">
              {selected.owner ? `@${selected.owner.username}` : "Unknown"}
            </Field>
            {selected.campaignName && (
              <Field label="Campaign">{selected.campaignName}</Field>
            )}
            <Field label="Objective">{selected.objective ?? "—"}</Field>
            {selected.destinationUrl && (
              <Field label="Destination">
                <a
                  href={selected.destinationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-600 hover:underline"
                >
                  {selected.destinationUrl}
                </a>
              </Field>
            )}
            <Field label="Submitted">{fmtDateTime(selected.createdAt)}</Field>
            {canManage && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  Review note
                </label>
                <Textarea
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional note (shared with the advertiser record)"
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <div className="mt-0.5 text-slate-700">{children}</div>
    </div>
  );
}
