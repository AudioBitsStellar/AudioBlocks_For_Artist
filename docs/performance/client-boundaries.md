# Client-component boundary audit

## Scope and method

The audit searched `app/src/app` and `app/src/components` for `"use client"`,
then reviewed the largest route modules and client-side API/storage patterns.
At the audit baseline, 37 route modules and 106 component modules declared a
client boundary. A directive is not by itself a problem: forms, browser storage,
event handlers, and interactive charts still need client rendering.

## Highest-impact findings

| Area                           | Finding                                                                                                                             | Action                                                                                                                                                                                   |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard profile (622 lines)  | Fetches the signed-in profile through React Query before populating the editor.                                                     | The route now prefetches from the server with the httpOnly session cookie and passes the result to the client form; a short query freshness window avoids a duplicate hydration request. |
| Dashboard analytics            | The route was already a Server Component, but its chart dashboard waited for a client query to load the initial analytics response. | The route now prefetches the default 30-day response; chart controls and alternate-period queries remain client-side.                                                                    |
| Dashboard team (339 lines)     | Roster and feature state are read from browser storage; invite and role actions are interactive.                                    | Retained as a Client Component.                                                                                                                                                          |
| Linked accounts (330 lines)    | Existing account state is backed by browser storage and is edited interactively.                                                    | Retained as a Client Component.                                                                                                                                                          |
| Dashboard messages (306 lines) | Conversation state and the message composer are client-managed.                                                                     | Retained as a Client Component.                                                                                                                                                          |
| Dashboard overview             | Widget visibility and order are persisted in localStorage; each widget has its own interactive data surface.                        | Retained as a Client Component; the widgets are already loaded on demand.                                                                                                                |

The public artist profile and landing routes already render as Server Components.
The profile editor, chart rendering, forms, and other browser-dependent controls
remain isolated in client modules rather than moving browser APIs to the server.

## Authentication and fallback

The server prefetch helper reads the access token only from the httpOnly session
cookie, sends authenticated requests with `cache: "no-store"`, and never passes
the token to client code. If there is no session cookie or the backend returns
401, the existing client query remains enabled and uses the same-origin proxy,
which handles refresh-token rotation. Other server prefetch failures are logged
and also fall back to the existing client query.

## Result

The profile and analytics data-fetching boundaries now render their first
available data on the server. No performance-size claim is made here; the
remaining large client surfaces depend on browser state or user interaction and
should be reconsidered when those data sources move to authenticated server
APIs.
