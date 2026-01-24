"use client";
import Album from "@/components/musicUpload/Album";
import Song from "@/components/musicUpload/Song";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";


type Mode = 'song' | 'album';
const Upoad_Music
    = () => {
        const [mode, setMode] = useState<Mode>('song');
        const route = useRouter();

        return (
            <>
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-white text-3xl font-bold">Add Music</h1>
                    <button
                        onClick={route.back}
                        className="rounded-full cursor-pointer p-2 text-gray-400 transition hover:bg-white/5 hover:text-white"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Mode Selection */}
                <div className="mb-6 flex items-center gap-3">
                    <button
                        onClick={() => setMode('album')}
                        className={`px-6 py-2 rounded-lg font-semibold transition-colors ${mode === 'album'
                            ? 'bg-[#D2045B] text-white'
                            : 'bg-transparent text-white hover:bg-white/5'
                            }`}
                    >
                        Add Album
                    </button>
                    <button
                        onClick={() => setMode('song')}
                        className={`px-6 py-2 rounded-lg font-semibold transition-colors ${mode === 'song'
                            ? 'bg-[#D2045B] text-white'
                            : 'bg-transparent text-white hover:bg-white/5'
                            }`}
                    >
                        Add Song
                    </button>
                </div>

                {/* Upload Form */}

                {mode === 'album' ? (
                    // Album Upload Component
                    <Album />
                ) : (
                    // Song Upload Component
                    <Song />

                )}
            </>
        )
    }

export default Upoad_Music
