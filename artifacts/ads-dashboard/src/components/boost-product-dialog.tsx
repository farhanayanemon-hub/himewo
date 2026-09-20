import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMyStall,
  useGetStallProducts,
  createAdCampaign,
  createAdCreative,
  createAdSet,
  createAd,
  getListAdCampaignsQueryKey,
  getGetMyStallQueryKey,
  getGetStallProductsQueryKey,
  type ShopProduct,
} from "@workspace/api-client-react";
import { useAccount } from "@/lib/account-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Rocket, Store, ShoppingBag, Loader2, CheckCircle2 } from "lucide-react";

export function BoostProductDialog() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { selectedAccountId } = useAccount();
  const accountId = selectedAccountId ?? 0;

  const [open, setOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null);
  const [isBoosting, setIsBoosting] = useState(false);
  const [budgetDollars, setBudgetDollars] = useState("5");

  const { data: stall, isLoading: stallLoading } = useGetMyStall({
    query: { enabled: open, queryKey: getGetMyStallQueryKey(), retry: false },
  });

  const stallId = stall?.id ?? 0;
  const { data: products, isLoading: productsLoading } = useGetStallProducts(
    stallId,
    undefined,
    {
      query: {
        enabled: open && stallId > 0,
        queryKey: getGetStallProductsQueryKey(stallId),
      },
    }
  );

  const productList = (products ?? []).filter((p) => p.active);

  const handleBoost = async () => {
    if (!selectedProduct || !accountId) return;
    setIsBoosting(true);
    try {
      const budgetCents = Math.max(100, Math.round(Number(budgetDollars || "5") * 100));

      // 1. Create Campaign
      const campaign = await createAdCampaign(accountId, {
        name: `Boost: ${selectedProduct.name}`,
        objective: "sales",
        status: "active",
        dailyBudgetCents: budgetCents,
      });

      // 2. Create Ad Creative
      const photo = selectedProduct.photos?.[0] || "";
      const creative = await createAdCreative(accountId, {
        name: `${selectedProduct.name} Creative`,
        format: "single_image",
        headline: selectedProduct.name,
        primaryText: selectedProduct.description || `Order ${selectedProduct.name} today on HiMewo!`,
        callToAction: "shop_now",
        linkUrl: `https://himewo.com/shop/product/${selectedProduct.id}`,
        mediaUrls: photo ? [photo] : [],
      });

      // 3. Create Ad Set
      const adSet = await createAdSet(campaign.id, {
        name: `${selectedProduct.name} Target Set`,
        optimizationGoal: "conversions",
        billingEvent: "impressions",
        dailyBudgetCents: budgetCents,
        status: "active",
        targeting: {
          locations: ["BD"],
          ageMin: 18,
          ageMax: 65,
        },
      });

      // 4. Create Ad
      await createAd(adSet.id, {
        name: `${selectedProduct.name} Ad`,
        creativeId: creative.id,
        destinationUrl: `https://himewo.com/shop/product/${selectedProduct.id}`,
        status: "active",
      });

      qc.invalidateQueries({ queryKey: getListAdCampaignsQueryKey(accountId) });

      toast({
        title: "Campaign Launched! 🚀",
        description: `Your product "${selectedProduct.name}" is now boosted with a $${(budgetCents / 100).toFixed(2)}/day ad campaign.`,
      });

      setOpen(false);
      setSelectedProduct(null);
    } catch (err: any) {
      toast({
        title: "Failed to boost product",
        description: err?.message || "Please check your ad balance or try again.",
        variant: "destructive",
      });
    } finally {
      setIsBoosting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-10 border-primary/30 text-primary hover:bg-primary/10 font-semibold gap-2">
          <Rocket className="w-4 h-4 text-primary" />
          Boost Stall Product
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" />
            Boost Stall Product with Ads
          </DialogTitle>
        </DialogHeader>

        {stallLoading || productsLoading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !stall ? (
          <div className="py-8 text-center space-y-3">
            <Store className="w-12 h-12 mx-auto text-muted-foreground/40" />
            <p className="font-semibold text-base">No Stall Found</p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              You haven't opened a shop stall yet. Switch to your Hub on HiMewo to open your stall and add products.
            </p>
          </div>
        ) : productList.length === 0 ? (
          <div className="py-8 text-center space-y-3">
            <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground/40" />
            <p className="font-semibold text-base">No Products in Stall</p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Your stall ({stall.name}) has no active products. Add products to your stall to boost them.
            </p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Select an item from your stall <strong className="text-foreground">{stall.name}</strong> to launch a 1-click sales ad campaign:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[280px] overflow-y-auto pr-1">
              {productList.map((product) => {
                const isSelected = selectedProduct?.id === product.id;
                const photo = product.photos?.[0];
                return (
                  <div
                    key={product.id}
                    onClick={() => setSelectedProduct(product)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex gap-3 items-center relative ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                        : "border-border hover:border-border/80 hover:bg-muted/40"
                    }`}
                  >
                    <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden shrink-0 border border-border">
                      {photo ? (
                        <img src={photo} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <ShoppingBag className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{product.name}</p>
                      <p className="text-xs text-primary font-bold">
                        ${(product.priceCents / 100 / 120).toFixed(2)} USD
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {product.stockQty} in stock
                      </p>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-5 h-5 text-primary absolute top-2 right-2" />
                    )}
                  </div>
                );
              })}
            </div>

            {selectedProduct && (
              <div className="bg-muted/30 border border-border p-4 rounded-2xl space-y-3 mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Daily Budget</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold">$</span>
                    <input
                      type="number"
                      min="1"
                      value={budgetDollars}
                      onChange={(e) => setBudgetDollars(e.target.value)}
                      className="w-16 h-8 px-2 text-right rounded-lg border border-border bg-background font-semibold text-sm"
                    />
                    <span className="text-xs text-muted-foreground">/ day</span>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Automated conversion campaign with <strong>Shop Now</strong> button.</p>
                  <p>• Target audience will be directed straight to your product checkout.</p>
                </div>

                <Button
                  onClick={handleBoost}
                  disabled={isBoosting}
                  className="w-full h-11 rounded-xl font-bold gap-2 text-base"
                >
                  {isBoosting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Launching Campaign...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-4 h-4" /> Boost "{selectedProduct.name}"
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
