# ADR 0001: Use React Query for Data Fetching and State Management

## Status

Accepted

## Context

AudioBlocks For Artist requires robust client-side data fetching, caching, and synchronization with the backend API. The application needs to handle:

- Efficient data fetching with caching
- Automatic background refetching
- Optimistic updates
- Request deduplication
- Error handling and retry logic

## Decision

We will use React Query (TanStack Query) as our primary data fetching and server-state management library.

## Rationale

React Query provides:

- **Automatic caching**: Reduces unnecessary network requests
- **Background refetching**: Keeps data fresh without manual intervention
- **Declarative API**: Simplifies component logic with hooks like `useQuery` and `useMutation`
- **Built-in retry logic**: Handles transient network failures gracefully
- **DevTools**: Excellent debugging experience
- **TypeScript support**: First-class TypeScript integration
- **Small bundle size**: Minimal performance impact

Alternatives considered:

- **Redux + Redux Thunk/Saga**: More boilerplate, doesn't handle caching well
- **SWR**: Similar to React Query but less feature-rich
- **Native fetch with useState**: Too much manual work, no caching

## Consequences

### Positive

- Reduced boilerplate code for data fetching
- Better user experience with cached data
- Easier to maintain and test
- Automatic handling of loading and error states

### Negative

- Additional dependency to maintain
- Learning curve for team members unfamiliar with React Query
- Need to configure query client properly for optimal performance

## Implementation Notes

- Query client configuration is in `app/src/api/queryClient.ts`
- Cache policies are defined in `app/src/api/cachePolicy.ts`
- All API calls should use React Query hooks where possible
