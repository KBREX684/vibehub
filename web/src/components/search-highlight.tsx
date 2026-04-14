/** Highlights the first case-insensitive occurrence of `query` in `text` (React-escaped). */
export function SearchHighlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) {
    return <>{text}</>;
  }
  const lower = text.toLowerCase();
  const qi = lower.indexOf(q.toLowerCase());
  if (qi < 0) {
    return <>{text}</>;
  }
  const before = text.slice(0, qi);
  const match = text.slice(qi, qi + q.length);
  const after = text.slice(qi + q.length);
  return (
    <>
      {before}
      <mark
        className="rounded px-0.5 py-0"
        style={{ background: "var(--color-primary-subtle)", color: "var(--color-text-primary)" }}
      >
        {match}
      </mark>
      {after}
    </>
  );
}
