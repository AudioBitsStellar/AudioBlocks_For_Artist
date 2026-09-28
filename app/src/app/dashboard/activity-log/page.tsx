"use client";

import { Clock, Music, LogIn, Settings, Edit3 } from "lucide-react";

const activities = [
  { id: 1, type: "upload", title: "New Track Uploaded", description: "Uploaded 'Summer Vibes.wav'", date: "2 hours ago", icon: Music },
  { id: 2, type: "profile", title: "Profile Updated", description: "Updated artist bio", date: "Yesterday, 3:45 PM", icon: Edit3 },
  { id: 3, type: "settings", title: "Settings Changed", description: "Changed default currency to EUR", date: "Yesterday, 3:40 PM", icon: Settings },
  { id: 4, type: "login", title: "New Login", description: "Logged in from Chrome on Mac OS", date: "Oct 12, 10:00 AM", icon: LogIn },
];

export default function ActivityLogPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <h1 className="text-2xl font-bold text-text flex items-center gap-2">
          <Clock className="w-6 h-6 text-primary" />
          Activity Log
        </h1>
        <p className="text-text-muted mt-2">Track all recent actions and history on your artist account.</p>
      </header>

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <ul className="divide-y divide-border">
          {activities.map((item) => (
            <li key={item.id} className="p-4 flex gap-4 hover:bg-background/50 transition-colors">
              <div className="mt-1">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <item.icon size={20} />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-text">{item.title}</h3>
                <p className="text-sm text-text-muted mt-1">{item.description}</p>
                <span className="text-xs text-text-muted mt-2 block">{item.date}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
