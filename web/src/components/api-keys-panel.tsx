"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { isDevDemoAuth } from "@/lib/dev-demo";
import { motion, AnimatePresence } from "framer-motion";
import {
  API_KEY_SCOPE_READ_PUBLIC,
  API_KEY_SCOPES,
  DEFAULT_API_KEY_SCOPES,
} from "@/lib/api-key-scopes";
import type { ApiKeyCreated, ApiKeySummary } from "@/lib/types";
import type { UpgradeReason } from "@/lib/subscription";
import { UpgradePlanCallout } from "@/components/upgrade-plan-callout";
import { Key, Plus, Trash2, Copy, CheckCircle2, AlertCircle, Clock, Shield, Sparkles } from "lucide-react";

const OPTIONAL_SCOPES = API_KEY_SCOPES.filter((s) => s !== API_KEY_SCOPE_READ_PUBLIC);

interface Props {
  currentUserId: string | null;
}

export function ApiKeysPanel({ currentUserId }: Props) {
  const [keys, setKeys] = useState<ApiKeySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [upgradeReason, setUpgradeReason] = useState<UpgradeReason | undefined>(undefined);
  const [newLabel, setNewLabel] = useState("");
  const [lastSecret, setLastSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedScopes, setSelectedScopes] = useState<Set<string>>(() => {
    const s = new Set<string>();
    for (const x of DEFAULT_API_KEY_SCOPES) {
      if (x !== API_KEY_SCOPE_READ_PUBLIC) {
        s.add(x);
      }
    }
    return s;
  });

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/v1/me/api-keys", { credentials: "include" });
      const json = (await res.json()) as { data?: { keys?: ApiKeySummary[] }; error?: { message?: string } };
      if (!res.ok) {
        setMsg(json.error?.message ?? "Failed to load keys");
        setKeys([]);
        return;
      }
      setKeys(json.data?.keys ?? []);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUserId) {
      void load();
    }
  }, [currentUserId, load]);

  async function createKey(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setUpgradeReason(undefined);
    setLastSecret(null);
    setCopied(false);
    try {
      const res = await fetch("/api/v1/me/api-keys", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: newLabel.trim(),
          scopes: [API_KEY_SCOPE_READ_PUBLIC, ...Array.from(selectedScopes)],
        }),
      });
      const json = (await res.json()) as {
        data?: { key?: ApiKeyCreated };
        error?: { message?: string; details?: { upgradeReason?: UpgradeReason } };
      };
      if (!res.ok) {
        setMsg(json.error?.message ?? "Create failed");
        setUpgradeReason(json.error?.details?.upgradeReason);
        return;
      }
      const k = json.data?.key;
      if (k?.secret) {
        setLastSecret(k.secret);
      }
      setNewLabel("");
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  }

  async function revoke(id: string) {
    if (!confirm("Are you sure you want to revoke this API key? This action cannot be undone.")) return;
    
    setMsg(null);
    try {
      const res = await fetch(`/api/v1/me/api-keys/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setMsg(json.error?.message ?? "Revoke failed");
        return;
      }
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  }

  const handleCopy = async () => {
    if (!lastSecret) return;
    try {
      await navigator.clipboard.writeText(lastSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text", err);
    }
  };

  if (!currentUserId) {
    return (
      <div className="p-8 rounded-[32px] bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] saturate-[150%] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)] text-center">
        <Key className="w-12 h-12 text-[var(--color-text-tertiary)] mx-auto mb-4" />
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] mb-2">Authentication Required</h2>
        <p className="text-[0.95rem] text-[var(--color-text-secondary)] mb-6">
          Please log in to manage your API keys and access tokens.
        </p>
        {isDevDemoAuth() ? (
          <a
            href="/api/v1/auth/demo-login?role=user&redirect=/settings/api-keys"
            className="inline-flex items-center justify-center px-6 py-3 rounded-[980px] bg-[var(--color-accent-apple)] text-white font-medium hover:bg-[#0062cc] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_8px_24px_rgba(0,122,255,0.3)]"
          >
            Demo Login
          </a>
        ) : (
          <Link
            href="/login?redirect=%2Fsettings%2Fapi-keys"
            className="inline-flex items-center justify-center px-6 py-3 rounded-[980px] bg-[var(--color-accent-apple)] text-white font-medium hover:bg-[#0062cc] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_8px_24px_rgba(0,122,255,0.3)]"
          >
            Sign in
          </Link>
        )}
      </div>
    );
  }

  const inputClasses = "w-full bg-black/5 border border-transparent rounded-[12px] px-4 py-3 text-[0.95rem] text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none transition-all duration-300 focus:bg-white focus:border-[#81e6d9]/50 focus:shadow-[0_0_16px_rgba(129,230,217,0.3)]";

  return (
    <div className="space-y-8">
      {/* Header Bento */}
      <div className="p-8 rounded-[32px] bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] saturate-[150%] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)] border border-white/60">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-[#007aff]/10 flex items-center justify-center text-[#007aff]">
            <Key className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] m-0">API Keys</h2>
        </div>
        <p className="text-[0.95rem] text-[var(--color-text-secondary)] leading-[1.6] max-w-3xl">
          Use these keys to authenticate your scripts, integrations, or AI agents with the VibeHub API. 
          Each key is scoped to specific permissions. Bearer access is subject to per-key rate limits.
        </p>
      </div>

      {/* Create Key Bento */}
      <div className="p-8 rounded-[32px] bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] saturate-[150%] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)] border border-white/60">
        <h3 className="text-lg font-semibold tracking-tight text-[var(--color-text-primary)] mb-6 flex items-center gap-2">
          <Plus className="w-5 h-5 text-[var(--color-accent-apple)]" /> Create New Key
        </h3>
        
        <form onSubmit={(ev) => void createKey(ev)} className="space-y-6">
          <div className="flex flex-col gap-2">
            <label className="text-[0.9rem] font-medium text-[var(--color-text-secondary)]">Key Label</label>
            <input 
              value={newLabel} 
              onChange={(e) => setNewLabel(e.target.value)} 
              required 
              maxLength={80} 
              placeholder="e.g., Production Agent, CI/CD Pipeline"
              className={inputClasses}
            />
          </div>
          
          <div className="flex flex-col gap-3">
            <label className="text-[0.9rem] font-medium text-[var(--color-text-secondary)] flex items-center gap-2">
              <Shield className="w-4 h-4" /> Scopes & Permissions
            </label>
            <div className="p-5 rounded-[16px] bg-black/5 border border-black/5 space-y-4">
              <label className="flex items-center gap-3 cursor-not-allowed opacity-60">
                <input type="checkbox" checked disabled className="w-4 h-4 rounded border-black/20 text-[#007aff] focus:ring-[#007aff]" />
                <code className="text-[0.85rem] font-mono bg-black/5 px-2 py-0.5 rounded-md">{API_KEY_SCOPE_READ_PUBLIC}</code>
                <span className="text-[0.85rem] text-[var(--color-text-secondary)]">(Required base scope)</span>
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-black/5">
                {OPTIONAL_SCOPES.map((s) => (
                  <label key={s} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedScopes.has(s)}
                      onChange={() => {
                        setSelectedScopes((prev) => {
                          const n = new Set(prev);
                          if (n.has(s)) n.delete(s);
                          else n.add(s);
                          return n;
                        });
                      }}
                      className="w-4 h-4 rounded border-black/20 text-[#007aff] focus:ring-[#007aff] transition-colors"
                    />
                    <code className="text-[0.85rem] font-mono bg-black/5 px-2 py-0.5 rounded-md group-hover:bg-black/10 transition-colors">{s}</code>
                  </label>
                ))}
              </div>
            </div>
          </div>
          
          <div className="pt-2">
            <motion.button 
              type="submit" 
              className="px-6 py-3 rounded-[12px] bg-[var(--color-text-primary)] text-white font-medium hover:bg-black transition-colors shadow-[0_8px_24px_rgba(0,0,0,0.15)]"
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              Generate Secret Key
            </motion.button>
          </div>
        </form>

        <AnimatePresence>
          {lastSecret && (
            <motion.div 
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 24 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="overflow-hidden"
            >
              <div className="p-6 rounded-[20px] bg-[#2d2d30] border border-white/10 shadow-[0_16px_48px_-8px_rgba(0,0,0,0.2)]">
                <div className="flex items-center gap-2 mb-3 text-[#f5ebd4]">
                  <AlertCircle className="w-5 h-5" />
                  <h4 className="text-[0.95rem] font-semibold m-0">Save this key now</h4>
                </div>
                <p className="text-[0.85rem] text-white/60 mb-4">
                  For your security, this secret key will only be shown once. You will not be able to see it again after leaving this page.
                </p>
                <div className="flex items-center gap-3">
                  <code className="flex-1 p-4 rounded-[12px] bg-black/40 text-[#81e6d9] font-mono text-[0.9rem] break-all border border-white/5">
                    {lastSecret}
                  </code>
                  <motion.button
                    onClick={handleCopy}
                    className={`flex items-center justify-center w-12 h-12 rounded-[12px] flex-shrink-0 transition-colors ${
                      copied ? "bg-[#34c759] text-white" : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    aria-label="Copy to clipboard"
                  >
                    {copied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {msg && (
          <motion.p 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="mt-6 text-[0.9rem] font-medium text-[#e11d48] bg-[#fee2e2] px-4 py-3 rounded-[12px] flex items-center gap-2"
          >
            {msg}
          </motion.p>
        )}
        {upgradeReason ? <UpgradePlanCallout upgradeReason={upgradeReason} className="mt-4" /> : null}
      </div>

      {/* Keys List Bento */}
      <div className="p-8 rounded-[32px] bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] saturate-[150%] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)] border border-white/60">
        <h3 className="text-lg font-semibold tracking-tight text-[var(--color-text-primary)] mb-6 flex items-center gap-2">
          <Key className="w-5 h-5 text-[var(--color-text-tertiary)]" /> Active Keys
        </h3>
        
        {loading && keys.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-[var(--color-text-tertiary)]">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-6 h-6 border-2 border-current border-t-transparent rounded-full" />
          </div>
        ) : keys.length === 0 ? (
          <div className="text-center py-12 text-[var(--color-text-secondary)] bg-black/5 rounded-[20px] border border-black/5">
            <p className="text-[0.95rem]">No API keys found. Create one above to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {keys.map((k) => (
              <motion.div 
                key={k.id} 
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-6 rounded-[16px] border transition-colors ${
                  k.revokedAt 
                    ? "bg-[#1a1a1a] border-transparent opacity-60" 
                    : "bg-[#0a0a0a] border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)]"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <strong className="text-[1.05rem] font-semibold text-white">{k.label}</strong>
                      {k.revokedAt ? (
                        <span className="px-2.5 py-0.5 rounded-[980px] bg-white/10 text-white/50 text-[10px] font-bold uppercase tracking-wider">
                          Revoked
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-[980px] bg-[#81e6d9]/20 text-[#81e6d9] text-[10px] font-bold uppercase tracking-wider">
                          Active
                        </span>
                      )}
                    </div>
                    <code className="text-[0.85rem] font-mono text-white/70 bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
                      {k.prefix}••••••••••••••••
                    </code>
                  </div>
                  
                  {!k.revokedAt && (
                    <motion.button 
                      onClick={() => void revoke(k.id)}
                      className="flex items-center gap-2 px-4 py-2 rounded-[8px] bg-transparent border border-white/10 text-white/70 text-sm font-medium hover:bg-[#e11d48]/10 hover:text-[#e11d48] hover:border-[#e11d48]/30 transition-colors self-start md:self-auto"
                      whileTap={{ scale: 0.95 }}
                    >
                      <Trash2 className="w-4 h-4" /> Revoke
                    </motion.button>
                  )}
                </div>
                
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[0.85rem] text-white/50 mb-4">
                  <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Created: {new Date(k.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  {k.lastUsedAt && !k.revokedAt && (
                    <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Last used: {new Date(k.lastUsedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  )}
                  {k.revokedAt && (
                    <span className="flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> Revoked: {new Date(k.revokedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  )}
                </div>
                
                <div className="pt-4 border-t border-white/10">
                  <div className="flex flex-wrap gap-1.5">
                    {k.scopes.map(scope => (
                      <span key={scope} className="text-[10px] font-mono px-2 py-1 bg-white/5 border border-white/10 text-white/60 rounded-md">
                        {scope}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
