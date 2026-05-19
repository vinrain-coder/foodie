"use client";

import Image from "next/image";
import Link from "next/link";

interface PremiumAuthLayoutClientProps {
  children: React.ReactNode;
  site: {
    name: string;
    logo: string;
    slogan: string;
    copyright: string;
  };
}

type SiteBranding = PremiumAuthLayoutClientProps["site"];

const showcaseStats = [
  { value: "50k+", label: "Active Customers" },
  { value: "4.8", label: "Average Rating" },
  { value: "200+", label: "Top Brands" },
  { value: "24/7", label: "Support Team" },
];

const trustPoints = [
  "New member-only discounts every week",
  "Fast delivery and easy return support",
  // "Secure checkout with multiple payment options",
];

const footerLinks = [
  { href: "/page/conditions-of-use", label: "Conditions" },
  { href: "/page/privacy-policy", label: "Privacy" },
  { href: "/page/help", label: "Help" },
];

const trustItemClass =
  "auth-check-item flex items-center gap-3 rounded-xl border border-white/35 bg-white/55 px-4 py-2 text-[13px] text-zinc-800 backdrop-blur-md dark:border-white/15 dark:bg-white/8 dark:text-zinc-100 xl:py-2.5 xl:text-sm";
const statsCardClass =
  "auth-stats-card rounded-2xl border border-white/35 bg-white/60 px-4 py-2.5 backdrop-blur-md dark:border-white/15 dark:bg-white/8 xl:py-3";

function BrandLink({
  site,
  compact = false,
}: {
  site: SiteBranding;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <Link href="/" className="flex items-center gap-2.5">
        <Image
          src={site.logo}
          alt={`${site.name} logo`}
          width={36}
          height={36}
          priority
          className="rounded-md"
        />
        <span className="text-lg font-bold tracking-tight text-foreground">
          {site.name}
        </span>
      </Link>
    );
  }

  return (
    <Link href="/" className="flex w-fit items-center gap-2.5">
      <span className="auth-logo-shell flex h-13 w-13 items-center justify-center rounded-2xl border border-white/45 bg-white/75 shadow-[0_6px_24px_rgba(0,0,0,.1)] backdrop-blur dark:border-white/20 dark:bg-white/10">
        <Image
          src={site.logo}
          alt={`${site.name} logo`}
          width={40}
          height={40}
          priority
        />
      </span>
      <span className="bg-linear-to-r from-zinc-900 to-zinc-700 bg-clip-text text-3xl font-bold tracking-tight text-transparent dark:from-zinc-50 dark:to-zinc-300">
        {site.name}
      </span>
    </Link>
  );
}

