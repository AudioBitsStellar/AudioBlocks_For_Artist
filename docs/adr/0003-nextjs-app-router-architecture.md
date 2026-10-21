# ADR 0003: Next.js App Router for Application Framework

## Status
Accepted

## Context
AudioBlocks For Artist needs a modern React framework that supports:
- Server-side rendering (SSR) for SEO and performance
- Client-side interactivity for dashboard features
- File-based routing
- API routes for backend functionality
- Static generation where appropriate
- Good developer experience

## Decision
We will use Next.js 14+ with the App Router architecture.

## Rationale
Next.js App Router provides:
- **Server Components**: Better performance by default with selective client-side hydration
- **Streaming SSR**: Progressive rendering for faster Time to First Byte
- **Layout composition**: Shared layouts with automatic code splitting
- **Built-in optimizations**: Image optimization, font optimization, automatic code splitting
- **API Routes**: Backend API in the same codebase
- **TypeScript support**: First-class TypeScript integration
- **File-based routing**: Intuitive project structure

Key features for our use case:
- Server components reduce JavaScript bundle size for static content
- Client components (with "use client") for interactive dashboard features
- Middleware for authentication and CSRF protection
- API routes for backend business logic

Alternatives considered:
- **Create React App**: No SSR, limited optimization features, deprecated
- **Vite + React Router**: Great DX but requires more setup for SSR
- **Remix**: Excellent but smaller ecosystem than Next.js
- **Next.js Pages Router**: Older architecture, less capable than App Router

## Consequences

### Positive
- Best-in-class performance with Server Components
- SEO-friendly with SSR for public pages
- Unified codebase for frontend and API
- Strong ecosystem and community support
- Automatic optimizations without configuration

### Negative
- App Router learning curve for team members
- Server/Client component boundaries require careful planning
- Some third-party libraries not compatible with Server Components
- Build times can be slower for large applications

## Implementation Notes
- Use Server Components by default for static content
- Mark components with "use client" only when needed (hooks, event handlers, browser APIs)
- API routes in `app/api` directory
- Middleware in root `middleware.ts` for auth and CSRF checks
- Dynamic imports for code splitting where appropriate
