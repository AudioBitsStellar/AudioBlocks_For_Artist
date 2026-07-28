'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, User } from 'lucide-react';
import Breadcrumb from '@/components/Breadcrumb';
import {
  getConversations,
  sendMessage,
  formatMessageTime,
  formatConversationDate,
  type Conversation,
} from '@/services/messageService';

function ConversationList({
  conversations,
  selectedId,
  onSelect,
}: {
  conversations: Conversation[];
  selectedId: number | null;
  onSelect: (c: Conversation) => void;
}) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <MessageSquare className="h-10 w-10 text-[#A3A3A3] mb-3" />
        <p className="text-white font-semibold">No messages yet</p>
        <p className="text-[#A3A3A3] text-sm mt-1">Fan messages will appear here.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-[#1F1F1F]">
      {conversations.map((c) => (
        <li key={c.id}>
          <button
            onClick={() => onSelect(c)}
            className={`w-full flex items-start gap-3 px-4 py-4 text-left hover:bg-[#1A1A1A] transition-colors ${
              selectedId === c.id ? 'bg-[#1A1A1A]' : ''
            }`}
          >
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-[#2A2A2A] flex items-center justify-center">
              <User className="h-5 w-5 text-[#A3A3A3]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-white text-sm font-semibold truncate">{c.fanName}</span>
                <span className="text-[#A3A3A3] text-xs flex-shrink-0 ml-2">
                  {formatConversationDate(c.lastMessageAt)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[#A3A3A3] text-xs truncate">{c.lastMessage}</p>
                {c.unreadCount > 0 && (
                  <span className="ml-2 flex-shrink-0 h-5 w-5 rounded-full bg-[#D2045B] flex items-center justify-center text-[10px] font-bold text-white">
                    {c.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

function MessageThread({ conversation }: { conversation: Conversation }) {
  const [messages, setMessages] = useState(conversation.messages);
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(conversation.messages);
    setDraft('');
  }, [conversation.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    const msg = sendMessage({ conversationId: conversation.id, content: text });
    setMessages((prev) => [...prev, msg]);
    setDraft('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 border-b border-[#1F1F1F] px-6 py-4">
        <div className="h-9 w-9 rounded-full bg-[#2A2A2A] flex items-center justify-center">
          <User className="h-4 w-4 text-[#A3A3A3]" />
        </div>
        <span className="text-white font-semibold">{conversation.fanName}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.isFromArtist ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.isFromArtist
                  ? 'bg-[#D2045B] text-white rounded-br-sm'
                  : 'bg-[#1F1F1F] text-white rounded-bl-sm'
              }`}
            >
              <p>{msg.content}</p>
              <p
                className={`text-[10px] mt-1 ${
                  msg.isFromArtist ? 'text-white/60 text-right' : 'text-[#A3A3A3]'
                }`}
              >
                {formatMessageTime(msg.timestamp)}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-[#1F1F1F] px-6 py-4 flex items-end gap-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a message… (Enter to send)"
          rows={2}
          maxLength={1000}
          className="flex-1 resize-none rounded-xl border border-[#2A2A2A] bg-[#111111] px-4 py-3 text-sm text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none"
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim()}
          aria-label="Send message"
          className="flex-shrink-0 h-11 w-11 rounded-full bg-[#D2045B] flex items-center justify-center hover:bg-[#B8043F] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="h-4 w-4 text-white" />
        </button>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const conversations = getConversations();
  const [selected, setSelected] = useState<Conversation | null>(
    conversations.length > 0 ? conversations[0] : null
  );

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Messages', isActive: true }]} />

      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.3em] text-[#A3A3A3]">Inbox</p>
        <h1 className="text-3xl font-bold text-white">Messages</h1>
      </div>

      <div className="flex h-[600px] overflow-hidden rounded-2xl border border-[#1F1F1F] bg-[#111111]">
        <div className="w-72 flex-shrink-0 border-r border-[#1F1F1F] overflow-y-auto">
          <ConversationList
            conversations={conversations}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
          />
        </div>

        <div className="flex-1 min-w-0">
          {selected ? (
            <MessageThread key={selected.id} conversation={selected} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <MessageSquare className="h-12 w-12 text-[#A3A3A3] mb-3" />
              <p className="text-white font-semibold">Select a conversation</p>
              <p className="text-[#A3A3A3] text-sm mt-1">Choose a fan from the list to read their messages.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
