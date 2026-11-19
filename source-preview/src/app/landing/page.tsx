import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  BookOpen,
  CalendarDays,
  Camera,
  CircleQuestionMark,
  Clapperboard,
  GraduationCap,
  Lock,
  MessageCircleMore,
  Newspaper,
  Search,
  ShieldCheck,
  Trash,
  UserRound,
  Users,
} from "lucide-react";
import { signInWithGoogle } from "@/app/actions/auth";
import { GoogleButton } from "@/components/auth/google-button";
import { LogoMark, Wordmark } from "@/components/brand/logo";
import { PhoneMockup, RequestMockup, ResourcesMockup, ScheduleMockup } from "@/components/landing/mockups";
import { APP_TAGLINE, DEPARTMENTS } from "@/lib/config";
import { SEO_DESCRIPTION, SEO_TITLE, SITE_URL } from "@/lib/site";

const OG_ALT = "MGM Loop, the student network of MGM College of Engineering, Nanded";

export const metadata: Metadata = {
  title: { absolute: SEO_TITLE },
  description: SEO_DESCRIPTION,
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "MGM Loop",
    locale: "en_IN",
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: OG_ALT, type: "image/png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    images: [{ url: "/opengraph-image", alt: OG_ALT }],
  },
};

const FEATURES = [
  {
    icon: Newspaper,
    title: "A feed that knows your class",
    text: "Posts, photos and projects from your classmates, your department and the people you follow come first, with the freshest and most helpful posts on top.",
  },
  {
    icon: Clapperboard,
    title: "24-hour stories",
    text: "Share photos and short videos from fests, labs, hackathons and canteen breaks. Stories disappear after a day, and you can see who viewed yours.",
  },
  {
    icon: BookOpen,
    title: "Notes and past papers",
    text: "A shared library of notes, slides and question papers, tagged by subject and semester. Search it, download it, or save it for exam week.",
  },
  {
    icon: CircleQuestionMark,
    title: "Ask and answer doubts",
    text: "Stuck on a concept or an assignment? Post a question for your semester and get notified the moment a senior or batchmate answers.",
  },
  {
    icon: CalendarDays,
    title: "Department-wise schedule",
    text: "Class tests, labs, workshops, placement talks and fests for your department and year, with Going / Interested and one-tap add to calendar.",
  },
  {
    icon: MessageCircleMore,
    title: "Private messages, on your terms",
    text: "Message anyone on campus. A first message arrives as a request; the chat only starts once they accept.",
  },
  {
    icon: UserRound,
    title: "Your student profile",
    text: "Profile photo, cover, department, year and semester, plus your posts, followers, following, gallery and shared resources in one place.",
  },
  {
    icon: Search,
    title: "Find anyone on campus",
    text: "Search students by name, username or department, and see your classmates first. Search posts and notes the same way.",
  },
  {
    icon: Bell,
    title: "Live notifications",
    text: "Likes, comments, answers, new followers, mentions, message requests and new events in your schedule, the moment they happen.",
  },
];

const QUESTIONS = [
  {
    q: "Who can join MGM Loop?",
    a: "Students with a college Google account ending in @mgmcen.ac.in. Sign-in checks the address, and personal Gmail or other accounts are turned away.",
  },
  {
    q: "Is MGM Loop free?",
    a: "Yes. There is nothing to buy and no subscription.",
  },
  {
    q: "Can people outside the college see my profile or posts?",
    a: "No. Profiles, posts, stories, notes and events are only visible to signed-in MGM students. Search engines only see this introduction page.",
  },
  {
    q: "How do message requests work?",
    a: "When you message someone new, they get a request with your first message. You can't send another until they accept. If they delete the request, you aren't told, so nobody feels pressured to reply.",
  },
  {
    q: "What can I upload?",
    a: "Photos and short videos for posts and stories, and PDFs, Word, PowerPoint, Excel or ZIP files up to 25 MB for notes and resources.",
  },
  {
    q: "I picked the wrong department or year. Can I fix it?",
    a: "Yes. Open the menu on your profile picture and choose Edit class. Your feed, classmates and schedule update right away.",
  },
  {
    q: "Where do I find official college notices?",
    a: "Admissions, results and official circulars are published on the college website, mgmcen.ac.in. MGM Loop is where students share, ask and connect with each other.",
  },
];

const STEPS = [
  {
    icon: BadgeCheck,
    title: "Sign in with your college Google account",
    text: "One tap with your @mgmcen.ac.in address. No new password to remember.",
  },
  {
    icon: GraduationCap,
    title: "Pick your department, year and semester",
    text: "You'll see which classmates are already here before you even finish signing up.",
  },
  {
    icon: Camera,
    title: "Add a photo, follow your class, say hello",
    text: "A short guide points out search, your first post and your profile photo.",
  },
];

