import Link from "next/link";

const PROBLEMS = [
  "Strategy lives in a doc, content lives in another tool, and campaigns live in a third.",
  "Writing on-brand posts and scripts for every channel takes hours every week.",
  "Publishing to Facebook, Instagram, LinkedIn, and X means logging into each one separately.",
  "Leads from a landing page rarely make it into an organized follow-up pipeline.",
  "Nobody has time to review what's actually working across every channel.",
];

const WORKFLOW = [
  { n: "1", title: "Set up your workspace", desc: "Create your organization and invite your team with role-based permissions." },
  { n: "2", title: "Define your brand", desc: "Tell GrowthPilot your business, audience, and voice — it's the source of truth for everything generated." },
  { n: "3", title: "Build your strategy", desc: "Generate positioning, personas, messaging pillars, and a 30/60/90 day plan from your brand." },
  { n: "4", title: "Create content & campaigns", desc: "Draft on-brand posts in the Content Studio, or script and produce short-form video in the Creative & Video Studio." },
  { n: "5", title: "Launch, with your review", desc: "Publish finished posts and videos to your connected accounts, run ad campaigns, and send email — you stay in control of what goes out." },
  { n: "6", title: "Analyze and optimize", desc: "Review performance and recommendations across every channel in one place." },
];

const FEATURES = [
  { title: "Strategy & Research", desc: "AI-generated positioning, personas, messaging pillars, and a phased rollout plan built from your brand." },
  { title: "Brand Settings", desc: "One brand profile — business info, audience, voice — that grounds every piece of content GrowthPilot generates." },
  { title: "Content Studio", desc: "Draft and manage on-brand marketing copy for your channels with AI assistance." },
  { title: "Creative & Video Studio", desc: "Script, voice, and generate short-form marketing video and images, ready to publish." },
  { title: "Campaign Manager", desc: "Organize campaigns, objectives, and publish posts across your connected channels." },
  { title: "Social Account Management", desc: "Connect Facebook, Instagram, LinkedIn, and X, and publish directly from GrowthPilot." },
  { title: "Leads & CRM", desc: "Capture, track, and organize leads from your landing pages in one pipeline." },
  { title: "Landing Pages", desc: "Build conversion-focused landing pages without writing code." },
  { title: "AI Marketing Agent", desc: "A standing assistant you can hand marketing tasks to, scoped to your brand." },
  { title: "Email Marketing", desc: "Compose and send email campaigns to your audience." },
  { title: "Paid Advertising", desc: "Create and manage Google Ads campaigns from inside GrowthPilot." },
  { title: "Analytics & Recommendations", desc: "See performance across your connected channels and what to focus on next." },
  { title: "Team & Permissions", desc: "Invite teammates and control access with role-based permissions." },
];

const COMING_SOON = ["Campaign Calendar", "Automation Rules", "Integrations", "Usage & Billing"];

const AUDIENCES = [
  { title: "Small businesses", desc: "Run strategy, content, and publishing from one workspace instead of juggling separate tools." },
  { title: "Marketing agencies", desc: "Organize multiple brands under one organization, with role-based access for your team." },
  { title: "In-house marketing teams", desc: "Coordinate content, campaigns, and performance review without switching tools." },
  { title: "Founders & entrepreneurs", desc: "Go from a brand brief to a working marketing strategy without hiring a strategist." },
  { title: "Content & social teams", desc: "Produce on-brand posts and short-form video, then publish straight to your channels." },
];

const FAQ = [
  { q: "What is GrowthPilot AI?", a: "An AI-powered marketing workspace that brings strategy, content and video creation, campaign management, publishing, lead capture, and analytics into one place." },
  { q: "Does GrowthPilot post automatically, or do I review first?", a: "You stay in control. GrowthPilot drafts strategy, content, and video for your review — publishing to your connected accounts happens when you trigger it." },
  { q: "Which social platforms can I connect?", a: "Facebook, Instagram, LinkedIn, and X today, with publishing supported for each." },
  { q: "Can GrowthPilot generate video?", a: "Yes — the Creative & Video Studio scripts, voices, and generates short-form marketing video from your brand brief." },
  { q: "Can I run paid ads from GrowthPilot?", a: "Yes, Google Ads campaigns can be created and managed from the Paid Advertising module." },
  { q: "Can I manage leads here too?", a: "Yes — leads captured from your landing pages land in the built-in Leads & CRM pipeline." },
  { q: "Can I invite my team?", a: "Yes, Team & Permissions lets you invite teammates with role-based access." },
  { q: "What's not available yet?", a: "Campaign Calendar, Automation Rules, third-party Integrations, and self-serve Usage & Billing are still coming — everything else on this page is live today." },
  { q: "What does it cost?", a: "Pricing is still being finalized. Start free today and we'll let you know before anything changes." },
];

