import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { useTransactionSignReview } from "@/components/common/wallet/TransactionSignReview";

const SUMMARY = {
  action: "Transfer song NFT",
  amount: "1 song NFT (no XLM transfer)",
  recipient: "GRECIPIENTADDRESS",
  contract: "AudioBlocks Catalog contract",
  fee: "~0.0000500 XLM (estimated)",
};

function ReviewHarness() {
  const { requestReview, reviewDialog } = useTransactionSignReview();
  const [result, setResult] = useState("");

  const requestSignature = async () => {
    const approved = await requestReview(SUMMARY);
    setResult(approved ? "approved" : "cancelled");
  };

  return (
    <>
      <button onClick={requestSignature}>Request signature</button>
      {reviewDialog}
      {result && <p role="status">{result}</p>}
    </>
  );
}

describe("TransactionSignReview", () => {
  it("shows transaction details and resolves only after approval or cancellation", async () => {
    render(<ReviewHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Request signature" }));

    const dialog = await screen.findByRole("dialog", { name: "Review transaction" });
    expect(dialog).toHaveTextContent(SUMMARY.action);
    expect(dialog).toHaveTextContent(SUMMARY.amount);
    expect(dialog).toHaveTextContent(SUMMARY.recipient);
    expect(dialog).toHaveTextContent(SUMMARY.contract);
    expect(dialog).toHaveTextContent(SUMMARY.fee);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(await screen.findByRole("status")).toHaveTextContent("cancelled");

    fireEvent.click(screen.getByRole("button", { name: "Request signature" }));
    await screen.findByRole("dialog", { name: "Review transaction" });
    fireEvent.click(screen.getByRole("button", { name: "Continue to Freighter" }));
    expect(await screen.findByRole("status")).toHaveTextContent("approved");
  });
});
