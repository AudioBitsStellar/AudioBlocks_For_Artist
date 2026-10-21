"use client";
import dynamic from "next/dynamic";

const ReleaseFlow = dynamic(() => import("@/components/musicUpload/ReleaseFlow"));
const Song = dynamic(() => import("@/components/musicUpload/Song"));
import * as Tabs from "@radix-ui/react-tabs";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { analytics } from "@/lib/analytics";

type Mode = "song" | "album";

const FALLBACK_ROUTE = "/dashboard/my-music";

const tabTriggerClass =
  "px-6 py-2 rounded-lg font-semibold transition-colors text-white bg-transparent hover:bg-white/5 data-[state=active]:bg-[#D2045B] data-[state=active]:hover:bg-[#D2045B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black";

const Upload_Music = () => {
  const [mode, setMode] = useState<Mode>("song");
  const route = useRouter();

  const handleClose = () => {
    // Opened in a new tab (or deep-linked) there is no history to go back to.
    if (typeof window !== "undefined" && window.history.length > 1) {
      route.back();
    } else {
      route.push(FALLBACK_ROUTE);
    }
  };

  const handleModeChange = (value: string) => {
    const next = value as Mode;
    setMode(next);
    analytics.uploadModeSelected({ mode: next });
  };

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-white text-3xl font-bold">Add Music</h1>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Go back"
          className="flex items-center justify-center min-w-11 min-h-11 rounded-full cursor-pointer text-gray-400 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <Tabs.Root value={mode} onValueChange={handleModeChange}>
        {/* Mode Selection */}
        <Tabs.List
          aria-label="Upload type"
          className="mb-6 flex items-center gap-3"
        >
          <Tabs.Trigger value="album" className={tabTriggerClass}>
            Add Album / EP
          </Tabs.Trigger>
          <Tabs.Trigger value="song" className={tabTriggerClass}>
            Add Song
          </Tabs.Trigger>
        </Tabs.List>

        {/* Upload Form */}
        <Tabs.Content value="album" className="focus-visible:outline-none">
          {/* Album / EP creation flow (#398) */}
          <ReleaseFlow />
        </Tabs.Content>
        <Tabs.Content value="song" className="focus-visible:outline-none">
          {/* Song Upload Component */}
          <Song />
        </Tabs.Content>
      </Tabs.Root>
    </>
  );
};

export default Upload_Music;
