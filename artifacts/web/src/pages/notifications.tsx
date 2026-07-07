import { MainLayout } from "@/components/layout/main-layout";
import { avatarSrc } from "@/lib/avatar";
import {
  useListNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  getListNotificationsQueryKey,
  getGetUnreadNotificationCountQueryKey,
  NotificationType,
  type Notification,
} from "@workspace/api-client-react";
import {
  Loader2,
  Bell,
  Check,
  Heart,
  MessageCircle,
  UserPlus,
  UserCheck,
  User,
  Mail,
  Users,
  AtSign,
  Share2,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { timeAgo } from "@/lib/format";

function notificationText(n: Notification): string {
  const actor = n.actor?.displayName ?? "Someone";
  switch (n.type) {
    case NotificationType.reaction:
      return `${actor} reacted to your post.`;
    case NotificationType.comment:
      return `${actor} commented on your post.`;
    case NotificationType.friend_request:
      return `${actor} sent you a friend request.`;
    case NotificationType.friend_accept:
      return `${actor} accepted your friend request.`;
    case NotificationType.follow:
      return `${actor} started following you.`;
    case NotificationType.message:
      return `${actor} sent you a message.`;
    case NotificationType.group_invite:
      return `${actor} invited you to a group.`;
    case NotificationType.page_follow:
      return `${actor} followed your page.`;
    case NotificationType.mention:
      if (n.entityType === "album") return `${actor} tagged you in a photo.`;
      return `${actor} mentioned you.`;
    case NotificationType.share:
      return `${actor} shared your post.`;
    case NotificationType.story_view:
      return `${actor} viewed your story.`;
    default:
      return `${actor} interacted with you.`;
  }
}

function NotificationIcon({ type }: { type: NotificationType }) {
  const cls = "w-4 h-4 text-white";
  switch (type) {
    case NotificationType.reaction:
      return <Heart className={cls} />;
    case NotificationType.comment:
      return <MessageCircle className={cls} />;
    case NotificationType.friend_request:
      return <UserPlus className={cls} />;
    case NotificationType.friend_accept:
      return <UserCheck className={cls} />;
    case NotificationType.follow:
    case NotificationType.page_follow:
      return <User className={cls} />;
    case NotificationType.message:
      return <Mail className={cls} />;
    case NotificationType.group_invite:
      return <Users className={cls} />;
    case NotificationType.mention:
      return <AtSign className={cls} />;
    case NotificationType.share:
      return <Share2 className={cls} />;
    case NotificationType.story_view:
      return <Eye className={cls} />;
    default:
      return <Bell className={cls} />;
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

export default function NotificationsPage() {
  const { data: notifications, isLoading } = useListNotifications();
  const markAllRead = useMarkAllNotificationsRead();
  const markRead = useMarkNotificationRead();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetUnreadNotificationCountQueryKey() });
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate(undefined, { onSuccess: invalidate });
  };

  const handleOpen = (n: Notification) => {
    if (!n.isRead) {
      markRead.mutate({ id: n.id }, { onSuccess: invalidate });
    }
    if (n.entityType === "post" && n.entityId != null) {
      navigate(`/post/${n.entityId}`);
    } else if (n.entityType === "album" && n.entityId != null) {
      navigate(`/albums/${n.entityId}`);
    } else if (n.type === NotificationType.message) {
      navigate("/messages");
    } else if (
      n.type === NotificationType.friend_request ||
      n.type === NotificationType.friend_accept
    ) {
      navigate(n.actor?.id ? `/profile/${n.actor.id}` : "/friends");
    } else if (n.actor?.id) {
      navigate(`/profile/${n.actor.id}`);
    }
  };

  const now = Date.now();
  const fresh = (notifications ?? []).filter(
    (n) => !n.isRead || now - new Date(n.createdAt).getTime() < DAY_MS,
  );
  const earlier = (notifications ?? []).filter(
    (n) => n.isRead && now - new Date(n.createdAt).getTime() >= DAY_MS,
  );

  const renderItem = (notif: Notification) => (
    <button
      key={notif.id}
      onClick={() => handleOpen(notif)}
      className={`w-full text-left flex gap-3 p-3 rounded-xl border transition-colors ${
        notif.isRead
          ? "border-transparent hover:bg-muted/50"
          : "border-primary/20 bg-primary/5 hover:bg-primary/10"
      }`}
    >
      <div className="relative shrink-0">
        <div className="w-14 h-14 rounded-full bg-muted overflow-hidden">
          {notif.actor?.avatarUrl && (
            <img src={avatarSrc(notif.actor.avatarUrl)} className="w-full h-full object-cover" alt="" />
          )}
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-primary flex items-center justify-center border-2 border-card">
          <NotificationIcon type={notif.type} />
        </div>
      </div>
      <div className="flex-1 min-w-0 self-center">
        <p className="text-[15px] leading-snug">{notificationText(notif)}</p>
        <p className={`text-xs mt-1 ${notif.isRead ? "text-muted-foreground" : "text-primary font-medium"}`}>
          {timeAgo(notif.createdAt)}
        </p>
      </div>
      {!notif.isRead && <div className="w-3 h-3 rounded-full bg-primary self-center shrink-0" />}
    </button>
  );

  return (
    <MainLayout>
      <div className="bg-card border border-border rounded-2xl p-4 card-depth animate-in fade-in">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-7 h-7 text-primary" /> Notifications
          </h1>
          <Button variant="ghost" size="sm" onClick={handleMarkAllRead} disabled={markAllRead.isPending}>
            <Check className="w-4 h-4 mr-2" /> Mark all as read
          </Button>
        </div>

        {isLoading ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (notifications?.length ?? 0) === 0 ? (
          <div className="py-12 text-center text-muted-foreground">You're all caught up!</div>
        ) : (
          <div className="space-y-6">
            {fresh.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-muted-foreground px-1 mb-1">New</h2>
                <div className="space-y-1">{fresh.map(renderItem)}</div>
              </div>
            )}
            {earlier.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-muted-foreground px-1 mb-1">Earlier</h2>
                <div className="space-y-1">{earlier.map(renderItem)}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
