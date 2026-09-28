import React from 'react';

export interface TrackListItem {
  id: string;
  title?: string;
  archived?: boolean;
}

export function TrackList({ tracks, onUnarchive }: { tracks: TrackListItem[], onUnarchive: (id: string) => void }) {
  return (
    <div className="space-y-4">
      {tracks.map(track => (
        <div key={track.id} className="flex justify-between items-center p-4 border rounded">
          <div>
            <h3 className="font-bold">{track.title}</h3>
            <span className={`text-sm ${track.archived ? 'text-red-500' : 'text-green-500'}`}>
              {track.archived ? 'Archived' : 'Published'}
            </span>
          </div>
          {track.archived && (
            <button 
              onClick={() => onUnarchive(track.id)}
              className="bg-indigo-500 text-white px-3 py-1 rounded hover:bg-indigo-600"
            >
              Republish
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
