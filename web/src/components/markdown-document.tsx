"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownDocument({
  markdown,
  className,
}: {
  markdown: string;
  className?: string;
}) {
  return (
    <div className={className ?? "markdown-body"}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </div>
  );
}
