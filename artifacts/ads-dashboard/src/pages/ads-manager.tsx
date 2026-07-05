import { useAccount } from "@/lib/account-context";
import { NoAccount } from "@/components/no-account";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CampaignsPanel } from "@/pages/campaigns";
import { AdSetsPanel } from "@/pages/ad-sets-all";
import { AdsPanel } from "@/pages/ads-all";
import { CreateAdWizard } from "@/components/create-wizard";

export default function AdsManagerPage() {
  const { selectedAccountId, selectedAccount } = useAccount();

  if (selectedAccountId == null) return <NoAccount />;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Ads Manager</h1>
          <p className="text-sm text-muted-foreground">{selectedAccount?.name}</p>
        </div>
        <CreateAdWizard />
      </div>
      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns" data-testid="tab-campaigns">
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="adsets" data-testid="tab-adsets">
            Ad Sets
          </TabsTrigger>
          <TabsTrigger value="ads" data-testid="tab-ads">
            Ads
          </TabsTrigger>
        </TabsList>
        <TabsContent value="campaigns" className="mt-4">
          <CampaignsPanel />
        </TabsContent>
        <TabsContent value="adsets" className="mt-4">
          <AdSetsPanel />
        </TabsContent>
        <TabsContent value="ads" className="mt-4">
          <AdsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
