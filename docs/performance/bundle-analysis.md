# Client bundle analysis — PERF-02

Measured with Next.js 16.1.5's Turbopack analyzer on 2026-11-22. The baseline
is `ce3e901` (`main`); the candidate is this issue branch. Both used the same
Next.js version and runtime settings; the candidate additionally removes the
unused `jsqr` dependency. The analyzer command was:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001 \
NEXT_PUBLIC_API_URL=http://localhost:3001 \
npx next experimental-analyze --output
```

Sizes below are analyzer-emitted JavaScript bytes and gzip estimates. A
deferred chunk is fetched only when its feature is used; its size is not a
reduction in total bytes after that feature has loaded.

## Findings and changes

| Dependency | Production use | Result |
| --- | --- | --- |
| `framer-motion` | Public navbar's mobile slide-in menu | Moved the animated menu to `MobileMenu.tsx`, dynamically loaded on the first menu open. The navbar chunk changed from **128,614 B / 60,517 B gzip** to **38,115 B / 18,579 B gzip**: **−90,499 B / −41,938 B gzip** (69.3% less gzip on that chunk). The deferred menu chunk is **125,814 B / 59,627 B gzip**. This is a first-load deferral, not a claim that the menu's code is eliminated. |
| `qrcode` | Event ticket QR generation and download | Removed the eager `downloadQRCode` import and dynamically imports the generator for display/download; the generator dynamically imports `qrcode` when called. The ticket route's component chunk changed from **4,980 B / 2,728 B gzip** to **3,083 B / 1,770 B gzip** (−1,897 B / −958 B gzip). The generator is in a separate **1,183 B / 530 B gzip** chunk. The analyzer also reports an unchanged shared `qrcode` package chunk, so no package-level saving is claimed. |
| `recharts` | Overview and analytics charts | Already route-split using `next/dynamic`; analytics charts also wait for their viewport section. No additional split was needed. |
| `jsqr` | Imported only by the QR unit test, where it was unused | Removed the test-only import and the production dependency. It contributed no production client JavaScript in the baseline. |
| `react-slick` | Only imported by the unreferenced `Discover` component | No production route imports it. `slick-carousel` styles are still imported by the root layout; replacement/removal is tracked separately in [#754](https://github.com/AudioBitsStellar/AudioBlocks_For_Artist/issues/754). |

## Validation notes

`next experimental-analyze --output` completed successfully for both revisions.
The baseline `npm run build` could not produce a normal production build: it
stopped on 16 existing compilation errors, including duplicate declarations in
`EarningsRoyalties.tsx`, `Song.tsx`, and `onchainStatsService.ts`. The analyzer
was used for the before/after comparison because it can emit route data without
a successful application build. Those unrelated build errors were not changed
as part of PERF-02.
