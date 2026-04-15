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
              { q: "What payment methods are accepted?", a: "We use Stripe — credit cards, debit cards, and many local payment methods are supported worldwide." },
              { q: "Do team members need to pay?", a: "No. Only the team creator needs a subscription. Members join for free." },
              { q: "What's included in Free?", a: "Everything a developer needs to participate: browse, post, comment, like, follow, join teams, and use basic API/MCP tools. Pro adds more projects, teams, exposure features, and higher API limits." },
              { q: "Is the price in USD?", a: "Yes. $9/month is the global price. Stripe handles currency conversion for your local payment method." },
              { q: "Can I use VibeHub for my company?", a: "Absolutely. Companies can use the public API and MCP tools to discover projects and talent on VibeHub with a regular account. Dedicated enterprise features will be available in a future release." },
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
