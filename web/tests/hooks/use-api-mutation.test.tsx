import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }));
vi.mock("@/lib/api-fetch", () => ({ apiFetch: mockApiFetch }));

import { useApiMutation } from "@/hooks/use-api-mutation";

beforeEach(() => {
  mockApiFetch.mockReset();
});

describe("useApiMutation", () => {
  it("has correct initial state", () => {
    const { result } = renderHook(() => useApiMutation("/api/v1/test"));
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.trigger).toBe("function");
  });

  it("successful mutation returns result data and calls onSuccess", async () => {
    const responseData = { id: "1", name: "created" };
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: responseData }),
    });
    const onSuccess = vi.fn();

    const { result } = renderHook(() => useApiMutation("/api/v1/items"));
    let triggerResult: unknown;

    await act(async () => {
      triggerResult = await result.current.trigger(
        { name: "created" },
        { onSuccess },
      );
    });

    expect(triggerResult).toEqual(responseData);
    expect(onSuccess).toHaveBeenCalledWith(responseData);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("failed mutation (non-ok response) sets error and calls onError", async () => {
    mockApiFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: "Bad request" } }),
    });
    const onError = vi.fn();

    const { result } = renderHook(() => useApiMutation("/api/v1/items"));
    let triggerResult: unknown;

    await act(async () => {
      triggerResult = await result.current.trigger({ bad: true }, { onError });
    });

    expect(triggerResult).toBeNull();
    expect(result.current.error).toBe("Bad request");
    expect(onError).toHaveBeenCalled();
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it("failed mutation uses fallback message when json parse fails", async () => {
    mockApiFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("parse error");
      },
    });

    const { result } = renderHook(() => useApiMutation("/api/v1/items"));

    await act(async () => {
      await result.current.trigger({ data: 1 });
    });

    expect(result.current.error).toBe("Request failed (500)");
  });

  it("failed mutation (network error) sets error message", async () => {
    mockApiFetch.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useApiMutation("/api/v1/items"));

    await act(async () => {
      await result.current.trigger();
    });

    expect(result.current.error).toBe("Network error");
  });

  it("defaults method to POST", () => {
    const { result } = renderHook(() => useApiMutation("/api/v1/items"));

    mockApiFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: null }),
    });

    act(() => {
      void result.current.trigger();
    });

    expect(mockApiFetch).toHaveBeenCalledWith("/api/v1/items", {
      method: "POST",
      headers: undefined,
      body: undefined,
    });
  });

  it("uses correct URL and method", () => {
    const { result } = renderHook(() =>
      useApiMutation("/api/v1/items/1", "DELETE"),
    );

    mockApiFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: null }),
    });

    act(() => {
      void result.current.trigger();
    });

    expect(mockApiFetch).toHaveBeenCalledWith("/api/v1/items/1", {
      method: "DELETE",
      headers: undefined,
      body: undefined,
    });
  });

  it("JSON.stringifies body when provided", () => {
    const { result } = renderHook(() => useApiMutation("/api/v1/items"));

    mockApiFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: null }),
    });

    const body = { name: "test", value: 42 };

    act(() => {
      void result.current.trigger(body);
    });

    expect(mockApiFetch).toHaveBeenCalledWith("/api/v1/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  });

  it("omits body and Content-Type when body is undefined", () => {
    const { result } = renderHook(() => useApiMutation("/api/v1/items"));

    mockApiFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: null }),
    });

    act(() => {
      void result.current.trigger();
    });

    expect(mockApiFetch).toHaveBeenCalledWith("/api/v1/items", {
      method: "POST",
      headers: undefined,
      body: undefined,
    });
  });
});