export default function PremiumAuthLayoutClient({
  children,
  site,
}: PremiumAuthLayoutClientProps) {
  const brandSlogan = site.slogan?.trim() || "Step Into Better Style";

  return (
    <div className="min-h-screen bg-background">
      <style>{animationsCSS}</style>

      <div className="hidden lg:flex lg:min-h-screen">
        <section
          aria-label="Brand showcase"
          className="relative lg:sticky lg:top-0 z-10 flex h-screen w-[54%] items-center overflow-hidden border-r border-border/50"
        >
          <div className="auth-showcase-surface absolute inset-0" />
          <div className="auth-showcase-grid absolute inset-0 opacity-55" />
          <div className="auth-orb-one absolute -left-28 top-16 h-88 w-88 rounded-full" />
          <div className="auth-orb-two absolute -right-20 bottom-8 h-80 w-[20rem] rounded-full" />

          <div className="auth-showcase-content relative z-10 mx-auto w-full max-w-2xl px-12 xl:px-16 mt-4">
            <div className="mb-7 flex items-center justify-between">
              <BrandLink site={site} />
              <span className="auth-badge-float rounded-full border border-white/30 bg-white/50 px-3 py-1 text-xs font-medium text-zinc-800 backdrop-blur dark:border-white/20 dark:bg-white/10 dark:text-zinc-100">
                Member perks included
              </span>
            </div>

            <div className="auth-showcase-main space-y-5">
              <div className="space-y-3">
                <p className="showcase-copy animate-copy-in text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:text-zinc-300">
                  Welcome to {site.name}
                </p>
                <h1 className="showcase-copy animate-copy-in text-[clamp(2rem,3.5vw,3.2rem)] font-semibold leading-[1.08] tracking-tight text-zinc-900 dark:text-zinc-100">
                  {brandSlogan}
                </h1>
                <p className="showcase-copy animate-copy-in max-w-xl text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 xl:text-base">
                  Join thousands of shoppers building their perfect wardrobe
                  with premium sneakers, streetwear picks, and curated drops
                  from {site.name}.
                </p>
              </div>

              <div className="space-y-2.5">
                {trustPoints.map((point, index) => (
                  <div
                    key={point}
                    className={trustItemClass}
                    style={{ animationDelay: `${index * 140 + 140}ms` }}
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:bg-emerald-400/20 dark:text-emerald-300">
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 20 20"
                        className="h-3.5 w-3.5"
                        fill="currentColor"
                      >
                        <path d="M16.704 5.29a1 1 0 010 1.415l-7.2 7.2a1 1 0 01-1.415 0l-3.2-3.2a1 1 0 111.415-1.415l2.493 2.492 6.493-6.492a1 1 0 011.414 0z" />
                      </svg>
                    </span>
                    <span>{point}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-0.5 xl:gap-3.5 xl:pt-1">
                {showcaseStats.map((item, index) => (
                  <div
                    key={item.label}
                    className={statsCardClass}
                    style={{ animationDelay: `${index * 120 + 280}ms` }}
                  >
                    <p className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 xl:text-2xl">
                      {item.value}
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="auth-brand-strip rounded-2xl border border-white/45 bg-white/70 px-4 py-3 text-sm backdrop-blur-md dark:border-white/15 dark:bg-white/8 xl:px-5 xl:py-3.5">
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {site.name} Official Member Portal
                </p>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                  Sign in once and sync your orders, rewards, and saved styles.
                </p>
              </div>

              <div className="auth-testimonial rounded-2xl border border-white/35 bg-white/65 px-4 py-3 text-sm text-zinc-700 shadow-[0_10px_40px_rgba(0,0,0,.08)] backdrop-blur-md dark:border-white/15 dark:bg-white/10 dark:text-zinc-200 xl:px-5 xl:py-4">
                <p className="italic">
                  &quot;I found my go-to sneakers in under ten minutes and
                  delivery was right on time.&quot;
                </p>
                <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                  Verified customer
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          className="flex w-[46%] items-center justify-center px-6 py-12"
          aria-label="Authentication form"
        >
          <div className="w-full max-w-md">{children}</div>
        </section>
      </div>

      <div className="lg:hidden">
        <div className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-md items-center justify-between px-5 py-4">
            <BrandLink site={site} compact />
          </div>
        </div>

        <div className="mx-auto max-w-md px-5 pb-24 pt-10">
          <div className="mb-8 space-y-2">
            <h1 className="text-3xl font-bold tracking-tight font-serif">
              Welcome back
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Sign in to your {site.name} account and continue shopping.
            </p>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
              {brandSlogan}
            </p>
          </div>
          {children}
        </div>

        <div className="border-t border-border/60 bg-muted/40 py-5">
          <div className="mx-auto flex max-w-md items-center justify-center gap-5 px-5 text-xs text-muted-foreground">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-foreground hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <p className="mx-auto mt-1.5 max-w-md px-5 text-center text-[11px] text-muted-foreground/70">
            {site.copyright}
          </p>
        </div>
      </div>
    </div>
  );
}

const animationsCSS = `
  @keyframes drift-a {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50% { transform: translate(12px, -16px) scale(1.06); }
  }
  @keyframes drift-b {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50% { transform: translate(-16px, 14px) scale(0.96); }
  }
  @keyframes rise-in {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse-badge {
    0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.2); }
    50% { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); }
  }

  .auth-showcase-surface {
    background:
      radial-gradient(circle at 18% 18%, rgba(245, 158, 11, 0.24), transparent 44%),
      radial-gradient(circle at 82% 80%, rgba(16, 185, 129, 0.18), transparent 45%),
      linear-gradient(160deg, rgba(255, 255, 255, 0.96) 0%, rgba(248, 250, 252, 0.98) 70%, rgba(241, 245, 249, 0.98) 100%);
  }
  .dark .auth-showcase-surface {
    background:
      radial-gradient(circle at 18% 18%, rgba(245, 158, 11, 0.16), transparent 44%),
      radial-gradient(circle at 82% 80%, rgba(16, 185, 129, 0.11), transparent 45%),
      linear-gradient(160deg, rgba(24, 24, 27, 0.98) 0%, rgba(17, 24, 39, 0.98) 78%, rgba(12, 10, 9, 0.98) 100%);
  }

  .auth-showcase-grid {
    background-image:
      linear-gradient(rgba(15, 23, 42, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(15, 23, 42, 0.05) 1px, transparent 1px);
    background-size: 44px 44px;
  }
  .dark .auth-showcase-grid {
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  }

  .auth-orb-one {
    background: radial-gradient(circle, rgba(245, 158, 11, 0.42), rgba(245, 158, 11, 0));
    filter: blur(36px);
    animation: drift-a 15s ease-in-out infinite;
    pointer-events: none;
  }
  .auth-orb-two {
    background: radial-gradient(circle, rgba(16, 185, 129, 0.28), rgba(16, 185, 129, 0));
    filter: blur(42px);
    animation: drift-b 19s ease-in-out infinite;
    pointer-events: none;
  }

  .animate-copy-in,
  .auth-check-item,
  .auth-stats-card {
    animation: rise-in 0.6s ease-out both;
  }

  .showcase-copy:nth-of-type(1) { animation-delay: 70ms; }
  .showcase-copy:nth-of-type(2) { animation-delay: 170ms; }

  .auth-stats-card {
    transition: transform 220ms ease, box-shadow 220ms ease;
    box-shadow: 0 6px 22px rgba(15, 23, 42, 0.06);
  }
  .auth-stats-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
  }

  .auth-badge-float {
    animation: pulse-badge 2.6s ease-in-out infinite;
  }
  .auth-brand-watermark {
    animation: rise-in 0.9s ease-out both;
    width: 9rem;
  }
  .auth-brand-slogan {
    line-height: 1.35;
  }
  .auth-logo-shell {
    transition: transform 200ms ease, box-shadow 200ms ease;
  }
  .auth-logo-shell:hover {
    transform: translateY(-1px) scale(1.01);
    box-shadow: 0 12px 30px rgba(15, 23, 42, 0.16);
  }
  .auth-brand-strip {
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.07);
  }
  .auth-showcase-content {
    min-height: 100vh;
    padding-top: 1.75rem;
    padding-bottom: 1.75rem;
  }

  @media (max-height: 920px) {
    .auth-showcase-content {
      padding-top: 1.2rem;
      padding-bottom: 1.2rem;
    }
    .auth-showcase-main {
      gap: 0.85rem;
    }
    .auth-brand-watermark {
      width: 7.5rem;
      right: 1.35rem;
      top: 0.8rem;
    }
  }

  @media (max-height: 820px) {
    .auth-showcase-content {
      padding-top: 0.8rem;
      padding-bottom: 0.8rem;
    }
    .auth-showcase-main {
      gap: 0.6rem;
    }
    .auth-testimonial {
      display: none;
    }
    .auth-brand-watermark {
      width: 6.5rem;
      top: 0.5rem;
    }
  }

  .btn-primary-cta {
    background: linear-gradient(135deg, oklch(0.7858 0.1598 85.3091), oklch(0.7467 0.1581 68.4475));
    box-shadow: 0 4px 28px rgba(166,125,0,0.22), 0 1px 2px rgba(0,0,0,0.08);
    border: none;
    color: oklch(0.227 0.015 91.80);
    font-weight: 600;
  }
  .btn-primary-cta:hover {
    background: linear-gradient(135deg, oklch(0.801 0.162 88.31), oklch(0.763 0.161 70.64));
    box-shadow: 0 8px 36px rgba(166,125,0,0.28);
    transform: translateY(-1px);
  }
  .btn-primary-cta:active {
    box-shadow: 0 2px 12px rgba(166,125,0,0.18);
    transform: translateY(0);
  }
  .btn-primary-cta:disabled {
    opacity: 0.58;
    cursor: not-allowed;
    transform: none;
  }
`;
