"use client";

import type { IncidentComment } from "@/lib/api/incidents";
import { formatDateOrDash } from "@/lib/formatters/date";

type IncidentCommentsSectionProps = {
  comments: IncidentComment[];
  newComment: string;
  isInternalComment: boolean;
  commentLoading: boolean;
  isReadOnly: boolean;
  onCommentChangeAction: (value: string) => void;
  onInternalChangeAction: (value: boolean) => void;
  onAddCommentAction: () => void;
};

export default function IncidentCommentsSection({
  comments,
  newComment,
  isInternalComment,
  commentLoading,
  isReadOnly,
  onCommentChangeAction,
  onInternalChangeAction,
  onAddCommentAction,
}: IncidentCommentsSectionProps) {
  return (
    <div className="rounded-sm border border-slate-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-slate-900">Comments ({comments.length})</h3>

      <div className="mt-4 space-y-3 border-b border-slate-200 pb-4">
        <textarea
          value={newComment}
          onChange={(event) => onCommentChangeAction(event.target.value)}
          placeholder="Add a comment..."
          disabled={isReadOnly}
          className="w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
          rows={3}
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isInternalComment}
              onChange={(event) => onInternalChangeAction(event.target.checked)}
              disabled={isReadOnly}
              className="rounded-sm"
            />
            <span className="text-slate-700">Internal note</span>
          </label>
          <button
            type="button"
            onClick={onAddCommentAction}
            disabled={commentLoading || !newComment.trim() || isReadOnly}
            className="rounded-sm bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-500 disabled:opacity-60"
          >
            Post Comment
          </button>
        </div>
      </div>

      {comments.length > 0 ? (
        <div className="mt-4 space-y-3">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className={`rounded-sm p-3 ${comment.is_internal ? "border-l-2 border-yellow-400 bg-yellow-50" : "border border-slate-200 bg-white"}`}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-slate-900">{comment.user.name}</div>
                <div className="text-xs text-slate-500">
                  {formatDateOrDash(comment.commented_at)}
                </div>
              </div>
              {comment.is_internal && (
                <div className="mt-1 text-xs font-medium text-yellow-700">Internal</div>
              )}
              <div className="mt-2 text-sm text-slate-700">{comment.comment}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 text-center text-sm text-slate-500">No comments yet.</div>
      )}
    </div>
  );
}