function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--color-primary)] text-sm font-bold text-[var(--color-primary-foreground)]">
            G
          </span>
          <span className="text-sm font-semibold tracking-tight text-[var(--color-text)]">GrowthPilot AI</span>
        </div>
        <nav className="hidden items-center gap-7 text-sm font-medium text-[var(--color-text-muted)] md:flex">
          <a href="#features" className="hover:text-[var(--color-text)]">
            Features
          </a>
          <a href="#how-it-works" className="hover:text-[var(--color-text)]">
            How it works
          </a>
          <a href="#audiences" className="hover:text-[var(--color-text)]">
            Who it's for
          </a>
          <a href="#faq" className="hover:text-[var(--color-text)]">
            FAQ
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="gp-btn-ghost">
            Log in
          </Link>
          <Link href="/signup" className="gp-btn-primary">
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-16 pt-16 text-center md:pt-24">
      <p className="gp-section-label mx-auto mb-5 inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1">
        AI-powered growth marketing workspace
      </p>
      <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight text-[var(--color-text)] md:text-6xl">
        Your entire marketing workflow.
        <br />
        Powered by AI.
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg text-[var(--color-text-muted)]">
        From marketing strategy and content creation to campaigns, creative production, leads, and
        publishing — GrowthPilot helps you manage growth from one intelligent workspace.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link href="/signup" className="gp-btn-primary px-6 py-3 text-base">
          Get started
        </Link>
        <a href="#features" className="gp-btn-secondary px-6 py-3 text-base">
          Explore the platform
        </a>
      </div>
      <p className="mt-4 text-xs text-[var(--color-text-faint)]">No credit card required to get started.</p>
    </section>
  );
}

function Problem() {
  return (
    <section className="border-y border-[var(--color-border)] bg-[var(--color-surface-alt)] py-16">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-[var(--color-secondary)]">
          Sound familiar?
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-2xl font-semibold tracking-tight text-[var(--color-text)] md:text-3xl">
          Marketing today is scattered across too many tools.
        </p>
        <ul className="mx-auto mt-8 flex max-w-2xl flex-col gap-3">
          {PROBLEMS.map((p) => (
            <li key={p} className="gp-card flex items-start gap-3 p-4 text-sm text-[var(--color-text-muted)]">
              <span className="mt-0.5 text-[var(--color-primary)]">—</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
        <p className="mx-auto mt-8 max-w-xl text-center text-[var(--color-text-muted)]">
          GrowthPilot brings strategy, creation, publishing, leads, and analytics into one
          connected workspace — so none of it falls through the cracks.
        </p>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-20">
      <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-[var(--color-secondary)]">
        Everything in one workspace
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-center text-2xl font-semibold tracking-tight text-[var(--color-text)] md:text-3xl">
        A connected marketing operations platform — not a chatbot bolted onto a dashboard.
      </p>
      <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="gp-card p-5">
            <h3 className="text-sm font-semibold text-[var(--color-text)]">{f.title}</h3>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">{f.desc}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        <span className="text-xs font-medium text-[var(--color-text-faint)]">Coming soon:</span>
        {COMING_SOON.map((c) => (
          <span key={c} className="gp-badge-neutral">
            {c}
          </span>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="border-y border-[var(--color-border)] bg-[var(--color-surface-alt)] py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-[var(--color-secondary)]">
          How GrowthPilot works
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-2xl font-semibold tracking-tight text-[var(--color-text)] md:text-3xl">
          Plan. Create. Launch. Analyze.
        </p>
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {WORKFLOW.map((step) => (
            <div key={step.n} className="gp-card flex flex-col gap-3 p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-sm font-semibold text-[var(--color-primary)]">
                {step.n}
              </span>
              <h3 className="text-sm font-semibold text-[var(--color-text)]">{step.title}</h3>
              <p className="text-sm text-[var(--color-text-muted)]">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Audiences() {
  return (
    <section id="audiences" className="mx-auto max-w-6xl px-6 py-20">
      <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-[var(--color-secondary)]">
        Who it's for
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-center text-2xl font-semibold tracking-tight text-[var(--color-text)] md:text-3xl">
        Built for anyone running marketing without a full team behind them.
      </p>
      <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {AUDIENCES.map((a) => (
          <div key={a.title} className="gp-card p-5">
            <h3 className="text-sm font-semibold text-[var(--color-text)]">{a.title}</h3>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">{a.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section id="faq" className="border-y border-[var(--color-border)] bg-[var(--color-surface-alt)] py-20">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-[var(--color-secondary)]">
          Frequently asked questions
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-2xl font-semibold tracking-tight text-[var(--color-text)] md:text-3xl">
          Still deciding?
        </p>
        <div className="mt-10 flex flex-col gap-3">
          {FAQ.map((item) => (
            <details key={item.q} className="gp-card group p-5">
              <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--color-text)] marker:content-none">
                {item.q}
              </summary>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-20 text-center">
      <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)] md:text-3xl">
        Bring your marketing together.
      </h2>
      <p className="mt-3 text-[var(--color-text-muted)]">
        Build your strategy, create better campaigns, and manage your marketing operations from one
        intelligent workspace.
      </p>
      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link href="/signup" className="gp-btn-primary px-6 py-3 text-base">
          Get started with GrowthPilot
        </Link>
        <a href="#features" className="gp-btn-secondary px-6 py-3 text-base">
          Explore features
        </a>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-[var(--color-text-faint)] sm:flex-row">
        <span>© {new Date().getFullYear()} GrowthPilot AI</span>
        <div className="flex flex-wrap items-center justify-center gap-5">
          <a href="#features" className="hover:text-[var(--color-text-muted)]">
            Features
          </a>
          <a href="#how-it-works" className="hover:text-[var(--color-text-muted)]">
            How it works
          </a>
          <a href="#faq" className="hover:text-[var(--color-text-muted)]">
            FAQ
          </a>
          <Link href="/login" className="hover:text-[var(--color-text-muted)]">
            Log in
          </Link>
          <Link href="/signup" className="hover:text-[var(--color-text-muted)]">
            Sign up
          </Link>
        </div>
      </div>
    </footer>
  );
}

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="flex-1">
        <Hero />
        <Problem />
        <Features />
        <HowItWorks />
        <Audiences />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
