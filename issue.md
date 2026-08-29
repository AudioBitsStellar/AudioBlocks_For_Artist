#264 fix: MyMusicContent uses isLoading with fake 600ms timer
Repo Avatar
AudioBitsStellar/AudioBlocks_For_Artist
setTimeout(() => setIsLoading(false), 600) not tied to real data fetching.

Acceptance Criteria: Tie loading state to actual data fetching

#263 docs: Add API documentation for service layer
Repo Avatar
AudioBitsStellar/AudioBlocks_For_Artist
No documentation for API endpoints, request/response shapes.

Acceptance Criteria: Document all service endpoints



#102 Add error boundary fallback UI with retry button
Repo Avatar
AudioBitsStellar/AudioBlocks_For_Artist
What
Enhance the existing ErrorBoundary component to display a user-friendly fallback UI with a retry button and error details toggle.

Why
When a component crashes, users currently see a raw error or blank screen. A polished fallback UI with retry capability lets artists recover from transient errors without refreshing the entire page.

Scope
In scope:

Redesign the ErrorBoundary fallback to show a friendly message with illustration
Add a "Try Again" button that re-renders the failed component
Add a collapsible "Show Details" section with error message and stack trace
Log errors to console for debugging
Out of scope:

Error reporting services (Sentry, etc.)
Automatic retry logic
Changes to how errors are caught
Acceptance Criteria
 Fallback UI shows a clear message like "Something went wrong"
 Retry button re-mounts the failed component tree
 Error details are hidden by default but expandable
 Fallback is styled consistently with the app's design system
Technical Context
ErrorBoundary at app/src/components/ErrorBoundary/
Wrap major page sections (dashboard, music list, etc.)

#171 Add form auto-save for long forms
Repo Avatar
AudioBitsStellar/AudioBlocks_For_Artist
What
Implement auto-save functionality for multi-step forms (music upload, merch creation, event creation) to prevent data loss if the user navigates away or the browser crashes.

Why
Music upload and merch creation involve filling out multiple fields. Losing progress due to accidental navigation, browser crash, or timeout is frustrating and wastes the artist's time.

Scope
In scope:

Save form state to localStorage on change (debounced)
Restore form state on page load
Show "Draft restored" notification when auto-saved data is loaded
Clear auto-saved data on successful form submission
Auto-save interval: 30 seconds or on change
Out of scope:

Server-side draft saving
Auto-save for single-field forms
Draft management UI (list of saved drafts)
Acceptance Criteria
 Multi-step forms auto-save to localStorage
 Form data restores on page reload
 "Draft restored" notification appears when applicable
 Auto-saved data clears after successful submission
 Auto-save doesn't cause performance issues (debounced)
Technical Context
Music upload at app/src/components/musicUpload/
MerchesContent at app/src/components/MerchesContent/