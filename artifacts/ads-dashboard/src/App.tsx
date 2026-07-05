import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { AccountProvider } from "@/lib/account-context";
import { DashboardLayout } from "@/components/dashboard-layout";

import AuthPage from "@/pages/auth";
import NotFound from "@/pages/not-found";
import AccountsPage from "@/pages/accounts";
import CampaignsPage from "@/pages/campaigns";
import CampaignDetailPage from "@/pages/campaign-detail";
import AdSetDetailPage from "@/pages/adset-detail";
import AudiencesPage from "@/pages/audiences";
import CreativesPage from "@/pages/creatives";
import InsightsPage from "@/pages/insights";
import TeamPage from "@/pages/team";
import WalletPage from "@/pages/wallet";
import SettingsPage from "@/pages/settings";

const queryClient = new QueryClient();

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background text-primary">
        <div className="text-center animate-pulse">
          <h1 className="text-3xl font-extrabold tracking-tight">
            HiMewo Ads
          </h1>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <AccountProvider>
      <DashboardLayout>
        <Switch>
          <Route path="/" component={CampaignsPage} />
          <Route path="/accounts" component={AccountsPage} />
          <Route path="/campaigns" component={CampaignsPage} />
          <Route path="/campaigns/:campaignId" component={CampaignDetailPage} />
          <Route path="/adsets/:adSetId" component={AdSetDetailPage} />
          <Route path="/insights" component={InsightsPage} />
          <Route path="/audiences" component={AudiencesPage} />
          <Route path="/creatives" component={CreativesPage} />
          <Route path="/team" component={TeamPage} />
          <Route path="/wallet" component={WalletPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route component={NotFound} />
        </Switch>
      </DashboardLayout>
    </AccountProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppRoutes />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