const SAFETY = [
  { icon: ShieldCheck, title: "College accounts only", text: "Every member signed in with a verified @mgmcen.ac.in Google account." },
  { icon: Lock, title: "Invisible to outsiders", text: "Everything inside MGM Loop needs a college sign-in. Nothing is public on the web." },
  { icon: MessageCircleMore, title: "Requests before chats", text: "Strangers get one message, as a request. You decide whether the conversation starts." },
  { icon: Trash, title: "You stay in control", text: "Delete your posts, comments, stories and events at any time, and archive notifications." },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "MGM Loop",
      url: `${SITE_URL}/`,
      description: SEO_DESCRIPTION,
      inLanguage: "en-IN",
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#app`,
      name: "MGM Loop",
      url: `${SITE_URL}/`,
      description: SEO_DESCRIPTION,
      applicationCategory: "SocialNetworkingApplication",
      operatingSystem: "Any (web browser)",
      browserRequirements: "Requires JavaScript and a modern web browser",
      isAccessibleForFree: true,
      inLanguage: "en-IN",
      isPartOf: { "@id": `${SITE_URL}/#website` },
      offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
      audience: {
        "@type": "EducationalAudience",
        educationalRole: "student",
        audienceType: "Students of MGM College of Engineering, Nanded",
      },
      featureList: FEATURES.map((f) => f.title),
    },
  ],
};

function JoinForm({ tone = "brand", label, className }: { tone?: "brand" | "card"; label?: string; className?: string }) {
  return (
    <form action={signInWithGoogle} className={className}>
      <input type="hidden" name="next" value="/" />
      <GoogleButton tone={tone} label={label} />
    </form>
  );
}

