import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";
import { brandColors } from "@/theme/colors";
import { defaultMetadata } from "@/utils/metadata";

const PUBLIC_DIR = path.resolve(process.cwd(), "public");

describe("PWA manifest & service worker precache (#583)", () => {
  it("exports a valid Next.js web app manifest with brand colors and required icons", () => {
    const data = manifest();
    expect(data.name).toBe("AudioBlocks Artist Dashboard");
    expect(data.short_name).toBe("AudioBlocks");
    expect(data.start_url).toBe("/dashboard/overview");
    expect(data.display).toBe("standalone");
    expect(data.theme_color).toBe(brandColors.primary);
    expect(data.background_color).toBe(brandColors.background);

    const icons = data.icons ?? [];
    expect(icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ src: "/icons/icon-192x192.png", sizes: "192x192" }),
        expect.objectContaining({ src: "/icons/icon-512x512.png", sizes: "512x512" }),
        expect.objectContaining({
          src: "/icons/icon-512x512-maskable.png",
          sizes: "512x512",
          purpose: "maskable",
        }),
      ])
    );

    for (const icon of icons) {
      const iconPath = path.join(PUBLIC_DIR, icon.src.replace(/^\//, ""));
      expect(fs.existsSync(iconPath), `Missing icon file: ${icon.src}`).toBe(true);
    }

    expect(defaultMetadata.manifest).toBe("/manifest.webmanifest");
  });

  it("removes redirecting and unused create-next-app assets from sw.js and public/", () => {
    const swSource = fs.readFileSync(path.join(PUBLIC_DIR, "sw.js"), "utf-8");
    expect(swSource).not.toContain('"/dashboard"');
    expect(swSource).not.toContain('"/next.svg"');
    expect(swSource).not.toContain('"/vercel.svg"');

    for (const unused of ["next.svg", "vercel.svg", "file.svg", "globe.svg", "window.svg"]) {
      expect(fs.existsSync(path.join(PUBLIC_DIR, unused))).toBe(false);
    }
  });
});
