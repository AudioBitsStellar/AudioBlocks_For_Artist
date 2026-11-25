import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FreighterRecoveryNotice from "@/components/common/wallet/FreighterRecoveryNotice";
import type { FreighterRecoveryState } from "@/lib/freighter";

const RECOVERY_CASES: Array<{
  state: Exclude<FreighterRecoveryState, "other">;
  title: RegExp;
  message: RegExp;
}> = [
  { state: "missing", title: /freighter isn't available/i, message: /install or enable/i },
  { state: "locked", title: /freighter is locked/i, message: /unlock your wallet/i },
  {
    state: "wrong-network",
    title: /wrong network/i,
    message: /switch freighter to the expected stellar network/i,
  },
  {
    state: "rejected",
    title: /signature wasn't approved/i,
    message: /no transaction was signed or submitted/i,
  },
];

describe("FreighterRecoveryNotice", () => {
  it.each(RECOVERY_CASES)(
    "shows recovery copy and retry for $state",
    ({ state, title, message }) => {
      const onRetry = vi.fn();
      render(<FreighterRecoveryNotice state={state} onRetry={onRetry} />);

      expect(screen.getByRole("alert")).toHaveTextContent(title);
      expect(screen.getByRole("alert")).toHaveTextContent(message);
      fireEvent.click(screen.getByRole("button", { name: /retry/i }));
      expect(onRetry).toHaveBeenCalledOnce();
    }
  );

  it("shows the Freighter install link only when the extension is missing", () => {
    const { rerender } = render(<FreighterRecoveryNotice state="missing" onRetry={vi.fn()} />);
    expect(screen.getByRole("link", { name: /get freighter/i })).toHaveAttribute(
      "href",
      "https://freighter.app"
    );

    rerender(<FreighterRecoveryNotice state="locked" onRetry={vi.fn()} />);
    expect(screen.queryByRole("link", { name: /get freighter/i })).not.toBeInTheDocument();
  });
});
