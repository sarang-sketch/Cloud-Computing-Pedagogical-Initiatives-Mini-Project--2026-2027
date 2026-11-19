import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen, CalendarDays, CircleAlert, Clapperboard, MessageCircleMore, ShieldCheck } from "lucide-react";
import { signInWithGoogle } from "@/app/actions/auth";
import { GoogleButton } from "@/components/auth/google-button";
import { LogoMark, Wordmark } from "@/components/brand/logo";
import { APP_TAGLINE, COLLEGE_DOMAIN, COLLEGE_NAME } from "@/lib/config";
import { safeNextPath } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Sign in",
  // The landing page at "/" is the page to index; the sign-in screen is a utility.
  robots: { index: false, follow: true },
  alternates: { canonical: "/login" },
};

const ERRORS: Record<string, string> = {
  domain: `MGM Loop is only for @${COLLEGE_DOMAIN} accounts. Sign in with your college Google account.`,
  oauth_failed: "Google sign-in was cancelled or didn't finish. Please try again.",
  oauth_start: "We couldn't reach Google sign-in. Please try again.",
  missing_verifier: "Your sign-in attempt expired. Please try again.",
  exchange_failed: "We couldn't complete sign-in. Please try again.",
  profile_failed: "We couldn't set up your profile. Please try again.",
  session: "Your session ended. Please sign in again.",
};

const FEATURES = [
  { icon: BookOpen, title: "Notes & papers", text: "A shared library of notes, slides and question papers." },
  { icon: CalendarDays, title: "Department schedule", text: "Class tests, workshops and fests for your class." },
  { icon: Clapperboard, title: "Campus stories", text: "Moments from fests, labs and hackathons, gone in 24 hours." },
  { icon: MessageCircleMore, title: "Message requests", text: "Chat with anyone on campus once they accept." },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await searchParams;
  const message = error ? ERRORS[error] ?? ERRORS.exchange_failed : null;

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background">
      <div className="pointer-events-none absolute -left-40 -top-40 size-[520px] rounded-full bg-[hsl(var(--brand-indigo)/0.12)] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -right-40 size-[560px] rounded-full bg-[hsl(var(--brand-orchid)/0.12)] blur-3xl" />

      <div className="relative mx-auto grid min-h-dvh max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:px-8">
        <section className="hidden lg:block">
          <div className="flex items-center gap-3">
            <LogoMark size={44} />
            <Wordmark className="text-2xl" />
          </div>
          <h1 className="mt-10 max-w-lg text-[44px] font-semibold leading-[1.08] tracking-tight">
            {APP_TAGLINE.split(" ").map((word, i) => (
              <span key={word} className={i === 2 ? "text-gradient-brand" : undefined}>
                {word}{" "}
              </span>
            ))}
          </h1>
          <p className="mt-4 max-w-md text-[17px] leading-relaxed text-muted-foreground">
            The social learning network built for the students of {COLLEGE_NAME}.
          </p>
          <ul className="mt-10 grid max-w-xl grid-cols-2 gap-4">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-soft backdrop-blur">
                <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Icon className="size-5" />
                </span>
                <p className="mt-3 text-sm font-semibold">{title}</p>
                <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto w-full max-w-[420px]">
          <div className="rounded-[28px] border border-border/70 bg-card p-7 shadow-pop sm:p-9">
            <div className="flex flex-col items-center text-center">
              <LogoMark size={52} />
              <h2 className="mt-5 text-2xl font-semibold tracking-tight">Welcome to MGM Loop</h2>
              <p className="mt-1.5 text-[15px] text-muted-foreground">{APP_TAGLINE}</p>
            </div>

            {message && (
              <div role="alert" className="mt-6 flex gap-2.5 rounded-2xl border border-destructive/20 bg-destructive/5 p-3.5 text-[13px] leading-snug text-destructive">
                <CircleAlert className="mt-px size-4 shrink-0" />
                <span>{message}</span>
              </div>
            )}

            <form action={signInWithGoogle} className="mt-7">
              <input type="hidden" name="next" value={safeNextPath(next)} />
              <GoogleButton />
            </form>

            <div className="mt-6 flex items-start gap-2.5 rounded-2xl bg-secondary/70 p-3.5 text-[13px] leading-snug text-muted-foreground">
              <ShieldCheck className="mt-px size-4 shrink-0 text-emerald-600" />
              <span>
                Only verified <span className="font-medium text-foreground">@{COLLEGE_DOMAIN}</span> Google accounts can join. Your
                profile is visible to MGM students only.
              </span>
            </div>
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground lg:hidden">
            The social learning network for {COLLEGE_NAME}.
          </p>
          <p className="mt-4 text-center">
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4" /> See what&apos;s inside MGM Loop
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
