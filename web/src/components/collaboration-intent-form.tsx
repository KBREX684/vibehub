"use client";

import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { Send, Users, UserPlus } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";
import { Button, ErrorBanner } from "@/components/ui";

interface Props {
  projectSlug: string;
}

export function CollaborationIntentForm({ projectSlug }: Props) {
  const [intentType, setIntentType] = useState<"join" | "recruit">("join");
  const [pitch, setPitch] = useState("");
  const [whyYou, setWhyYou] = useState("");
  const [howCollab, setHowCollab] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiFetch(`/api/v1/projects/${projectSlug}/collaboration-intents`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          intentType,
          pitch,
          whyYou,
          howCollab,
        }),
      });

      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        setError(json?.error?.message ?? "提交合作申请失败");
        return;
      }

      setPitch("");
      setWhyYou("");
      setHowCollab("");
      setSuccess("合作申请已提交。");
    } catch {
      setError("提交合作申请时网络异常");
    } finally {
      setLoading(false);
    }
  }

  const inputClasses = "input-base";

  return (
    <form className="flex flex-col gap-5" onSubmit={onSubmit}>
      <div className="flex flex-col gap-2">
        <label className="text-[0.9rem] font-medium text-[var(--color-text-secondary)]">申请类型</label>
        <div className="relative">
          <select 
            value={intentType} 
            onChange={(event) => setIntentType(event.target.value as "join" | "recruit")}
            className={`${inputClasses} appearance-none pr-10`}
          >
            <option value="join">我想加入这个项目</option>
            <option value="recruit">我希望招募协作者</option>
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-text-tertiary)]">
            {intentType === "join" ? <UserPlus className="w-4 h-4" /> : <Users className="w-4 h-4" />}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[0.9rem] font-medium text-[var(--color-text-secondary)]">你是谁，你能做什么？</label>
        <textarea
          value={pitch}
          onChange={(event) => setPitch(event.target.value)}
          placeholder="简要说明你的背景以及你能带来的贡献。"
          minLength={10}
          maxLength={250}
          rows={3}
          required
          className={`${inputClasses} resize-none`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[0.9rem] font-medium text-[var(--color-text-secondary)]">你为什么联系对方？</label>
        <textarea
          value={whyYou}
          onChange={(event) => setWhyYou(event.target.value)}
          placeholder="说明为什么你认为这个项目、团队或合作方向适合你。"
          minLength={10}
          maxLength={250}
          rows={3}
          required
          className={`${inputClasses} resize-none`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[0.9rem] font-medium text-[var(--color-text-secondary)]">你希望如何合作？</label>
        <textarea
          value={howCollab}
          onChange={(event) => setHowCollab(event.target.value)}
          placeholder="描述你希望提出的合作方式。"
          minLength={10}
          maxLength={250}
          rows={3}
          required
          className={`${inputClasses} resize-none`}
        />
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          variant="apple"
          size="md"
          loading={loading}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            "提交中..."
          ) : (
            <>
              <Send className="w-4 h-4" aria-hidden="true" />
              发送合作申请
            </>
          )}
        </Button>
      </div>

      {success ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <ErrorBanner tone="info">{success}</ErrorBanner>
        </motion.div>
      ) : null}
      {error ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <ErrorBanner tone="error">{error}</ErrorBanner>
        </motion.div>
      ) : null}
    </form>
  );
}
