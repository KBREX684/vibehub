"use client";

import { motion } from "framer-motion";
import type { Comment } from "@/lib/types";
import { User, CornerDownRight } from "lucide-react";

function CommentCard({ comment, isReply = false, index = 0 }: { comment: Comment; isReply?: boolean; index?: number }) {
  const date = new Date(comment.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30, delay: index * 0.05 }}
      className={`relative p-5 md:p-6 rounded-[24px] backdrop-blur-[24px] saturate-[150%] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)] transition-all duration-300 group ${
        isReply 
          ? "bg-[rgba(255,255,255,0.6)] border border-white/40 ml-4 md:ml-12 mt-4" 
          : "bg-[rgba(255,255,255,0.85)] border border-white/60"
      }`}
    >
      {/* Cyber-Apple Connecting Line for Replies */}
      {isReply && (
        <div className="absolute -left-4 md:-left-8 top-8 w-4 md:w-8 h-[2px] bg-gradient-to-r from-transparent to-[#81e6d9]/40 group-hover:to-[#81e6d9] transition-colors" />
      )}
      {isReply && (
        <div className="absolute -left-4 md:-left-8 -top-4 bottom-8 w-[2px] bg-gradient-to-b from-transparent via-[#81e6d9]/20 to-[#81e6d9]/40 group-hover:via-[#81e6d9]/40 group-hover:to-[#81e6d9] transition-colors" />
      )}

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-[12px] flex items-center justify-center flex-shrink-0 ${isReply ? 'bg-[#f5ebd4]/40 text-[#d97706]' : 'bg-[#81e6d9]/20 text-[#0d9488]'}`}>
            <User className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-[0.95rem] text-[var(--color-text-primary)] leading-none mb-1">
              {comment.authorName || comment.authorId}
            </div>
            <div className="text-[11px] font-medium text-[var(--color-text-tertiary)]">
              {date}
            </div>
          </div>
        </div>
        
        <button className="opacity-0 group-hover:opacity-100 transition-opacity p-2 -mr-2 rounded-full hover:bg-black/5 text-[var(--color-text-tertiary)] hover:text-[var(--color-accent-apple)]">
          <CornerDownRight className="w-4 h-4" />
        </button>
      </div>
      
      <div className="text-[0.95rem] text-[var(--color-text-secondary)] leading-[1.6] whitespace-pre-wrap">
        {comment.body}
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2 relative">
          {comment.replies.map((reply, i) => (
            <CommentCard key={reply.id} comment={reply} isReply={true} index={i} />
          ))}
        </div>
      )}
    </motion.div>
  );
}

export function CommentThread({ comments }: { comments: Comment[] }) {
  if (comments.length === 0) {
    return (
      <div className="text-center py-20 rounded-[32px] bg-[rgba(255,255,255,0.5)] border border-white/60 shadow-sm">
        <p className="text-[1.05rem] font-medium text-[var(--color-text-secondary)]">No comments yet. Be the first to share your thoughts!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {comments.map((comment, i) => (
        <CommentCard key={comment.id} comment={comment} index={i} />
      ))}
    </div>
  );
}
