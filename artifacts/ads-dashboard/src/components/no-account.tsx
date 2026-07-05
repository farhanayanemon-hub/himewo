import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function NoAccount() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-muted-foreground">
          Select or create an ad account first.
        </p>
        <Link href="/accounts">
          <Button>Go to accounts</Button>
        </Link>
      </CardContent>
    </Card>
  );
}
