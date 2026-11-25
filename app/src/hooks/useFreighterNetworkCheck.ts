import { useEffect, useState } from "react";
import {
  classifyFreighterError,
  getFreighterNetworkDetails,
  type FreighterRecoveryState,
} from "@/lib/freighter";
import { getActiveNetwork } from "@/lib/stellarNetwork";

export type FreighterNetworkStatus = "checking" | "ok" | "mismatch" | FreighterRecoveryState;

export interface FreighterNetworkCheck {
  status: FreighterNetworkStatus;
  expected: string;
  actual: string | null;
}

export function useFreighterNetworkCheck(): FreighterNetworkCheck {
  const [check, setCheck] = useState<FreighterNetworkCheck>({
    status: "checking",
    expected: "",
    actual: null,
  });

  useEffect(() => {
    const checkNetwork = async () => {
      const expected = getActiveNetwork().networkPassphrase;
      try {
        const details = await getFreighterNetworkDetails();

        if (!details) {
          setCheck({ status: "missing", expected, actual: null });
          return;
        }

        const actual = details.networkPassphrase;
        const status = actual === expected ? "ok" : "mismatch";
        setCheck({ status, expected, actual });
      } catch (error: unknown) {
        setCheck({ status: classifyFreighterError(error), expected, actual: null });
      }
    };

    checkNetwork();

    const handleFocus = () => checkNetwork();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  return check;
}
