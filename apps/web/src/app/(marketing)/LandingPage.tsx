import Link from "next/link";

const STEPS = [
  { n: "1", title: "Strategize", desc: "Tell it your brand. It builds positioning, personas, and a 30/60/90 day plan." },
  { n: "2", title: "Create", desc: "Generates on-brand posts, scripts, images, and short-form video — grounded in your brand, never invented." },
  { n: "3", title: "Publish", desc: "Pushes finished content straight to Facebook, Instagram, LinkedIn, and X — no manual copy-pasting." },
  { n: "4", title: "Capture", desc: "Landing pages and lead forms feed straight into a built-in CRM." },
  { n: "5", title: "Improve", desc: "Tracks what's working and recommends the next move." },
];

const FEATURES = [
  { title: "AI Marketing Agent", desc: "A standing strategist that knows your brand and keeps recommending the next move." },
  { title: "Content Studio", desc: "On-brand post copy for every channel, generated in seconds." },
  { title: "Creative & Video Studio", desc: "AI-scripted, AI-voiced, AI-shot short-form videos — ready to publish." },
  { title: "Campaign Manager", desc: "Plan and schedule campaigns across every connected channel from one calendar." },
  { title: "Leads & CRM", desc: "Every lead your landing pages capture lands in one pipeline, automatically." },
  { title: "Landing Pages", desc: "Spin up conversion-ready pages without writing a line of code." },
  { title: "Automation Rules", desc: "Set the triggers once; GrowthPilot handles the follow-through." },
  { title: "Analytics & Recommendations", desc: "See what's working across every channel, and what to do about it." },
];

const PLATFORMS = ["Facebook", "Instagram", "LinkedIn", "X"];

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
        <nav className="hidden items-center gap-8 text-sm font-medium text-[var(--color-text-muted)] md:flex">
          <a href="#how-it-works" className="hover:text-[var(--color-text)]">
            How it works
          </a>
          <a href="#features" className="hover:text-[var(--color-text)]">
            Features
          </a>
          <a href="#channels" className="hover:text-[var(--color-text)]">
            Channels
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="gp-btn-ghost">
            Log in
          </Link>
          <Link href="/signup" className="gp-btn-primary">
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 text-center md:pt-24">
      <p className="gp-section-label mx-auto mb-5 inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1">
        Strategy, content, and publishing — one AI pipeline
      </p>
      <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight text-[var(--color-text)] md:text-6xl">
        Give GrowthPilot AI your brand.
        <br />
        It runs the marketing.
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg text-[var(--color-text-muted)]">
        It builds your strategy, writes and designs your content, produces short-form video, and
        publishes everywhere your audience is — without a human driving each step.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link href="/signup" className="gp-btn-primary px-6 py-3 text-base">
          Start free
        </Link>
        <Link href="/login" className="gp-btn-secondary px-6 py-3 text-base">
          Log in
        </Link>
      </div>
      <p className="mt-4 text-xs text-[var(--color-text-faint)]">No credit card required to get started.</p>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="border-y border-[var(--color-border)] bg-[var(--color-surface-alt)] py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-[var(--color-secondary)]">
          The loop
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-2xl font-semibold tracking-tight text-[var(--color-text)] md:text-3xl">
          One brand brief in. A running marketing operation out.
        </p>
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((step) => (
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

function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-20">
      <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-[var(--color-secondary)]">
        Everything in one place
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-center text-2xl font-semibold tracking-tight text-[var(--color-text)] md:text-3xl">
        Not a chatbot bolted onto a dashboard. A full marketing stack.
      </p>
      <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="gp-card p-5">
            <h3 className="text-sm font-semibold text-[var(--color-text)]">{f.title}</h3>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Channels() {
  return (
    <section id="channels" className="border-y border-[var(--color-border)] bg-[var(--color-surface-alt)] py-16">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)] md:text-3xl">
          Publishes directly to your channels
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-[var(--color-text-muted)]">
          Connect your accounts once. GrowthPilot AI posts finished content straight to each one —
          no exporting, no manual uploads.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {PLATFORMS.map((p) => (
            <span key={p} className="gp-badge-neutral px-4 py-1.5 text-sm">
              {p}
            </span>
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
        Ready to put your marketing on autopilot?
      </h2>
      <p className="mt-3 text-[var(--color-text-muted)]">Set up your brand and generate your first campaign in minutes.</p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <Link href="/signup" className="gp-btn-primary px-6 py-3 text-base">
          Start free
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-[var(--color-text-faint)] sm:flex-row">
        <span>© {new Date().getFullYear()} GrowthPilot AI</span>
        <div className="flex items-center gap-5">
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
        <HowItWorks />
        <Features />
        <Channels />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
