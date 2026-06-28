import { SettingsShell, SettingsCard } from "@/components/settings/settings-shell";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = [
  {
    q: "Kivabe password change korbo?",
    a: "Settings → Password & security te jaan, sekhane notun password set korte parben.",
  },
  {
    q: "Ke amar post dekhte parbe?",
    a: "Settings → Privacy te 'Post ke dekhte parbe' option theke audience control korun.",
  },
  {
    q: "Notification bondho korbo kivabe?",
    a: "Settings → Notifications te giye je notification chan na seta off kore din.",
  },
  {
    q: "Profile edit korbo kothay?",
    a: "Settings → Account Center theke 'Edit profile' e click korun.",
  },
];

export default function SettingsHelpPage() {
  return (
    <SettingsShell
      title="Help & support"
      description="Common proshno r uttor"
    >
      <SettingsCard>
        <div className="px-5 py-2">
          <Accordion type="single" collapsible className="w-full">
            {FAQ.map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </SettingsCard>

      <SettingsCard>
        <div className="px-5 py-4">
          <p className="font-medium">Aro help dorkar?</p>
          <p className="text-sm text-muted-foreground mt-1">
            HiMewo support team er sathe jogajog korun:{" "}
            <a
              href="mailto:support@himewo.app"
              className="text-primary hover:underline"
            >
              support@himewo.app
            </a>
          </p>
        </div>
      </SettingsCard>
    </SettingsShell>
  );
}
