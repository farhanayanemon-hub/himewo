import { MainLayout } from "@/components/layout/main-layout";
import {
  useListNotifications,
  useMarkAllNotificationsRead,
  getListNotificationsQueryKey,
  getGetUnreadNotificationCountQueryKey,
} from "@workspace/api-client-react";
import { Loader2, Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

export default function NotificationsPage() {
  const { data: notifications, isLoading } = useListNotifications();
  const markAllRead = useMarkAllNotificationsRead();
  const queryClient = useQueryClient();

  const handleMarkAllRead = () => {
    markAllRead.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetUnreadNotificationCountQueryKey() });
      }
    });
  };

  return (
    <MainLayout>
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm animate-in fade-in">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" /> Notifications
          </h1>
          <Button variant="ghost" size="sm" onClick={handleMarkAllRead} disabled={markAllRead.isPending}>
            <Check className="w-4 h-4 mr-2" /> Mark all as read
          </Button>
        </div>

        <div className="space-y-2">
          {isLoading ? (
            <div className="py-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : notifications?.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">You're all caught up!</div>
          ) : (
            notifications?.map(notif => (
              <div 
                key={notif.id} 
                className={`flex gap-4 p-4 rounded-xl border ${notif.isRead ? 'border-transparent bg-transparent' : 'border-primary/20 bg-primary/5'} hover:bg-muted/50 transition-colors`}
              >
                <div className="w-12 h-12 rounded-full bg-muted shrink-0 overflow-hidden relative">
                  {notif.actor?.avatarUrl && (
                    <img src={notif.actor.avatarUrl} className="w-full h-full object-cover" alt="" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px]">
                    <span className="font-semibold">{notif.actor?.displayName}</span>
                    {" "}
                    {notif.type === 'reaction' && "reacted to your post."}
                    {notif.type === 'comment' && "commented on your post."}
                    {notif.type === 'friend_request' && "sent you a friend request."}
                    {notif.type === 'friend_accept' && "accepted your friend request."}
                    {!['reaction', 'comment', 'friend_request', 'friend_accept'].includes(notif.type) && "interacted with you."}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(notif.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {!notif.isRead && <div className="w-3 h-3 rounded-full bg-primary self-center" />}
              </div>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
}