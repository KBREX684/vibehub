import { unifiedSearch } from "@/lib/repository";
import Link from "next/link";
import { Search, Hash, Box, User, Briefcase, MessageSquare } from "lucide-react";

interface Props {
  searchParams: Promise<{ q?: string; type?: string }>;
}

const TYPE_LABELS: Record<string, string> = { post: "Discussion", project: "Project", creator: "Creator" };
const TYPE_ICONS: Record<string, React.ReactNode> = { 
  post: <MessageSquare className="w-4 h-4" />, 
  project: <Briefcase className="w-4 h-4" />, 
  creator: <User className="w-4 h-4" /> 
};

export default async function SearchPage({ searchParams }: Props) {
  const { q = "", type } = await searchParams;
  const validTypes = ["post", "project", "creator"] as const;
  type SearchType = typeof validTypes[number];
  const resolvedType = validTypes.includes(type as SearchType) ? (type as SearchType) : undefined;

  const results = q.trim().length >= 2 ? await unifiedSearch(q.trim(), resolvedType) : [];

  return (
    <>
      <main className="container pb-24 space-y-8 mt-6">
        
        {/* Header Bento */}
        <section className="p-8 md:p-12 rounded-[32px] bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] saturate-[150%] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)] border border-white/60 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-[24px] bg-[#81e6d9]/20 flex items-center justify-center text-[#0d9488] shadow-sm">
              <Search className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-semibold tracking-[-0.02em] text-[var(--color-text-primary)] m-0">
                Search Results
              </h1>
              {q ? (
                <p className="text-[1.05rem] text-[var(--color-text-secondary)] mt-1">
                  Found {results.length} results for <strong className="text-[var(--color-text-primary)] font-semibold">&ldquo;{q}&rdquo;</strong>
                </p>
              ) : (
                <p className="text-[1.05rem] text-[var(--color-text-secondary)] mt-1">
                  Enter a keyword in the global search bar to begin.
                </p>
              )}
            </div>
          </div>

          {/* Glass Pill Filter */}
          {q && (
            <div className="inline-flex p-1.5 rounded-[980px] bg-black/5 border border-black/5 backdrop-blur-md self-start md:self-auto">
              <Link 
                href={`/search?q=${encodeURIComponent(q)}`} 
                className={`flex items-center gap-2 px-5 py-2.5 text-[0.95rem] font-medium rounded-[980px] transition-all duration-300 ${!resolvedType ? 'bg-white text-[var(--color-text-primary)] shadow-[0_2px_8px_rgba(0,0,0,0.08)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/50'}`}
              >
                <Box className="w-4 h-4" /> All
              </Link>
              {validTypes.map((t) => (
                <Link 
                  key={t}
                  href={`/search?q=${encodeURIComponent(q)}&type=${t}`} 
                  className={`flex items-center gap-2 px-5 py-2.5 text-[0.95rem] font-medium rounded-[980px] transition-all duration-300 ${resolvedType === t ? 'bg-white text-[var(--color-text-primary)] shadow-[0_2px_8px_rgba(0,0,0,0.08)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/50'}`}
                >
                  {TYPE_ICONS[t]} {TYPE_LABELS[t]}
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Results List */}
        {results.length === 0 && q.trim().length >= 2 ? (
          <div className="text-center py-24 rounded-[32px] bg-[rgba(255,255,255,0.5)] border border-white/60 shadow-sm">
            <Search className="w-12 h-12 text-[var(--color-text-tertiary)] mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">No results found</h3>
            <p className="text-[1.05rem] font-medium text-[var(--color-text-secondary)]">We couldn&apos;t find anything matching &ldquo;{q}&rdquo;.</p>
          </div>
        ) : (
          <div className="grid gap-4 max-w-4xl mx-auto">
            {results.map((item) => (
              <article 
                key={`${item.type}-${item.id}`} 
                className="group p-6 rounded-[24px] bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] saturate-[150%] border border-white/60 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 hover:border-[#81e6d9]/40 transition-all duration-300"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black/5 text-[var(--color-text-secondary)] text-[10px] font-bold uppercase tracking-wider rounded-[980px]">
                    {TYPE_ICONS[item.type]} {TYPE_LABELS[item.type]}
                  </span>
                  <Link 
                    href={`/${item.type === "post" ? "discussions" : item.type === "creator" ? "creators" : "projects"}/${item.slug}`} 
                    className="text-[1.1rem] font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-accent-apple)] transition-colors outline-none"
                  >
                    {item.title}
                  </Link>
                </div>
                
                <p className="text-[0.95rem] text-[var(--color-text-secondary)] leading-[1.6] mb-4">
                  {item.excerpt}
                </p>
                
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-4 border-t border-black/5">
                    {item.tags.slice(0, 5).map((tag) => (
                      <span key={tag} className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 bg-black/5 text-[var(--color-text-secondary)] rounded-[980px]">
                        <Hash className="w-3 h-3 text-[var(--color-text-tertiary)]" /> {tag}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
