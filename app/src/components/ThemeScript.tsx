import { themeInitScript } from "@/utils/theme";

/**
 * Applies the stored theme to `<html>` before the browser paints (#423).
 *
 * Rendered as the first child of `<body>` in the root layout. It is
 * intentionally synchronous and inline — a deferred or external script would run
 * after first paint and reintroduce the white flash on dark-mode loads.
 */
export default function ThemeScript() {
  return <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: themeInitScript }} />;
}
