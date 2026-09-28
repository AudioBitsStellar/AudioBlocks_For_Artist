import React, { useState } from 'react';

export function ProfilePreview({ artistData }: { artistData: any }) {
  const [isPreview, setIsPreview] = useState(false);

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => setIsPreview(!isPreview)} className="px-4 py-2 bg-gray-200 rounded">
          {isPreview ? 'Exit Preview' : 'Preview as Fan'}
        </button>
      </div>
      
      {isPreview ? (
        <div className="border p-6 rounded bg-white shadow">
          <h1 className="text-3xl font-bold">{artistData.name}</h1>
          <p className="text-gray-600">{artistData.bio}</p>
          <div className="mt-4">
            <h2 className="text-xl">Top Tracks</h2>
            {/* Display tracks as a fan would see them */}
          </div>
        </div>
      ) : (
        <div className="border p-6 rounded bg-gray-50 border-dashed">
          <p>Editing Mode - Use the form below to update your profile.</p>
        </div>
      )}
    </div>
  );
}
