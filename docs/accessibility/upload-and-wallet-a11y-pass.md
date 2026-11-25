# Keyboard and Screen-Reader Accessibility Pass: Upload Flow and Wallet Modals

This report details the manual keyboard navigation, focus management, and screen-reader audit conducted across the **Song/Album Upload Flow** and the **Freighter / Web3 Wallet Connection Modals** in the AudioBlocks Artist Dashboard (`A11Y-02`).

Audited by: Accessibility Hardening Task Force  
Target Standard: WCAG 2.1 Level AA

---

## 1. Scope of Audit

1. **Upload Flow Components**:
   - `app/src/components/musicUpload/Dropzone.tsx` (File drop target)
   - `app/src/components/musicUpload/UploadProgressBar.tsx` (Real-time upload progress)
   - `app/src/components/musicUpload/TrackMetadataForm.tsx` (Form inputs, genre selector, counter)
   - `app/src/components/musicUpload/UnsavedChangesDialog.tsx` (Destructive action alert)
2. **Wallet & Transaction Modals**:
   - `app/src/components/shared/ConnectWalletModal.tsx` / `FreighterConnectDialog.tsx`
   - `app/src/components/shared/ConfirmationDialog.tsx` (Transaction review & sign confirmation)

---

## 2. Keyboard Navigation & Interaction Matrix

| Flow / Element | Expected Keyboard Behavior | Observed Result | WCAG Criterion | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Dropzone trigger** | Focusable via <kbd>Tab</kbd>; activates native file picker on <kbd>Enter</kbd> or <kbd>Space</kbd>. | Focus ring visible (`ring-2 ring-emerald-400`); native dialog triggers properly. | 2.1.1 (Keyboard) | **PASS** |
| **Upload progress bar** | Non-interactive progress indicator; skipped by <kbd>Tab</kbd> cycle. | Has `tabIndex={-1}`; not in tab sequence. | 2.4.3 (Focus Order) | **PASS** |
| **Track metadata inputs** | Orderly <kbd>Tab</kbd> progression from Title → Genre → Description → Price. | Focus moves in logical visual sequence; <kbd>Shift+Tab</kbd> reverses cleanly. | 2.4.3 (Focus Order) | **PASS** |
| **Genre dropdown** | Opens on <kbd>Enter</kbd> or <kbd>Down Arrow</kbd>; navigates options with arrows; closes on <kbd>Escape</kbd>. | Traverses options; selected option announced. | 2.1.1 (Keyboard) | **PASS** |
| **Unsaved changes dialog** | Focus immediately trapped inside modal; closes on <kbd>Escape</kbd> or Cancel. | Focus moves to "Discard" button; focus trap prevents tabbing into obscured page. | 2.1.2 (No Keyboard Trap) | **PASS** |
| **Wallet connection modal** | Focus lands on first wallet option (Freighter); <kbd>Escape</kbd> closes modal and returns focus to trigger. | Focus properly restored to the "Connect Wallet" button in TopHeader upon close. | 2.4.3 (Focus Order) | **PASS** |

---

## 3. Screen-Reader Testing Results (NVDA / VoiceOver)

| Component | ARIA Roles & Properties | Screen Reader Output (VoiceOver/NVDA) | Status |
| :--- | :--- | :--- | :--- |
| **Upload progress bar** | `role="progressbar"`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-valuenow="45"`, `aria-valuetext` | *"Uploading song.mp3, 45 percent, progress indicator"* | **PASS** |
| **Upload status updates** | Polite live region (`aria-live="polite"`, `aria-atomic="true"`) | Announces 25%, 50%, 75%, 100% milestones, plus success or failure without spamming per percent. | **PASS** |
| **Character counters** | Linked via `aria-describedby` to title / description inputs | Read on focus and update during paused typing: *"Track title, maximum 100 characters, 35 remaining"*. | **PASS** |
| **Wallet modal title** | `role="dialog"`, `aria-modal="true"`, `aria-labelledby="wallet-dialog-title"` | Announced as modal dialog; title read immediately upon presentation. | **PASS** |

---

## 4. Defects Filed & Remediated

1. **Defect `A11Y-DEF-01`**: Wallet connect modal lacked `aria-modal="true"`, causing screen readers to browse background content.  
   *Remediation*: Added `aria-modal="true"` and trapped tab focus within the active dialog container.
2. **Defect `A11Y-DEF-02`**: Character counters were updating the live region on every keystroke, causing voice synthesizer stutter.  
   *Remediation*: Debounced live region announcements; `aria-describedby` static link retained for focus inquiries.
3. **Defect `A11Y-DEF-03`**: Focus was lost to document body when closing the unsaved changes warning dialog.  
   *Remediation*: Captured trigger element reference on open and restored focus to `document.activeElement` on dismissal.
