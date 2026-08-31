# Async error-recovery strategy (issue #43)

Error handling for the async flows — **upload music**, **mint song / set up
artist profile**, and **profile save** — was being built piecemeal, so the same
underlying failure produced different UX in each place. This note defines one
model; the implementation lives in `app/src/utils/errorRecovery.ts` and is
reused by every flow.

## The taxonomy

Every failure caught in these flows is one of three kinds:

| Kind              | What it is                                                                                   | Recovery UX                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **retryable**     | Transient transport failure: no response, `408/429/499/5xx`, or a `network`/`timeout` message | Non-destructive "Try again" affordance. **Keep the user's input / uploaded file.** Bounded auto-retry with backoff is allowed at the transport layer (`api/axios.ts`). |
| **user-rejected** | The wallet owner declined to sign the transaction in Freighter                               | Not an error. Reset to the state just before signing and offer "Retry signing". No red error styling. No analytics `*_failed` with a scary reason. |
| **terminal**      | Everything else: `4xx` validation, auth, unexpected exceptions                               | Show the message. Do **not** offer a bare retry that will just fail again — the user has to change something (fix input, reconnect wallet, contact support). |

## The API

```ts
import { classifyError } from "@/utils/errorRecovery";

try {
  await doTheThing();
} catch (err) {
  const plan = classifyError(err); // { kind, message, retryable, userRejected }

  if (plan.userRejected) {
    setStatus("rejected");
    return;
  }
  if (plan.retryable) {
    setStatus("timeout"); // or "failed" with a retry button
  } else {
    setStatus("failed");
  }
  setErrorMsg(plan.message);
}
```

Individual predicates (`isRetryableError`, `isUserRejection`, `getErrorMessage`)
are also exported for cases that only need one check.

## Where it is applied

| Flow          | File                                                             |
| ------------- | --------------------------------------------------------------- |
| Upload music  | `components/musicUpload/Song.tsx`                               |
| Mint song     | `components/common/wallet/MintSongButton.tsx`                   |
| Artist profile setup | `components/common/wallet/SetupArtistOnChainProfile.tsx` |
| Profile save  | `app/dashboard/profile/page.tsx`                                |
| Transport retry | `api/axios.ts` (auto-retry of `retryable` failures)          |

## Manual test checklist

For each flow, with devtools throttling / offline:

- [ ] Fail during the initial request → `retryable`, input preserved, retry works
- [ ] Reject the signature in Freighter → `user-rejected`, no error styling, retry signing works
- [ ] Submit invalid data (bad CID, oversized file) → `terminal`, message shown, no bare retry
