import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { RealtimeProvider } from "@/lib/realtime";
import { CallProvider } from "@/components/call-provider";
import NotFound from "@/pages/not-found";

import AuthPage from "@/pages/auth";
import HomePage from "@/pages/home";
import PostPage from "@/pages/post";
import ProfilePage from "@/pages/profile";
import FriendsPage from "@/pages/friends";
import MessagesPage from "@/pages/messages";
import ReelsPage from "@/pages/reels";
import GroupsPage from "@/pages/groups";
import PagesView from "@/pages/pages";
import NotificationsPage from "@/pages/notifications";
import SearchPage from "@/pages/search";
import SettingsPage from "@/pages/settings";
import SettingsAccountPage from "@/pages/settings-account";
import SettingsPrivacyPage from "@/pages/settings-privacy";
import SettingsSecurityPage from "@/pages/settings-security";
import SettingsNotificationsPage from "@/pages/settings-notifications";
import SettingsLanguagePage from "@/pages/settings-language";
import SettingsHelpPage from "@/pages/settings-help";
import EditProfilePage from "@/pages/edit-profile";
import MePage from "@/pages/me";
import EarningsPage from "@/pages/earnings";
import StoriesPage from "@/pages/stories";
import MemoriesPage from "@/pages/memories";
import SavedPage from "@/pages/saved";
import AlbumPage from "@/pages/album";
import EventsPage, { EventDetailPage } from "@/pages/events";
import LivePage, { LiveStreamPage } from "@/pages/live";
import WatchPage from "@/pages/watch";
import MarketplacePage, {
  MarketplaceListingPage,
  MarketplaceCreatePage,
  MarketplaceSellingPage,
} from "@/pages/marketplace";

const queryClient = new QueryClient();

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background text-primary">
        <div className="text-center animate-pulse">
          <h1 className="text-4xl font-extrabold tracking-tight">HiMewo</h1>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/post/:id" component={PostPage} />
      <Route path="/profile/:id" component={ProfilePage} />
      <Route path="/me" component={MePage} />
      <Route path="/edit-profile" component={EditProfilePage} />
      <Route path="/friends" component={FriendsPage} />
      <Route path="/messages" component={MessagesPage} />
      <Route path="/messages/:id" component={MessagesPage} />
      
      <Route path="/reels" component={ReelsPage} />
      <Route path="/reels/:id" component={ReelsPage} />
      <Route path="/groups" component={GroupsPage} />
      <Route path="/groups/:id" component={GroupsPage} />
      <Route path="/pages" component={PagesView} />
      <Route path="/pages/:id" component={PagesView} />
      <Route path="/marketplace" component={MarketplacePage} />
      <Route path="/marketplace/selling" component={MarketplaceSellingPage} />
      <Route path="/marketplace/create" component={MarketplaceCreatePage} />
      <Route path="/marketplace/:id" component={MarketplaceListingPage} />
      <Route path="/notifications" component={NotificationsPage} />
      <Route path="/search" component={SearchPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/settings/account" component={SettingsAccountPage} />
      <Route path="/settings/privacy" component={SettingsPrivacyPage} />
      <Route path="/settings/security" component={SettingsSecurityPage} />
      <Route path="/settings/notifications" component={SettingsNotificationsPage} />
      <Route path="/settings/language" component={SettingsLanguagePage} />
      <Route path="/settings/help" component={SettingsHelpPage} />
      <Route path="/earnings" component={EarningsPage} />
      <Route path="/stories" component={StoriesPage} />
      <Route path="/memories" component={MemoriesPage} />
      <Route path="/saved" component={SavedPage} />
      <Route path="/albums/:id" component={AlbumPage} />
      <Route path="/events" component={EventsPage} />
      <Route path="/events/:id" component={EventDetailPage} />
      <Route path="/watch" component={WatchPage} />
      <Route path="/live" component={LivePage} />
      <Route path="/live/:id" component={LiveStreamPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RealtimeProvider>
          <CallProvider>
            <TooltipProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <AppRoutes />
              </WouterRouter>
              <Toaster />
            </TooltipProvider>
          </CallProvider>
        </RealtimeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