function SectionHeading({ id, eyebrow, title, text }: { id: string; eyebrow: string; title: string; text?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold text-primary">{eyebrow}</p>
      <h2 id={id} className="mt-2 text-[28px] font-semibold leading-tight tracking-tight sm:text-4xl">
        {title}
      </h2>
      {text && <p className="mt-3 text-[16px] leading-relaxed text-muted-foreground">{text}</p>}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-full focus:bg-card focus:px-4 focus:py-2 focus:shadow-pop"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label="MGM Loop home">
            <LogoMark size={32} />
            <Wordmark />
          </Link>
          <nav aria-label="Page sections" className="ml-8 hidden items-center gap-1 text-sm font-medium text-muted-foreground lg:flex">
            {[
              ["#features", "Features"],
              ["#how-it-works", "How it works"],
              ["#safety", "Safety"],
              ["#questions", "Questions"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="rounded-full px-3 py-2 transition hover:bg-secondary hover:text-foreground">
                {label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/login"
              className="hidden h-10 items-center rounded-full px-4 text-sm font-medium text-foreground/80 transition hover:bg-secondary sm:flex"
            >
              Sign in
            </Link>
            <form action={signInWithGoogle}>
              <input type="hidden" name="next" value="/" />
              <button
                type="submit"
                className="flex h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_8px_20px_-10px_hsl(var(--primary)/0.9)] transition hover:bg-primary/90"
              >
                Join free <ArrowRight className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main id="main">
        {/* Hero */}
        <section aria-labelledby="hero-title" className="relative overflow-hidden">
          <div className="pointer-events-none absolute -left-40 -top-48 size-[560px] rounded-full bg-[hsl(var(--brand-indigo)/0.14)] blur-3xl" />
          <div className="pointer-events-none absolute -right-40 top-24 size-[520px] rounded-full bg-[hsl(var(--brand-orchid)/0.12)] blur-3xl" />
          <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:pb-24 lg:pt-20 [&>*]:min-w-0">
            <div className="text-center lg:text-left">
              <p className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/80 px-3.5 py-1.5 text-[13px] font-medium text-foreground/80 shadow-soft">
                <span className="size-1.5 rounded-full bg-emerald-500" /> {APP_TAGLINE}
              </p>
              <h1 id="hero-title" className="mt-6 text-[38px] font-semibold leading-[1.06] tracking-tight sm:text-5xl lg:text-[56px]">
                The student network of <span className="text-gradient-brand">MGM College of Engineering</span>, Nanded
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-muted-foreground lg:mx-0">
                Share notes and past papers, ask doubts, follow your classmates and keep up with your department&apos;s
                tests, workshops and fests. One campus feed, made only for <span className="font-medium text-foreground">@mgmcen.ac.in</span>{" "}
                students.
              </p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <JoinForm label="Continue with Google" />
                <a
                  href="#features"
                  className="flex h-12 items-center gap-2 rounded-full px-5 text-[15px] font-medium text-foreground/80 transition hover:bg-secondary"
                >
                  See everything inside <ArrowRight className="size-4" />
                </a>
              </div>
              <ul className="mt-7 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[13px] text-muted-foreground lg:justify-start">
                <li className="flex items-center gap-1.5">
                  <BadgeCheck className="size-4 text-emerald-600" /> Free for every student
                </li>
                <li className="flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-emerald-600" /> College accounts only
                </li>
                <li className="flex items-center gap-1.5">
                  <Users className="size-4 text-emerald-600" /> Works on phone and laptop
                </li>
              </ul>
            </div>
            <PhoneMockup />
          </div>
        </section>

        {/* Features */}
        <section id="features" aria-labelledby="features-title" className="scroll-mt-20 border-t border-border/70 bg-card py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading
              id="features-title"
              eyebrow="Features"
              title="Everything your campus needs, in one place"
              text="MGM Loop replaces the scattered WhatsApp groups, lost PDFs and missed notices with one place for your class, your department and the whole college."
            />
            <ul className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <li key={title} className="rounded-3xl border border-border/70 bg-background p-6 transition hover:-translate-y-0.5 hover:shadow-card">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-4 text-[17px] font-semibold tracking-tight">{title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Spotlights */}
        <section aria-labelledby="spotlight-title" className="py-20 sm:py-24">
          <h2 id="spotlight-title" className="sr-only">
            A closer look
          </h2>
          <div className="mx-auto max-w-6xl space-y-20 px-4 sm:space-y-24 sm:px-6">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16 [&>*]:min-w-0">
              <div>
                <p className="text-sm font-semibold text-primary">Messages</p>
                <h3 className="mt-2 text-[26px] font-semibold leading-tight tracking-tight sm:text-3xl">Message requests that respect your inbox</h3>
                <p className="mt-3 text-[16px] leading-relaxed text-muted-foreground">
                  Anyone on campus can reach out to the person behind a great post, but only once. Their first message lands as a
                  request with a pop-up notification. Accept it and you can chat freely; delete it and they can&apos;t send more,
                  and they won&apos;t be told.
                </p>
                <ul className="mt-5 space-y-2 text-[15px]">
                  <li className="flex gap-2.5">
                    <BadgeCheck className="mt-0.5 size-5 shrink-0 text-primary" /> One message until you accept
                  </li>
                  <li className="flex gap-2.5">
                    <BadgeCheck className="mt-0.5 size-5 shrink-0 text-primary" /> Accept or delete right from the notification
                  </li>
                  <li className="flex gap-2.5">
                    <BadgeCheck className="mt-0.5 size-5 shrink-0 text-primary" /> Read receipts only inside accepted chats
                  </li>
                </ul>
              </div>
              <RequestMockup />
            </div>

            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16 [&>*]:min-w-0">
              <div className="lg:order-2">
                <p className="text-sm font-semibold text-primary">Events &amp; schedule</p>
                <h3 className="mt-2 text-[26px] font-semibold leading-tight tracking-tight sm:text-3xl">Your department&apos;s schedule, always up to date</h3>
                <p className="mt-3 text-[16px] leading-relaxed text-muted-foreground">
                  See what&apos;s coming up for your department and year: labs, class tests, workshops, placement talks and fests.
                  Campus-wide events show in every department&apos;s schedule, and new events for your class arrive as notifications.
                </p>
                <ul className="mt-5 space-y-2 text-[15px]">
                  <li className="flex gap-2.5">
                    <BadgeCheck className="mt-0.5 size-5 shrink-0 text-primary" /> Filter by department, year and type
                  </li>
                  <li className="flex gap-2.5">
                    <BadgeCheck className="mt-0.5 size-5 shrink-0 text-primary" /> Going / Interested, and see who else is going
                  </li>
                  <li className="flex gap-2.5">
                    <BadgeCheck className="mt-0.5 size-5 shrink-0 text-primary" /> Add any event to your phone&apos;s calendar
                  </li>
                </ul>
              </div>
              <ScheduleMockup />
            </div>

            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16 [&>*]:min-w-0">
              <div>
                <p className="text-sm font-semibold text-primary">Resources</p>
                <h3 className="mt-2 text-[26px] font-semibold leading-tight tracking-tight sm:text-3xl">Notes and papers, sorted by subject and semester</h3>
                <p className="mt-3 text-[16px] leading-relaxed text-muted-foreground">
                  Upload the notes that helped you and find the ones you need. Every file carries its subject and semester, so the
                  right PDF is a search away, and a bookmark keeps it ready for exam week.
                </p>
              </div>
              <ResourcesMockup />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-20 border-y border-border/70 bg-card py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading id="how-title" eyebrow="How it works" title="Get started in under a minute" />
            <ol className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
              {STEPS.map(({ icon: Icon, title, text }, i) => (
                <li key={title} className="relative rounded-3xl border border-border/70 bg-background p-6">
                  <span className="absolute right-5 top-5 text-4xl font-semibold text-foreground/[0.06]">{i + 1}</span>
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-4 text-[17px] font-semibold tracking-tight">{title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{text}</p>
                </li>
              ))}
            </ol>
            <div className="mt-10 flex justify-center">
              <JoinForm label="Sign in with your college account" />
            </div>
          </div>
        </section>

        {/* Departments */}
        <section aria-labelledby="departments-title" className="py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading
              id="departments-title"
              eyebrow="For every department"
              title="Built around your class"
              text="Your feed, suggestions and schedule start with your own department and year, then open up to the rest of campus."
            />
            <ul className="mx-auto mt-10 flex max-w-4xl flex-wrap justify-center gap-2.5">
              {DEPARTMENTS.map((d) => (
                <li key={d} className="rounded-full border border-border/70 bg-card px-4 py-2 text-[14px] font-medium shadow-soft">
                  {d}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Safety */}
        <section id="safety" aria-labelledby="safety-title" className="scroll-mt-20 border-t border-border/70 bg-card py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading
              id="safety-title"
              eyebrow="Safety"
              title="Private to MGM, safe by design"
              text="A campus network only works if everyone feels comfortable posting. These rules are built into MGM Loop, not left to settings."
            />
            <ul className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {SAFETY.map(({ icon: Icon, title, text }) => (
                <li key={title} className="rounded-3xl border border-border/70 bg-background p-6">
                  <Icon className="size-6 text-emerald-600" />
                  <h3 className="mt-4 text-[16px] font-semibold">{title}</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Questions */}
        <section id="questions" aria-labelledby="questions-title" className="scroll-mt-20 py-20 sm:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <SectionHeading id="questions-title" eyebrow="Questions" title="Questions students ask" />
            <div className="mt-10 divide-y divide-border/70 rounded-3xl border border-border/70 bg-card">
              {QUESTIONS.map(({ q, a }) => (
                <details key={q} className="group px-5 py-1 sm:px-6 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[16px] font-medium">
                    {q}
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-lg leading-none transition group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="pb-5 text-[15px] leading-relaxed text-muted-foreground">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final call to action */}
        <section aria-labelledby="cta-title" className="px-4 pb-20 sm:px-6">
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[32px] bg-[hsl(244_60%_22%)] px-6 py-14 text-center text-white sm:px-12 sm:py-16">
            <div className="pointer-events-none absolute -left-24 -top-24 size-80 rounded-full bg-[hsl(var(--brand-violet)/0.55)] blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 -right-20 size-80 rounded-full bg-[hsl(var(--brand-orchid)/0.45)] blur-3xl" />
            <div className="relative">
              <LogoMark size={48} className="mx-auto" />
              <h2 id="cta-title" className="mt-6 text-[28px] font-semibold leading-tight tracking-tight sm:text-4xl">
                Bring your whole campus into one loop
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-[16px] leading-relaxed text-white/75">
                Sign in with your @mgmcen.ac.in Google account, pick your class, and you&apos;re in.
              </p>
              <div className="mt-8 flex justify-center">
                <JoinForm tone="card" label="Continue with Google" className="w-full max-w-xs text-foreground" />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/70 bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <Link href="/" className="flex items-center gap-2.5" aria-label="MGM Loop home">
              <LogoMark size={28} />
              <Wordmark />
            </Link>
            <p className="mt-2 text-sm text-muted-foreground">{APP_TAGLINE} The student network for MGM College of Engineering, Nanded.</p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground">
              Features
            </a>
            <a href="#safety" className="hover:text-foreground">
              Safety
            </a>
            <a href="#questions" className="hover:text-foreground">
              Questions
            </a>
            <Link href="/login" className="hover:text-foreground">
              Sign in
            </Link>
            <a href="https://mgmcen.ac.in/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
              College website ↗
            </a>
          </nav>
        </div>
        <p className="border-t border-border/70 py-5 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} MGM Loop</p>
      </footer>
    </div>
  );
}
