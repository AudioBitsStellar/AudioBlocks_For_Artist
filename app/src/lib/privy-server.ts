/**
 * Server-side Privy utilities
 *
 * This file provides utilities for verifying Privy tokens on the server-side.
 * Use these functions in API routes or server components to authenticate users.
 */

import { PrivyClient } from "@privy-io/server-auth";

/**
 * Initialize Privy client for server-side authentication
 * Only call this on the server-side (API routes, server components)
 */
export function getPrivyClient() {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error(
      "NEXT_PUBLIC_PRIVY_APP_ID and PRIVY_APP_SECRET must be set in environment variables"
    );
  }

  return new PrivyClient(appId, appSecret);
}

/**
 * Verify a Privy access token
 * @param token - The access token to verify
 * @returns The verified user claims
 */
export async function verifyPrivyToken(token: string) {
  const client = getPrivyClient();

  try {
    const claims = await client.verifyAuthToken(token);
    return { success: true, claims };
  } catch (error) {
    console.error("Failed to verify Privy token:", error);
    return { success: false, error: "Invalid token" };
  }
}

/**
 * Example usage in an API route:
 *
 * ```typescript
 * import { verifyPrivyToken } from "@/lib/privy-server";
 *
 * export async function GET(request: Request) {
 *   const authHeader = request.headers.get("authorization");
 *   const token = authHeader?.replace("Bearer ", "");
 *
 *   if (!token) {
 *     return Response.json({ error: "Unauthorized" }, { status: 401 });
 *   }
 *
 *   const result = await verifyPrivyToken(token);
 *
 *   if (!result.success) {
 *     return Response.json({ error: "Invalid token" }, { status: 401 });
 *   }
 *
 *   // User is authenticated
 *   return Response.json({ user: result.claims });
 * }
 * ```
 */
