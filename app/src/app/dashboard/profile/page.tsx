'use client';

import { useState, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';
import Breadcrumb from '@/components/Breadcrumb';
import Image from 'next/image';

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');
  const [form, setForm] = useState({
    displayName: '',
    shortBio: '',
    websiteUrl: '',
    twitter: '',
  });
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);

  const handleFieldChange = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    console.log('Profile saved:', { form, profileImage });
    // Add save logic here
  };

  return (
    <div className="flex min-h-screen bg-[#151918]">
      <Sidebar />
      <div className="flex-1 ml-64 min-w-0 flex flex-col">
        <TopHeader />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-8 space-y-8">
          <Breadcrumb items={[{ label: 'Profile', isActive: true }]} />

          {/* Tabs */}
          <div className="flex items-center gap-2 border-b border-[#2A2A2A]">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-6 py-3 font-semibold transition-colors rounded-t-lg ${
                activeTab === 'profile'
                  ? 'bg-[#D2045B] text-white'
                  : 'bg-transparent text-gray-400 hover:text-white'
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-3 font-semibold transition-colors rounded-t-lg ${
                activeTab === 'settings'
                  ? 'bg-[#D2045B] text-white'
                  : 'bg-transparent text-gray-400 hover:text-white'
              }`}
            >
              Settings
            </button>
          </div>

          {/* Main Content - Two Columns */}
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-[70%_30%] gap-6">
              {/* Left Column - Form Fields */}
              <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">
                  Display name
                </label>
                <input
                  value={form.displayName}
                  onChange={handleFieldChange('displayName')}
                  placeholder="Add Display name"
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white">
                  Short bio
                </label>
                <input
                  value={form.shortBio}
                  onChange={handleFieldChange('shortBio')}
                  placeholder="Tell about yourself in a few words"
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white">
                  Website URL
                </label>
                <input
                  value={form.websiteUrl}
                  onChange={handleFieldChange('websiteUrl')}
                  placeholder="https://"
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white">
                  X (Twitter)
                </label>
                <input
                  value={form.twitter}
                  onChange={handleFieldChange('twitter')}
                  placeholder="Enter your X username"
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none"
                />
              </div>

              <button
                onClick={handleSave}
                className="w-[131px] rounded-lg bg-[#D2045B] hover:bg-[#B8043F] text-white font-semibold px-6 py-3 transition-colors mt-6"
              >
                Save
              </button>
            </div>

            {/* Right Column - Profile Image */}
            <div className="rounded-2xl border border-[#2A2A2A] bg-[#161616] p-6 w-full flex flex-col">
              {profileImage ? (
                <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-4">
                  <Image
                    src={profileImage}
                    alt="Profile"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="w-full aspect-square rounded-lg bg-gradient-to-br from-gray-600 to-gray-800 mb-4 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg
                      className="w-32 h-32 text-gray-400"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                </div>
              )}
              
              <h3 className="text-white font-semibold mb-2">Profile</h3>
              <p className="text-sm text-[#A3A3A3] mb-4 flex-1">
                Make your artist profile stand out with a striking cover image
              </p>
              
              <input
                ref={profileInputRef}
                type="file"
                accept="image/*"
                onChange={handleProfileImageUpload}
                className="hidden"
              />
              <button
                onClick={() => profileInputRef.current?.click()}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#111111] text-white px-4 py-2 hover:bg-[#1a1a1a] transition-colors"
              >
                Add Cover
              </button>
            </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="py-8">
              <p className="text-white">Settings content coming soon...</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

