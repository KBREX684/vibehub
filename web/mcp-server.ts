#!/usr/bin/env tsx
/**
 * VibeHub MCP stdio Server — A-1
 *
 * Implements the Model Context Protocol (MCP) stdio transport so Cursor,
 * Claude Desktop, and other MCP-compatible AI tools can directly call
 * VibeHub repository functions without going through HTTP.
 *
 * Usage:
 *   npx tsx mcp-server.ts
 *   # or add to Claude Desktop / Cursor config — see examples/mcp-config.json
 *
 * Environment:
 *   DATABASE_URL=...     Use real PostgreSQL (default path)
 *   USE_MOCK_DATA=true   Opt into in-memory mock data for demos only
 *   SESSION_SECRET=...   Required when using signed web sessions
 *
 * Safety: stdio MCP runs with full repository access to the configured database.
 * Refuses to start in production against a real DATABASE_URL unless explicitly allowed.
 */

import * as readline from "readline";

// ─── MCP Protocol Types ───────────────────────────────────────────────────────

interface McpRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface McpResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS: McpTool[] = [
  {
    name: "search_projects",
    description: "Search VibeHub projects. Supports full-text query and filters by tag, tech stack, team, and status.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Full-text search query" },
        tag: { type: "string", description: "Filter by tag" },
        tech: { type: "string", description: "Filter by technology (e.g. 'Next.js')" },
        team: { type: "string", description: "Filter by team slug" },
        status: { type: "string", enum: ["idea", "building", "launched", "paused"], description: "Project status" },
        page: { type: "number", description: "Page number (default 1)" },
        limit: { type: "number", description: "Results per page (default 20, max 100)" },
      },
    },
  },
  {
    name: "get_project_detail",
    description: "Fetch full project details by slug, including tech stack, links, team, and GitHub stats.",
    inputSchema: {
      type: "object",
      required: ["slug"],
      properties: {
        slug: { type: "string", description: "Project slug (e.g. 'vibehub')" },
      },
    },
  },
  {
    name: "search_creators",
    description: "Search VibeHub creator profiles by name, bio, or skills.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        page: { type: "number" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "search_posts",
    description: "Search VibeHub discussion posts with optional tag and sort filters.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Full-text search query" },
        tag: { type: "string", description: "Filter by tag" },
        sort: { type: "string", enum: ["latest", "popular"], description: "Sort order" },
        page: { type: "number" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "get_post_detail",
    description: "Fetch a single VibeHub discussion post with its nested comments.",
    inputSchema: {
      type: "object",
      required: ["slug"],
      properties: {
        slug: { type: "string", description: "Post slug" },
      },
    },
  },
  {
    name: "list_challenges",
    description: "List active VibeHub challenges and collection topics for VibeCoding developers.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "list_teams",
    description: "Browse VibeHub teams looking for collaborators.",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "number" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "get_talent_radar",
    description: "Find VibeHub creators by skill or collaboration preference. Useful for recruitment.",
    inputSchema: {
      type: "object",
      properties: {
        skill: { type: "string", description: "Skill keyword (e.g. 'Next.js', 'Rust')" },
        collaborationPreference: { type: "string", enum: ["open", "invite_only", "closed"] },
        page: { type: "number" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "get_project_metadata",
    description: "Fetch machine-friendly project metadata including milestones, GitHub stats, and all links.",
    inputSchema: {
      type: "object",
      required: ["slug"],
      properties: {
        slug: { type: "string", description: "Project slug" },
      },
    },
  },
];

// ─── Repository helpers ───────────────────────────────────────────────────────

async function loadRepository() {
  // Dynamic import to allow tsx to resolve path aliases
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const repo = await import("./src/lib/repository.js").catch(() => require("./src/lib/repository"));
  return repo;
}

async function callTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  const repo = await loadRepository();

  const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

  switch (name) {
    case "search_projects": {
      const STATUSES = ["idea", "building", "launched", "paused"];
      const rawStatus = str(input.status);
      const status = rawStatus && STATUSES.includes(rawStatus) ? rawStatus : undefined;
      return repo.listProjects({ query: str(input.query), tag: str(input.tag), tech: str(input.tech), team: str(input.team), status, page: num(input.page, 1), limit: num(input.limit, 20) });
    }
    case "get_project_detail": {
      const slug = str(input.slug);
      if (!slug) throw new Error("slug is required");
      const project = await repo.getProjectBySlug(slug);
      if (!project) throw new Error(`Project "${slug}" not found`);
      return project;
    }
    case "search_creators":
      return repo.listCreators({ query: str(input.query), page: num(input.page, 1), limit: num(input.limit, 20) });
    case "search_posts": {
      const result = await repo.listPosts({ query: str(input.query), tag: str(input.tag), page: num(input.page, 1), limit: num(input.limit, 20) });
      if (input.sort === "popular") {
        result.items = result.items.sort((a: { likeCount?: number }, b: { likeCount?: number }) => (b.likeCount ?? 0) - (a.likeCount ?? 0));
      }
      return result;
    }
    case "get_post_detail": {
      const slug = str(input.slug);
      if (!slug) throw new Error("slug is required");
      const post = await repo.getPostBySlug(slug);
      if (!post) throw new Error(`Post "${slug}" not found`);
      const comments = await repo.listCommentsForPost(post.id);
      return { post, comments };
    }
    case "list_challenges": {
      const topics = repo.listCollectionTopics();
      return { challenges: topics.filter((t: { slug: string; description: string }) => t.slug.includes("challenge") || t.description.toLowerCase().includes("challenge")) };
    }
    case "list_teams":
      return repo.listTeams({ page: num(input.page, 1), limit: num(input.limit, 20) });
    case "get_talent_radar":
      return repo.getTalentRadar({ skill: str(input.skill), collaborationPreference: str(input.collaborationPreference), page: num(input.page, 1), limit: num(input.limit, 20) });
    case "get_project_metadata": {
      const slug = str(input.slug);
      if (!slug) throw new Error("slug is required");
      const metadata = await repo.getProjectMetadata(slug);
      if (!metadata) throw new Error(`Project "${slug}" not found`);
      return metadata;
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ─── MCP stdio transport ──────────────────────────────────────────────────────

function send(msg: McpResponse) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}

function makeError(id: string | number | null, code: number, message: string, data?: unknown): McpResponse {
  return { jsonrpc: "2.0", id, error: { code, message, ...(data ? { data } : {}) } };
}

async function handleRequest(req: McpRequest): Promise<McpResponse> {
  const { id, method, params } = req;

  switch (method) {
    case "initialize":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          serverInfo: { name: "vibehub-mcp", version: "1.0.0" },
          capabilities: { tools: {} },
        },
      };

    case "initialized":
      return { jsonrpc: "2.0", id, result: {} };

    case "tools/list":
      return {
        jsonrpc: "2.0",
        id,
        result: { tools: TOOLS },
      };

    case "tools/call": {
      const toolName = params?.name as string;
      const toolInput = (params?.arguments ?? {}) as Record<string, unknown>;
      if (!toolName) return makeError(id, -32602, "Missing tool name");
      try {
        const output = await callTool(toolName, toolInput);
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(output, null, 2),
              },
            ],
          },
        };
      } catch (err) {
        return makeError(id, -32000, err instanceof Error ? err.message : String(err));
      }
    }

    case "ping":
      return { jsonrpc: "2.0", id, result: {} };

    default:
      return makeError(id, -32601, `Method not found: ${method}`);
  }
}

// ─── Main loop ────────────────────────────────────────────────────────────────

if (
  process.env.NODE_ENV === "production" &&
  process.env.DATABASE_URL?.trim() &&
  process.env.ALLOW_PRODUCTION_MCP_STDIO !== "true"
) {
  process.stderr.write(
    "[vibehub-mcp] Refusing to start: production NODE_ENV with DATABASE_URL set. " +
      "stdio MCP has unrestricted DB access. Set ALLOW_PRODUCTION_MCP_STDIO=true only if you accept this risk.\n"
  );
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, terminal: false });

process.stderr.write("[vibehub-mcp] stdio server started\n");

rl.on("line", async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let req: McpRequest;
  try {
    req = JSON.parse(trimmed) as McpRequest;
  } catch {
    send(makeError(null, -32700, "Parse error"));
    return;
  }
  const res = await handleRequest(req);
  send(res);
});

rl.on("close", () => {
  process.stderr.write("[vibehub-mcp] stdin closed, exiting\n");
  process.exit(0);
});
