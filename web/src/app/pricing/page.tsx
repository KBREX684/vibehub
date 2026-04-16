import { PricingCards } from "@/components/pricing-cards";

export default function PricingPage() {
  return (
    <>
      <main className="container">
        <section className="section" style={{ textAlign: "center" }}>
          <h1 style={{ marginBottom: 8 }}>Simple, transparent pricing</h1>
          <p className="muted">Free users get full community access. Pro unlocks more space, exposure, and developer tools.</p>
        </section>

        <PricingCards />

        <section className="section" style={{ maxWidth: 680, margin: "0 auto" }}>
          <h2>FAQ</h2>
          <div style={{ display: "grid", gap: 16 }}>
            {[
              { q: "Can I cancel anytime?", a: "Yes. After cancellation your Pro benefits continue until the end of the current billing cycle, then you automatically revert to Free." },
              { q: "What payment methods are accepted?", a: "The current checkout flow uses Stripe. China-local payment providers are being added through the v7 payment abstraction rollout rather than through a separate billing stack." },
              { q: "Do team members need to pay?", a: "No. Only the team creator needs a subscription. Members join for free." },
              { q: "What's included in Free?", a: "Everything a developer needs to participate: browse, post, comment, like, follow, join teams, and use basic API/MCP tools. Pro adds more projects, teams, exposure features, and higher API limits." },
              { q: "Is the price in USD?", a: "The current Pro checkout is priced through Stripe. Region-specific payment presentation will evolve as China payment channels are brought online." },
              { q: "Can I use VibeHub for my company?", a: "Yes. Companies can use the same product as everyone else with a normal account. Enterprise verification is a badge-only identity check in v7, not a separate workspace product." },
            ].map(({ q, a }) => (
              <details key={q} className="card" style={{ cursor: "pointer" }}>
                <summary style={{ fontWeight: 600, padding: "4px 0" }}>{q}</summary>
                <p className="muted" style={{ marginTop: 8 }}>{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
