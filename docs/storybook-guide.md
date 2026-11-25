# Storybook Component Coverage Guide

This guide establishes the Storybook coverage requirements, component classification, and authoring standards for the AudioBlocks Artist Dashboard.

Storybook runs in the `app/` directory (`npm run storybook`) and is built in CI (`npm run build-storybook`) to prevent visual regressions, verify component isolation, and document the design system.

---

## 1. Component Classification Matrix

All UI components across `app/src/components/` are categorized into three coverage tiers determining whether a co-located `.stories.tsx` file is mandatory:

### Tier 1: Core Primitives & Shared Components (Mandatory)
Shared UI elements in `app/src/components/shared/` and common primitives must have comprehensive Storybook stories. These components are reused across multiple pages and must function deterministically in isolation.

| Component Path | Status | Required Story Variants |
| :--- | :--- | :--- |
| `src/components/shared/ConfirmationDialog.tsx` | Mandatory | `Default`, `DestructiveAction`, `OpenWithCustomText`, `LoadingState` |
| `src/components/shared/FileUpload.tsx` | Mandatory | `Idle`, `DragOver`, `UploadingWithProgress`, `InvalidFileTypeError`, `Success` |
| `src/components/shared/MetricCard.tsx` | Mandatory | `StandardMetric`, `PositiveTrend`, `NegativeTrend`, `LoadingSkeleton` |
| `src/components/shared/StatusBadge.tsx` | Mandatory | `Active`, `PendingVerification`, `Suspended`, `Draft` |
| `src/components/shared/Button.tsx` | Mandatory | `Primary`, `Secondary`, `Outline`, `Disabled`, `LoadingSpinner` |
| `src/components/shared/InputField.tsx` | Mandatory | `Empty`, `Filled`, `WithValidationError`, `Disabled` |

### Tier 2: Domain & Dashboard Composite Views (Mandatory)
High-impact interactive views in `app/src/components/dashboard/` and features with visual state variations must have stories covering all lifecycle and authorization states.

| Component Path | Status | Required Story Variants |
| :--- | :--- | :--- |
| `src/components/dashboard/TopHeader.tsx` | Mandatory | `ConnectedArtist`, `UnconnectedWallet`, `WithNotificationsBadge` |
| `src/components/dashboard/Sidebar.tsx` | Mandatory | `Expanded`, `CollapsedMobile`, `ActiveRouteHighlight` |
| `src/components/dashboard/MyMusicContent.tsx` | Mandatory | `PopulatedTrackList`, `EmptyState`, `SingleTrackWithAlbumArt`, `Loading` |
| `src/components/dashboard/MyAlbums.tsx` | Mandatory | `MultiAlbumGrid`, `NoAlbumsCreated`, `DraftAlbumState` |
| `src/components/dashboard/ChangelogTimeline.tsx` | Mandatory | `ReleaseNotesList`, `EmptyChangelogFallback`, `SingleRelease` |
| `src/components/dashboard/IPFSMetadataViewer.tsx`| Mandatory | `FormattedJsonView`, `RawJsonView`, `GatewayErrorState`, `Loading` |
| `src/components/dashboard/TrackEditModal.tsx` | Mandatory | `IdleForm`, `UnsavedChangesPromptOpen`, `SubmittingState` |

### Tier 3: Route Layouts and Non-Visual Logic (Exempt)
The following files do NOT require Storybook stories:
- Next.js App Router entry points (`app/src/app/**/page.tsx`, `layout.tsx`, `error.tsx`, `loading.tsx`) which primarily handle data fetching and router orchestration.
- Custom React hooks (`app/src/hooks/*`) and API services (`app/src/services/*`).
- Global providers (`RoleContext`, `QueryClientProvider`) — these are tested in Vitest and utilized as Storybook decorators.

---

## 2. Story Authoring Standards

### 2.1. File Naming and Placement
Stories must be co-located with their target component using the `*.stories.tsx` suffix:
```
app/src/components/shared/
├── ConfirmationDialog.tsx
└── ConfirmationDialog.stories.tsx
```

### 2.2. Standard Provider Wrapping (Decorators)
Components requiring React Query or `RoleContext` must wrap story renders with standard decorators:

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfirmationDialog } from './ConfirmationDialog';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const meta: Meta<typeof ConfirmationDialog> = {
  title: 'Shared/ConfirmationDialog',
  component: ConfirmationDialog,
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <div className="bg-[#121212] p-6 text-white min-h-[300px]">
          <Story />
        </div>
      </QueryClientProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ConfirmationDialog>;

export const Default: Story = {
  args: {
    isOpen: true,
    title: 'Delete Track',
    message: 'Are you sure you want to permanently delete this track?',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    isDestructive: true,
  },
};
```

---

## 3. Verification & CI Checks

Before opening a PR that introduces or updates a component in Tier 1 or Tier 2:
1. Run local Storybook instance to visually verify all states:
   ```bash
   cd app
   npm run storybook
   ```
2. Run Storybook static compilation to ensure zero type or build regressions:
   ```bash
   cd app
   npm run build-storybook
   ```
