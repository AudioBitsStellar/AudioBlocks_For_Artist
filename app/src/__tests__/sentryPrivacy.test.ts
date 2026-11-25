import { describe, expect, it } from "vitest";
import type { ErrorEvent } from "@sentry/nextjs";

import { isSecretKey, redactEmails, scrubBreadcrumb, scrubEvent } from "@/lib/sentryPrivacy";

// OBS-01's testable half: whatever the app hands to Sentry, the event that
// leaves the process carries no credential and no whole email address.

describe("redactEmails", () => {
  it("keeps the domain and drops the local part", () => {
    expect(redactEmails("failed for ada.lovelace@example.com")).toBe("failed for a***@example.com");
  });

  it("redacts every address in a string", () => {
    expect(redactEmails("a@b.co and c@d.io")).toBe("a***@b.co and a***@d.io");
  });

  it("leaves text without an address alone", () => {
    expect(redactEmails("HTTP 500 from /api/song")).toBe("HTTP 500 from /api/song");
  });
});

describe("isSecretKey", () => {
  it.each([
    "authorization",
    "accessToken",
    "api_key",
    "API-KEY",
    "password",
    "cookie",
    "privySession",
    "signature",
  ])("treats %s as a credential", (key) => {
    expect(isSecretKey(key)).toBe(true);
  });

  it.each(["message", "path", "status", "txHash"])("leaves %s readable", (key) => {
    expect(isSecretKey(key)).toBe(false);
  });
});

// The event's shape, stated locally so assertions do not have to prove that
// Sentry's optional fields are present.
interface TestEvent {
  message: string;
  request: { headers: Record<string, string>; query_string: string };
  extra: {
    apiKey: string;
    endpoint: string;
    nested: { sessionToken: string; note: string };
    attempts: number;
  };
  tags: Record<string, string>;
  breadcrumbs: { message?: string; data?: Record<string, string> }[];
}

describe("scrubEvent", () => {
  const event: TestEvent = {
    message: "checkout failed for ada@example.com",
    request: {
      headers: {
        authorization: "Bearer eyJhbGciOi...",
        "content-type": "application/json",
      },
      query_string: "email=ada@example.com&page=2",
    },
    extra: {
      apiKey: "sk_live_123",
      endpoint: "/artist/merch",
      nested: { sessionToken: "abc", note: "owner: grace@example.com" },
      attempts: 2,
    },
    tags: { route: "/dashboard/overview" },
    breadcrumbs: [
      {
        message: "opened dashboard as ada@example.com",
        data: { password: "hunter2", step: "load" },
      },
    ],
  };

  const scrubbed = scrubEvent(event as unknown as ErrorEvent) as unknown as TestEvent;

  it("redacts emails in the message and in free text", () => {
    expect(scrubbed.message).toBe("checkout failed for a***@example.com");
    expect(scrubbed.request.query_string).toBe("email=a***@example.com&page=2");
    expect(scrubbed.extra.nested.note).toBe("owner: a***@example.com");
  });

  it("filters credential values whatever their key's case or nesting", () => {
    expect(scrubbed.request.headers.authorization).toBe("[Filtered]");
    expect(scrubbed.extra.apiKey).toBe("[Filtered]");
    expect(scrubbed.extra.nested.sessionToken).toBe("[Filtered]");
    expect(scrubbed.breadcrumbs?.[0]?.data?.password).toBe("[Filtered]");
  });

  it("keeps the non-sensitive fields a report is read for", () => {
    expect(scrubbed.extra.endpoint).toBe("/artist/merch");
    expect(scrubbed.extra.attempts).toBe(2);
    expect(scrubbed.tags).toEqual({ route: "/dashboard/overview" });
    expect(scrubbed.request.headers["content-type"]).toBe("application/json");
    expect(scrubbed.breadcrumbs?.[0]?.data?.step).toBe("load");
  });

  it("returns a copy: the caller's error object is not rewritten", () => {
    expect(event.request.headers.authorization).toBe("Bearer eyJhbGciOi...");
    expect(event.extra.apiKey).toBe("sk_live_123");
    expect(scrubbed).not.toBe(event);
  });
});

describe("scrubBreadcrumb", () => {
  it("redacts the message and data but keeps the breadcrumb's identity", () => {
    const breadcrumb = {
      category: "ui.click",
      message: "clicked by ada@example.com",
      data: { token: "abc", label: "Publish" },
    };
    expect(scrubBreadcrumb(breadcrumb)).toEqual({
      category: "ui.click",
      message: "clicked by a***@example.com",
      data: { token: "[Filtered]", label: "Publish" },
    });
  });
});
