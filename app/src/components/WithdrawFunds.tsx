"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";
import { validateWithdrawal, type WithdrawErrors, type WithdrawInput } from "@/utils/artistPortal";

interface WithdrawFundsProps {
  /** Available balance in XLM as a decimal string. */
  availableBalance: string;
  /** Performs the withdrawal; resolves to the transaction hash. */
  onWithdraw: (input: WithdrawInput) => Promise<string>;
}

type Step = "form" | "confirm" | "submitting" | "success" | "error";

export default function WithdrawFunds({ availableBalance, onWithdraw }: WithdrawFundsProps) {
  const [input, setInput] = useState<WithdrawInput>({ amount: "", destination: "" });
  const [errors, setErrors] = useState<WithdrawErrors>({});
  const [step, setStep] = useState<Step>("form");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const review = (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateWithdrawal(input, availableBalance);
    setErrors(found);
    if (Object.keys(found).length === 0) setStep("confirm");
  };

  const confirm = async () => {
    setStep("submitting");
    try {
      setTxHash(
        await onWithdraw({ amount: input.amount.trim(), destination: input.destination.trim() })
      );
      setStep("success");
    } catch (err) {
      setFailure(err instanceof Error ? err.message : "Withdrawal failed. Please try again.");
      setStep("error");
    }
  };

  const reset = () => {
    setInput({ amount: "", destination: "" });
    setErrors({});
    setTxHash(null);
    setFailure(null);
    setStep("form");
  };

  return (
    <div className="bg-[#1f2622] border border-[#2d3d2d] rounded-lg p-6">
      <div className="flex items-center gap-2 mb-2">
        <Wallet size={20} className="text-pink-500" aria-hidden="true" />
        <h2 className="text-white text-lg font-semibold">Withdraw Funds</h2>
      </div>
      <p className="text-gray-400 text-sm mb-6">
        Available: <span className="text-white font-semibold">{availableBalance} XLM</span>
      </p>

      {step === "form" && (
        <form onSubmit={review} noValidate className="space-y-4">
          <div>
            <label htmlFor="withdraw-amount" className="block text-sm text-gray-300 mb-1">
              Amount (XLM)
            </label>
            <input
              id="withdraw-amount"
              inputMode="decimal"
              value={input.amount}
              onChange={(e) => setInput({ ...input, amount: e.target.value })}
              aria-invalid={Boolean(errors.amount)}
              aria-describedby={errors.amount ? "withdraw-amount-error" : undefined}
              className="w-full bg-[#2d3d2d] text-white rounded px-3 py-2"
            />
            {errors.amount && (
              <p id="withdraw-amount-error" role="alert" className="text-red-400 text-xs mt-1">
                {errors.amount}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="withdraw-destination" className="block text-sm text-gray-300 mb-1">
              Destination Stellar address
            </label>
            <input
              id="withdraw-destination"
              autoComplete="off"
              spellCheck={false}
              value={input.destination}
              onChange={(e) => setInput({ ...input, destination: e.target.value })}
              aria-invalid={Boolean(errors.destination)}
              aria-describedby={errors.destination ? "withdraw-destination-error" : undefined}
              className="w-full bg-[#2d3d2d] text-white rounded px-3 py-2 font-mono text-xs"
            />
            {errors.destination && (
              <p id="withdraw-destination-error" role="alert" className="text-red-400 text-xs mt-1">
                {errors.destination}
              </p>
            )}
          </div>
          <button type="submit" className="bg-pink-500 text-white rounded px-4 py-2 font-semibold">
            Review withdrawal
          </button>
        </form>
      )}

      {(step === "confirm" || step === "submitting") && (
        <div className="space-y-4">
          <p className="text-white">
            Send <span className="font-semibold">{input.amount.trim()} XLM</span> to{" "}
            <span className="font-mono text-xs break-all">{input.destination.trim()}</span>?
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={confirm}
              disabled={step === "submitting"}
              className="bg-pink-500 text-white rounded px-4 py-2 font-semibold disabled:opacity-50"
            >
              {step === "submitting" ? "Withdrawing…" : "Confirm withdrawal"}
            </button>
            <button
              type="button"
              onClick={() => setStep("form")}
              disabled={step === "submitting"}
              className="text-gray-300 px-4 py-2"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {step === "success" && (
        <div role="status" className="space-y-3">
          <p className="text-green-400 font-semibold">Withdrawal submitted.</p>
          {txHash && (
            <p className="text-gray-400 text-xs font-mono break-all">Transaction: {txHash}</p>
          )}
          <button type="button" onClick={reset} className="text-pink-500 underline text-sm">
            Make another withdrawal
          </button>
        </div>
      )}

      {step === "error" && (
        <div role="alert" className="space-y-3">
          <p className="text-red-400 font-semibold">{failure}</p>
          <button
            type="button"
            onClick={() => setStep("confirm")}
            className="text-pink-500 underline text-sm"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

export { WithdrawFunds };
