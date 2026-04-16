import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const { mockUseSWR } = vi.hoisted(() => ({ mockUseSWR: vi.fn() }));
vi.mock("swr", () => ({ default: mockUseSWR }));

import {
  useMyProfile,
  useNotifications,
  useApiKeys,
  useProject,
  useTeam,
  useDiscussion,
  useApi,
} from "@/hooks/use-api";

beforeEach(() => {
  mockUseSWR.mockReset();
  mockUseSWR.mockReturnValue({
    data: undefined,
    error: undefined,
    isLoading: false,
    mutate: vi.fn(),
  });
});

/* ------------------------------------------------------------------ */
/*  useMyProfile                                                       */
/* ------------------------------------------------------------------ */
describe("useMyProfile", () => {
  it("returns profile: null when data is undefined", () => {
    const { result } = renderHook(() => useMyProfile());
    expect(result.current.profile).toBeNull();
  });

  it("returns profile data when loaded", () => {
    const profile = { id: "1", name: "Alice" };
    mockUseSWR.mockReturnValue({
      data: { data: profile },
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });
    const { result } = renderHook(() => useMyProfile());
    expect(result.current.profile).toEqual(profile);
  });

  it("passes correct URL to SWR", () => {
    renderHook(() => useMyProfile());
    expect(mockUseSWR).toHaveBeenCalledWith("/api/v1/me/profile");
  });
});

/* ------------------------------------------------------------------ */
/*  useNotifications                                                    */
/* ------------------------------------------------------------------ */
describe("useNotifications", () => {
  it("uses default limit of 20", () => {
    renderHook(() => useNotifications());
    expect(mockUseSWR).toHaveBeenCalledWith(
      "/api/v1/me/notifications?limit=20",
    );
  });

  it("uses custom limit", () => {
    renderHook(() => useNotifications(50));
    expect(mockUseSWR).toHaveBeenCalledWith(
      "/api/v1/me/notifications?limit=50",
    );
  });

  it("returns notifications array and unreadCount", () => {
    const items = [{ id: "n1" }, { id: "n2" }];
    mockUseSWR.mockReturnValue({
      data: { data: { items, unreadCount: 2 } },
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });
    const { result } = renderHook(() => useNotifications());
    expect(result.current.notifications).toEqual(items);
    expect(result.current.unreadCount).toBe(2);
  });

  it("returns empty notifications when data is undefined", () => {
    const { result } = renderHook(() => useNotifications());
    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/*  useApiKeys                                                          */
/* ------------------------------------------------------------------ */
describe("useApiKeys", () => {
  it("passes correct URL to SWR", () => {
    renderHook(() => useApiKeys());
    expect(mockUseSWR).toHaveBeenCalledWith("/api/v1/me/api-keys");
  });

  it("returns items array", () => {
    const items = [{ id: "k1", name: "key1" }];
    mockUseSWR.mockReturnValue({
      data: { data: { items } },
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });
    const { result } = renderHook(() => useApiKeys());
    expect(result.current.apiKeys).toEqual(items);
  });

  it("returns empty array when data is undefined", () => {
    const { result } = renderHook(() => useApiKeys());
    expect(result.current.apiKeys).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/*  useProject                                                          */
/* ------------------------------------------------------------------ */
describe("useProject", () => {
  it("passes null to SWR when slug is null", () => {
    renderHook(() => useProject(null));
    expect(mockUseSWR).toHaveBeenCalledWith(null);
  });

  it("passes URL when slug is provided", () => {
    renderHook(() => useProject("my-project"));
    expect(mockUseSWR).toHaveBeenCalledWith(
      "/api/v1/projects/my-project",
    );
  });

  it("encodes slug in URL", () => {
    renderHook(() => useProject("hello world"));
    expect(mockUseSWR).toHaveBeenCalledWith(
      `/api/v1/projects/${encodeURIComponent("hello world")}`,
    );
  });

  it("returns project data when loaded", () => {
    const project = { id: "p1", name: "VibeHub" };
    mockUseSWR.mockReturnValue({
      data: { data: project },
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });
    const { result } = renderHook(() => useProject("vibe"));
    expect(result.current.project).toEqual(project);
  });
});

/* ------------------------------------------------------------------ */
/*  useTeam                                                             */
/* ------------------------------------------------------------------ */
describe("useTeam", () => {
  it("passes null to SWR when slug is null", () => {
    renderHook(() => useTeam(null));
    expect(mockUseSWR).toHaveBeenCalledWith(null);
  });

  it("passes URL when slug is provided", () => {
    renderHook(() => useTeam("alpha"));
    expect(mockUseSWR).toHaveBeenCalledWith("/api/v1/teams/alpha");
  });

  it("returns team data when loaded", () => {
    const team = { id: "t1", name: "Alpha" };
    mockUseSWR.mockReturnValue({
      data: { data: team },
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });
    const { result } = renderHook(() => useTeam("alpha"));
    expect(result.current.team).toEqual(team);
  });
});

/* ------------------------------------------------------------------ */
/*  useDiscussion                                                       */
/* ------------------------------------------------------------------ */
describe("useDiscussion", () => {
  it("passes null to SWR when slug is null", () => {
    renderHook(() => useDiscussion(null));
    expect(mockUseSWR).toHaveBeenCalledWith(null);
  });

  it("passes URL when slug is provided", () => {
    renderHook(() => useDiscussion("topic-1"));
    expect(mockUseSWR).toHaveBeenCalledWith(
      "/api/v1/discussions/topic-1",
    );
  });

  it("returns discussion data when loaded", () => {
    const discussion = { id: "d1", title: "Hello" };
    mockUseSWR.mockReturnValue({
      data: { data: discussion },
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });
    const { result } = renderHook(() => useDiscussion("topic-1"));
    expect(result.current.discussion).toEqual(discussion);
  });
});

/* ------------------------------------------------------------------ */
/*  useApi (generic)                                                    */
/* ------------------------------------------------------------------ */
describe("useApi", () => {
  it("passes null URL to SWR to skip request", () => {
    renderHook(() => useApi(null));
    expect(mockUseSWR).toHaveBeenCalledWith(null);
  });

  it("passes URL to SWR", () => {
    renderHook(() => useApi("/api/v1/custom"));
    expect(mockUseSWR).toHaveBeenCalledWith("/api/v1/custom");
  });

  it("returns data when loaded", () => {
    const payload = { foo: "bar" };
    mockUseSWR.mockReturnValue({
      data: { data: payload },
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });
    const { result } = renderHook(() => useApi("/api/v1/custom"));
    expect(result.current.data).toEqual(payload);
  });

  it("returns null when data is undefined", () => {
    const { result } = renderHook(() => useApi("/api/v1/custom"));
    expect(result.current.data).toBeNull();
  });
});
