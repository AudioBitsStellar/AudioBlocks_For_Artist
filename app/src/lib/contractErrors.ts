/**
 * Soroban contract error handling (#288).
 *
 * Maps raw contract error codes and messages to user-friendly text
 * with actionable suggestions. Keeps raw errors in dev console
 * for debugging while showing clean messages in the UI.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ContractErrorInfo {
  /** Short, user-friendly title */
  title: string;
  /** Longer explanation */
  message: string;
  /** Category for UI grouping */
  category: "auth" | "network" | "contract" | "validation" | "insufficient" | "unknown";
  /** Severity for display */
  severity: "error" | "warning" | "info";
  /** Actionable steps for the user */
  resolution: string[];
}

// ── Error pattern map ─────────────────────────────────────────────────────────

const ERROR_PATTERNS: Array<{ pattern: RegExp; info: ContractErrorInfo }> = [
  // Contract upgrade (#295) - specific patterns take priority over generic auth/contract
  {
    pattern: /upgrade.*unauthorized|unauthorized.*upgrade|only.*admin.*upgrade|upgrade.*forbidden/i,
    info: {
      title: "Upgrade Unauthorized",
      message: "Only the designated contract administrator is authorized to upgrade this Soroban contract.",
      category: "auth",
      severity: "error",
      resolution: [
        "Connect with the contract admin wallet",
        "Verify on-chain contract administrator configuration",
      ],
    },
  },
  {
    pattern: /wasm.*not.*found|wasm.*not.*installed|invalid.*wasm/i,
    info: {
      title: "WASM Bytecode Not Installed",
      message: "The specified WASM bytecode hash has not been installed on the Soroban network.",
      category: "contract",
      severity: "error",
      resolution: [
        "Upload and install the WASM bytecode first using 'stellar contract install'",
        "Verify that the 64-character hexadecimal WASM hash matches the installed bytecode",
      ],
    },
  },
  {
    pattern: /already.*upgraded|same.*wasm.*hash|identical.*wasm/i,
    info: {
      title: "Identical WASM Hash",
      message: "The contract is already running the specified WASM bytecode.",
      category: "validation",
      severity: "warning",
      resolution: [
        "Provide a new WASM hash that differs from the currently deployed contract hash",
      ],
    },
  },

  // Authorization
  {
    pattern: /auth|unauthorized|forbidden|not\s*authorized/i,
    info: {
      title: "Authorization Required",
      message: "Your wallet does not have permission for this action.",
      category: "auth",
      severity: "error",
      resolution: [
        "Make sure you are connected with the correct wallet",
        "Check that the transaction was signed by the right account",
      ],
    },
  },
  {
    pattern: /signature|verify.*signature|invalid.*signature/i,
    info: {
      title: "Invalid Signature",
      message: "The transaction signature could not be verified.",
      category: "auth",
      severity: "error",
      resolution: [
        "Try signing the transaction again",
        "Ensure your wallet is on the correct network",
      ],
    },
  },

  // Insufficient resources
  {
    pattern: /insufficient.*balance|not.*enough.*funds|low.*balance/i,
    info: {
      title: "Insufficient Balance",
      message: "Your account does not have enough XLM to complete this transaction.",
      category: "insufficient",
      severity: "error",
      resolution: [
        "Check your XLM balance in your wallet",
        "Add more XLM to your account",
      ],
    },
  },
  {
    pattern: /insufficient.*fee|fee.*too.*low|base.*fee/i,
    info: {
      title: "Transaction Fee Too Low",
      message: "The network fee is too low for current conditions.",
      category: "network",
      severity: "warning",
      resolution: [
        "The fee will be recalculated automatically — try again",
      ],
    },
  },

  // Contract-specific
  {
    pattern: /contract.*not.*found|no.*contract/i,
    info: {
      title: "Contract Not Found",
      message: "The smart contract could not be found on the network.",
      category: "contract",
      severity: "error",
      resolution: [
        "Verify you are on the correct network (testnet/mainnet)",
        "Try refreshing the page",
      ],
    },
  },
  {
    pattern: /contract.*error|invoke.*error|smart.*contract.*fail/i,
    info: {
      title: "Smart Contract Error",
      message: "The contract encountered an error during execution.",
      category: "contract",
      severity: "error",
      resolution: [
        "Try the operation again",
        "Check that all parameters are valid",
      ],
    },
  },
  {
    pattern: /already.*exist|duplicate|conflict/i,
    info: {
      title: "Already Processed",
      message: "This operation has already been completed.",
      category: "contract",
      severity: "warning",
      resolution: [
        "Check your transaction history",
        "No action needed if it already succeeded",
      ],
    },
  },


  // Network
  {
    pattern: /network.*error|connection.*refused|fetch.*fail|ETIMEDOUT/i,
    info: {
      title: "Network Error",
      message: "Could not connect to the Stellar network.",
      category: "network",
      severity: "error",
      resolution: [
        "Check your internet connection",
        "Try again in a few moments",
      ],
    },
  },
  {
    pattern: /timeout|timed?\s*out|expired/i,
    info: {
      title: "Transaction Expired",
      message: "The transaction was not confirmed before it expired.",
      category: "network",
      severity: "error",
      resolution: [
        "Try submitting the transaction again",
        "Check your network connection",
      ],
    },
  },
  {
    pattern: /sequence|bad.*sequence/i,
    info: {
      title: "Account Sequence Error",
      message: "The account sequence number is incorrect.",
      category: "contract",
      severity: "error",
      resolution: [
        "Refresh your account and try again",
        "Wait for pending transactions to complete",
      ],
    },
  },

  // Validation
  {
    pattern: /invalid.*address|bad.*address|not.*valid.*stellar/i,
    info: {
      title: "Invalid Address",
      message: "The Stellar address is not in a valid format.",
      category: "validation",
      severity: "error",
      resolution: [
        "Check the address for typos",
        "Ensure it starts with G (account) or C (contract)",
      ],
    },
  },
  {
    pattern: /invalid.*amount|bad.*amount|non.*numeric/i,
    info: {
      title: "Invalid Amount",
      message: "The amount entered is not valid.",
      category: "validation",
      severity: "error",
      resolution: [
        "Enter a valid positive number",
        "Check for special characters",
      ],
    },
  },
];

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Translate a contract error into user-friendly info.
 *
 * Logs the raw error to console in dev mode and returns clean
 * UI text. Works with Error instances, strings, or unknown values.
 *
 * @example
 * const info = translateContractError(error);
 * toast.error(info.title);
 */
