import { SettingsShell, SettingsCard } from "@/components/settings/settings-shell";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = [
  {
    q: "How do I change my password?",
    a: "Go to Settings → Password & security, where you can set a new password.",
  },
  {
    q: "Who can see my posts?",
    a: "In Settings → Privacy, control your audience from the 'Who can see your posts' option.",
  },
  {
    q: "How do I turn off notifications?",
    a: "Go to Settings → Notifications and switch off any notifications you don't want.",
  },
  {
    q: "Where do I edit my profile?",
    a: "Go to Settings → Account Center and click 'Edit profile'.",
  },
];

export default function SettingsHelpPage() {
  return (
    <SettingsShell
      title="Help & support"
      description="Answers to common questions"
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
          <p className="font-medium">Need more help?</p>
          <p className="text-sm text-muted-foreground mt-1">
            Get in touch with the HiMewo support team:{" "}
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
