import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function NoAccount() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-muted-foreground">
          Prothome ekta ad account select ba toiri korun.
        </p>
        <Link href="/accounts">
          <Button>Go to accounts</Button>
        </Link>
      </CardContent>
    </Card>
  );
}
