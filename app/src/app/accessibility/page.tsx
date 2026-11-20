import AccessibilityStatement from "@/components/AccessibilityStatement";

export const metadata = {
  title: "Accessibility Statement | AudioBlocks",
  description: "AudioBlocks commitment to digital accessibility and WCAG 2.1 AA conformance.",
};

export default function PublicAccessibilityPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] py-12">
      <AccessibilityStatement />
    </main>
  );
}
