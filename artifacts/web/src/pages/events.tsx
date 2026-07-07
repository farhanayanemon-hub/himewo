import { useRef, useState } from "react";
import { avatarSrc } from "@/lib/avatar";
import { useParams, Link, useLocation } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import {
  useListEvents,
  getListEventsQueryKey,
  useCreateEvent,
  useGetEvent,
  getGetEventQueryKey,
  useDeleteEvent,
  useRsvpEvent,
  useClearEventRsvp,
  type Event,
  type Profile,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { uploadMedia, UploadUnavailableError } from "@/lib/upload";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  CalendarDays,
  MapPin,
  ImagePlus,
  ArrowLeft,
  Trash2,
  Check,
  Star,
  X,
} from "lucide-react";
import { format } from "date-fns";

function formatEventTime(e: Pick<Event, "startsAt" | "endsAt">) {
  const start = new Date(e.startsAt);
  let text = format(start, "EEE, MMM d, yyyy · h:mm a");
  if (e.endsAt) {
    const end = new Date(e.endsAt);
    const sameDay = start.toDateString() === end.toDateString();
    text += sameDay
      ? ` – ${format(end, "h:mm a")}`
      : ` – ${format(end, "EEE, MMM d · h:mm a")}`;
  }
  return text;
}

function RsvpButtons({ event }: { event: Event }) {
  const queryClient = useQueryClient();
  const rsvp = useRsvpEvent();
  const clearRsvp = useClearEventRsvp();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetEventQueryKey(event.id) });
  };
  const set = (status: "going" | "interested" | "declined") => {
    if (event.viewerRsvp === status) {
      clearRsvp.mutate({ eventId: event.id }, { onSuccess: invalidate });
    } else {
      rsvp.mutate(
        { eventId: event.id, data: { status } },
        { onSuccess: invalidate },
      );
    }
  };
  const busy = rsvp.isPending || clearRsvp.isPending;
  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant={event.viewerRsvp === "going" ? "default" : "outline"}
        disabled={busy}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          set("going");
        }}
      >
        <Check className="w-4 h-4 mr-1.5" /> Going
      </Button>
      <Button
        size="sm"
        variant={event.viewerRsvp === "interested" ? "default" : "outline"}
        disabled={busy}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          set("interested");
        }}
      >
        <Star className="w-4 h-4 mr-1.5" /> Interested
      </Button>
      <Button
        size="sm"
        variant={event.viewerRsvp === "declined" ? "default" : "outline"}
        disabled={busy}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          set("declined");
        }}
      >
        <X className="w-4 h-4 mr-1.5" /> Can't go
      </Button>
    </div>
  );
}

function CreateEventDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const createEvent = useCreateEvent();
  const [, navigate] = useLocation();

  const reset = () => {
    setTitle("");
    setDescription("");
    setLocation("");
    setStartsAt("");
    setEndsAt("");
    setCoverUrl(null);
    setError(null);
  };

  const handleCover = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !file.type.startsWith("image")) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadMedia(file);
      setCoverUrl(uploaded.url);
    } catch (err) {
      if (err instanceof UploadUnavailableError) {
        const url = window.prompt(
          "Direct upload isn't available here. Paste an image URL instead:",
        );
        if (url && /^https?:\/\//i.test(url.trim())) setCoverUrl(url.trim());
      } else {
        setError("Upload failed. Please try again.");
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCreate = () => {
    setError(null);
    if (!title.trim()) {
      setError("Please give your event a title.");
      return;
    }
    if (!startsAt) {
      setError("Please pick a start date and time.");
      return;
    }
    const startIso = new Date(startsAt).toISOString();
    let endIso: string | undefined;
    if (endsAt) {
      const end = new Date(endsAt);
      if (end <= new Date(startsAt)) {
        setError("End time must be after the start time.");
        return;
      }
      endIso = end.toISOString();
    }
    createEvent.mutate(
      {
        data: {
          title: title.trim(),
          description: description.trim() || undefined,
          location: location.trim() || undefined,
          coverUrl: coverUrl ?? undefined,
          startsAt: startIso,
          endsAt: endIso,
        },
      },
      {
        onSuccess: (created) => {
          queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
          reset();
          onOpenChange(false);
          navigate(`/events/${created.id}`);
        },
        onError: () => setError("Couldn't create the event. Please try again."),
      },
    );
  };

  const inputCls =
    "w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create event</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
            maxLength={120}
            className={inputCls}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this event about? (optional)"
            maxLength={2000}
            rows={3}
            className={`${inputCls} resize-none`}
          />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location (optional)"
            maxLength={200}
            className={inputCls}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Starts
              </label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Ends (optional)
              </label>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          {coverUrl ? (
            <div className="relative">
              <img
                src={coverUrl}
                className="w-full h-36 rounded-lg object-cover bg-muted"
                alt="Cover"
              />
              <button
                type="button"
                onClick={() => setCoverUrl(null)}
                className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1"
                aria-label="Remove cover"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ImagePlus className="w-4 h-4 mr-2" />
              )}
              Add cover photo
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleCover(e.target.files)}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            onClick={handleCreate}
            disabled={createEvent.isPending || uploading || !title.trim() || !startsAt}
          >
            {createEvent.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Create event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EventCard({ event }: { event: Event }) {
  const isPast = new Date(event.startsAt).getTime() < Date.now();
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <Link href={`/events/${event.id}`}>
        <div className="cursor-pointer">
          {event.coverUrl ? (
            <img
              src={event.coverUrl}
              className="w-full h-36 object-cover bg-muted"
              alt={event.title}
            />
          ) : (
            <div className="w-full h-24 bg-gradient-to-r from-red-400 to-rose-600 flex items-center justify-center">
              <CalendarDays className="w-10 h-10 text-white/80" />
            </div>
          )}
        </div>
      </Link>
      <div className="p-4 space-y-2">
        <p className={`text-sm font-semibold ${isPast ? "text-muted-foreground" : "text-primary"}`}>
          {formatEventTime(event)}
          {isPast && " · Past"}
        </p>
        <Link href={`/events/${event.id}`}>
          <h3 className="font-bold text-lg leading-snug hover:underline cursor-pointer">
            {event.title}
          </h3>
        </Link>
        {event.location && (
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" /> {event.location}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          {event.goingCount} going · {event.interestedCount} interested
        </p>
        <RsvpButtons event={event} />
      </div>
    </div>
  );
}

export default function EventsPage() {
  const { data: events, isLoading } = useListEvents();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Events</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <CalendarDays className="w-4 h-4 mr-2" /> Create event
        </Button>
      </div>
      {isLoading ? (
        <div className="py-10 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !events || events.length === 0 ? (
        <div className="text-center py-14 bg-card border border-border rounded-xl text-muted-foreground">
          No events yet. Create the first one!
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {events.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      )}
      <CreateEventDialog open={createOpen} onOpenChange={setCreateOpen} />
    </MainLayout>
  );
}

function AttendeeList({ title, people }: { title: string; people: Profile[] }) {
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-4">
      <h2 className="font-bold mb-3">
        {title} ({people.length})
      </h2>
      {people.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nobody yet.</p>
      ) : (
        <div className="space-y-2">
          {people.map((p) => (
            <Link key={p.id} href={`/profile/${p.id}`}>
              <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors cursor-pointer">
                <img
                  src={avatarSrc(p.avatarUrl)}
                  className="w-8 h-8 rounded-full object-cover bg-muted"
                  alt=""
                />
                <span className="text-sm font-medium">{p.displayName}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const eventId = Number(id);
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const deleteEvent = useDeleteEvent();

  const { data, isLoading } = useGetEvent(eventId, {
    query: {
      enabled: Number.isFinite(eventId),
      queryKey: getGetEventQueryKey(eventId),
    },
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="py-10 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!data) {
    return (
      <MainLayout>
        <div className="py-10 text-center text-muted-foreground">
          Event not found
        </div>
      </MainLayout>
    );
  }

  const { event, going, interested } = data;
  const isHost = user?.id === event.host.id;

  const handleDelete = () => {
    deleteEvent.mutate(
      { eventId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
          navigate("/events");
        },
      },
    );
  };

  return (
    <MainLayout>
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden mb-4">
        {event.coverUrl ? (
          <img
            src={event.coverUrl}
            className="w-full max-h-72 object-cover bg-muted"
            alt={event.title}
          />
        ) : (
          <div className="w-full h-32 bg-gradient-to-r from-red-400 to-rose-600 flex items-center justify-center">
            <CalendarDays className="w-12 h-12 text-white/80" />
          </div>
        )}
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Link href="/events">
                  <span className="text-muted-foreground hover:text-foreground cursor-pointer">
                    <ArrowLeft className="w-5 h-5" />
                  </span>
                </Link>
                <p className="text-sm font-semibold text-primary">
                  {formatEventTime(event)}
                </p>
              </div>
              <h1 className="text-2xl font-bold">{event.title}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Hosted by{" "}
                <Link href={`/profile/${event.host.id}`}>
                  <span className="hover:underline cursor-pointer font-medium text-foreground">
                    {event.host.displayName}
                  </span>
                </Link>
              </p>
              {event.location && (
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" /> {event.location}
                </p>
              )}
            </div>
            {isHost && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive shrink-0"
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this event?</AlertDialogTitle>
                    <AlertDialogDescription>
                      "{event.title}" and all RSVPs will be removed. This can't
                      be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          <RsvpButtons event={event} />
          {event.description && (
            <p className="text-[15px] whitespace-pre-wrap border-t border-border pt-3">
              {event.description}
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AttendeeList title="Going" people={going} />
        <AttendeeList title="Interested" people={interested} />
      </div>
    </MainLayout>
  );
}
