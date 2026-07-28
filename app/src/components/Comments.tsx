'use client';

import { useState } from 'react';
import { Send, Paperclip, User } from 'lucide-react';
import { sanitize } from '@/utils/sanitize';

const COMMENT_MAX_LENGTH = 500;
const COMMENT_WARN_THRESHOLD = COMMENT_MAX_LENGTH * 0.9;

const comments = [
  {
    id: 1,
    name: 'Alexia Stephen',
    time: '3:52 PM',
    comment: 'Amet minim mollit non deserunt ullamco est sit aliqua dolor do amet sint.',
    avatar: 'bg-purple-600',
  },
  {
    id: 2,
    name: 'Admin',
    time: '3:52 PM',
    comment: 'Amet minim mollit non deserunt ullamco est sit aliqua dolor do amet sint.',
    avatar: 'bg-blue-600',
  },
];

export default function Comments() {
  const [draft, setDraft] = useState('');
  const isNearLimit = draft.length >= COMMENT_WARN_THRESHOLD;

  return (
    <div className="bg-[#1E1E1E] rounded-lg p-6">
      <h2 className="text-white text-xl font-semibold mb-6">Comments</h2>

      <div className="space-y-4 mb-6">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <div className={`w-10 h-10 rounded-full ${comment.avatar} flex items-center justify-center flex-shrink-0`}>
              <User size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white font-semibold text-sm">{sanitize(comment.name)}</span>
                <span className="text-gray-400 text-sm">{comment.time}</span>
              </div>
              <p className="text-gray-300 text-sm">{sanitize(comment.comment)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 items-center">
        <button
          type="button"
          aria-label="Attach file to comment"
          className="flex items-center justify-center min-w-11 min-h-11 text-gray-400 hover:text-white transition-colors"
        >
          <Paperclip size={20} />
        </button>
        <div className="flex-1">
          <input
            type="text"
            placeholder="Type here"
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, COMMENT_MAX_LENGTH))}
            maxLength={COMMENT_MAX_LENGTH}
            className="w-full bg-[#161616] border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-600 text-sm"
          />
          {isNearLimit && (
            <p className={`mt-1 text-xs text-right ${draft.length >= COMMENT_MAX_LENGTH ? 'text-red-500' : 'text-yellow-500'}`}>
              {draft.length}/{COMMENT_MAX_LENGTH}
            </p>
          )}
        </div>
        <button
          type="button"
          aria-label="Post comment"
          className="flex items-center justify-center min-w-11 min-h-11 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}

