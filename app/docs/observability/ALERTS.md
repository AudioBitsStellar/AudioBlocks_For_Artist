# Alert rules and ownership

Launch-readiness item `OBS-02`. The rules below are what this project expects
configured in the Sentry project; the routing and the on-call are the half that
lives outside the repository and cannot be tested from CI.

## Routing

| What                                     | Where                                                  |
| :--------------------------------------- | :----------------------------------------------------- |
| Every alert below                        | Slack `#audioblocks-alerts` (Sentry Slack integration) |
| P1 alerts (error rate, checkout failure) | PagerDuty service **AudioBlocks Frontend**             |
| P2 alerts (Web Vitals, build health)     | Slack only; triaged in the next working day            |
| Noise, flaky rules, threshold changes    | `#audioblocks-alerts`, owned by the rotation below     |

**On-call.** The PagerDuty schedule **AudioBlocks Frontend** is the named
on-call: one primary and one secondary, rotating weekly, handover Mondays
10:00 UTC. The primary is the person expected to acknowledge a P1; the
secondary is the escalation if the primary does not acknowledge within 15
minutes. The schedule, not this document, is the source of truth for who that
is at any moment.

**Owner of these rules.** Frontend Platform owns the definitions; anyone may
propose a change by pull request against this file, and the change is applied in
Sentry by whoever has project-admin access.

## Rules

Each rule names the Sentry condition in the form the UI presents it, so it can
be recreated without interpretation.

| ID  | Severity | Condition                                                       | Window    | Action                 |
| :-- | :------- | :-------------------------------------------------------------- | :-------- | :--------------------- |
| A1  | P1       | `error.handled:false` count > 25 for `transaction:/dashboard/*` | 5 min     | Slack + PagerDuty page |
| A2  | P1       | Failure rate of `transaction:/api/*` > 5%                       | 10 min    | Slack + PagerDuty page |
| A3  | P1       | Any event with `tags[flow]: checkout` and `level:error`         | immediate | Slack + PagerDuty page |
| A4  | P2       | New issue with `transaction:/dashboard/onchain` (wallet flow)   | immediate | Slack                  |
| A5  | P2       | Event volume > 3× the same hour last week                       | 1 h       | Slack                  |
| A6  | P2       | `web-vitals` LCP p75 > 2500 ms for any route                    | 1 h       | Slack                  |
| A7  | P2       | `web-vitals` CLS p75 > 0.1 for any route                        | 1 h       | Slack                  |

A6 and A7 read the metrics `src/lib/webVitals.ts` reports (each sample carries
its route, so the rule can group by transaction). The thresholds are the same
numbers the frontend performance budget uses; changing one means changing both.

## Deliberately not alerting

- **Individual 401s.** A signed-out tab is a normal state, not an incident.
- **Every new issue.** A new issue is interesting, not urgent; A4 is the
  exception because a broken wallet flow blocks uploads.
- **Replay quota.** Exceeding the replay allowance degrades diagnostics; it
  does not degrade the product.

## Verifying the setup

Sentry's "Test rule" action on each rule is the only check that the route is
wired; run it once after any change to the integration. A rule that has not
fired in 90 days is either dead or wrong — review it at the quarterly
observability pass rather than leaving it in place.
