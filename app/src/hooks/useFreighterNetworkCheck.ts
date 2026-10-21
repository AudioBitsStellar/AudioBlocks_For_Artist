import { useEffect, useState } from "react";
import { getFreighterNetworkDetails } from "@/lib/freighter";
import { getActiveNetwork } from "@/lib/stellarNetwork";

export type FreighterNetworkStatus = "ok" | "mismatch" | "not-installed";

export interface FreighterNetworkCheck {
  status: FreighterNetworkStatus;
  expected: string;
  actual: string | null;
}

export function useFreighterNetworkCheck(): FreighterNetworkCheck {
  const [check, setCheck] = useState<FreighterNetworkCheck>({
    status: "ok",
    expected: "",
    actual: null,
  });

  useEffect(() => {
    const checkNetwork = async () => {
      const expected = getActiveNetwork().networkPassphrase;
      const details = await getFreighterNetworkDetails();
      
      if (!details) {
        setCheck({ status: "not-installed", expected, actual: null });
        return;
      }

      const actual = details.networkPassphrase;
      const status = actual === expected ? "ok" : "mismatch";
      setCheck({ status, expected, actual });
    };

    checkNetwork();

    const handleFocus = () => checkNetwork();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  return check;
}