export function translateContractError(error: unknown): ContractErrorInfo {
  const rawMessage = extractMessage(error);
  const rawName = extractName(error);

  // Dev-only: keep raw error visible for debugging
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    console.debug("[ContractError]", rawName, rawMessage);
  }

  for (const { pattern, info } of ERROR_PATTERNS) {
    if (pattern.test(rawMessage) || pattern.test(rawName)) {
      return info;
    }
  }

  return {
    title: "Unexpected Error",
    message: rawMessage || "An unexpected error occurred while interacting with the smart contract.",
    category: "unknown",
    severity: "error",
    resolution: [
      "Try the operation again",
      "If the issue persists, disconnect and reconnect your wallet",
    ],
  };
}

/**
 * Get a short title for toast notifications.
 */
export function getContractErrorTitle(error: unknown): string {
  return translateContractError(error).title;
}

/**
 * Get resolution steps for detail views.
 */
export function getContractErrorResolution(error: unknown): string[] {
  return translateContractError(error).resolution;
}

/**
 * Check if an error matches a specific category.
 */
export function isContractErrorCategory(
  error: unknown,
  category: ContractErrorInfo["category"]
): boolean {
  return translateContractError(error).category === category;
}

// ── Internal ──────────────────────────────────────────────────────────────────

function extractMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "";
}

function extractName(error: unknown): string {
  if (error instanceof Error) return error.name;
  if (error && typeof error === "object" && "name" in error) {
    return String((error as { name: unknown }).name);
  }
  return "";
}
