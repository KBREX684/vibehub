/**
 * P3-BE-5: fetch default branch README from GitHub (raw) for a repo URL.
 */
export async function fetchGitHubReadmeMarkdown(repoUrl: string): Promise<string | null> {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  const [, owner, rawRepo] = match;
  const repo = rawRepo.replace(/\.git$/, "");
  const token = process.env.GITHUB_TOKEN?.trim();
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "VibeHub-ReadmeSync/1.0",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  try {
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers,
      signal: AbortSignal.timeout(8000),
    });
    if (!repoRes.ok) return null;
    const repoJson = (await repoRes.json()) as { default_branch?: string };
    const branch = repoJson.default_branch ?? "main";
    const candidates = [`README.md`, `Readme.md`, `readme.md`];
    for (const path of candidates) {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
      const rawRes = await fetch(rawUrl, { signal: AbortSignal.timeout(8000) });
      if (rawRes.ok) {
        const text = await rawRes.text();
        return text.length > 0 ? text : null;
      }
    }
    return null;
  } catch {
    return null;
  }
}
