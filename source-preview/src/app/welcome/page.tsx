import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingFlow, type OnboardingStep } from "@/components/onboarding/onboarding-flow";
import { MeProvider } from "@/components/providers/me-provider";
import { requireProfile } from "@/lib/session";

export const metadata: Metadata = { title: "Welcome", robots: { index: false, follow: false } };

const STEPS: OnboardingStep[] = ["details", "photo", "follow"];

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const me = await requireProfile();
  const { step } = await searchParams;
  const requested = STEPS.find((s) => s === step);

  // Finished students only come back here mid-flow (photo / classmates steps).
  if (me.onboarded && (!requested || requested === "details")) redirect("/");

  return (
    <MeProvider initial={me}>
      <OnboardingFlow initialStep={me.onboarded && requested ? requested : "details"} />
    </MeProvider>
  );
}
