## Soroban activity (#532)

The frontend now reads `/api/activity/onchain`, paginates the result, and scopes
it to the connected participant and active network. These are indexed event
counts, not complete Stellar account history. Balances and failed transactions
are unavailable from this endpoint.

Artist-owned play/sale totals cannot be derived from the participant address:
`song_played.address` is the listener and `sale.address` is the buyer. The UI
leaves these aggregates unavailable. The last event is also not a trustworthy
indexer heartbeat. Artist contract/token filtering, daily aggregates, and cursor
freshness are requested in:
https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/845

## Public artist URLs (#531)

Use `/artist/<artist UUID>`, matching the backend's own canonical URL. The route
segment retains its existing `[handle]` name to avoid unrelated routing changes;
usernames cannot be resolved by the current backend. Metadata comes from
`/api/artist/:id/metadata`, cached for 300 seconds. An uncached
`/api/users/:id/public` check runs first because the metadata endpoint does not
enforce profile visibility. Private profiles produce a private state and noindex
metadata without exposing the metadata response. Unknown artists return 404.

## Overview (#533)

The frontend adapter targets the existing stats controller's documented
`/api/artists/:id/stats?window=7d|30d|90d|all-time` contract. Backend main does
not mount this controller yet. Live overview KPIs therefore remain unavailable
until the backend route ships. A missing route never falls back to samples.

Plays, unique listeners, saves, song counts, and gross royalty revenue map to
`SongStatsService` fields. Stroops are formatted exactly as XLM, not USD or a
claimed recipient net payout. Followers remain unavailable because the service
does not supply them.

Recent activity uses the authenticated `/api/activity/feed/me` route, scoped
server-side to the signed-in artist, and applies the selected time window. This
feed retains the most recent 90 days. Fan actions involving owned songs still
need server-side attribution.
Routing, followers, revenue semantics, and activity filtering are tracked in:
https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/846
