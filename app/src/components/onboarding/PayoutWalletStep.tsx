"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PayoutWalletSetup } from "@/types/onboarding";
import { useStellarWallet } from "@/components/common/wallet/useStellarWallet";
import MusicLoader from "@/components/MusicLoader";

interface PayoutWalletStepProps {
  onComplete: () => void;
  onBack: () => void;
}

function truncate(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

export default function PayoutWalletStep({ onComplete, onBack }: PayoutWalletStepProps) {
  const { address, isConnecting, connect, restore } = useStellarWallet();
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isValid },
  } = useForm<PayoutWalletSetup>({
    mode: "onChange",
    defaultValues: {
      walletType: "freighter",
      agreedToTerms: false,
    },
  });

  useEffect(() => {
    restore();
  }, [restore]);

  useEffect(() => {
    if (address) {
      setValue("stellarPublicKey", address, { shouldValidate: true });
    }
  }, [address, setValue]);

  const handleConnectWallet = async () => {
    try {
      await connect();
    } catch (error) {
      toast.error("Failed to connect wallet. Please try again.");
    }
  };

  const onSubmit = async (data: PayoutWalletSetup) => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      localStorage.setItem("onboarding_payout_wallet", JSON.stringify(data));
      toast.success("Payout wallet setup complete!");
      onComplete();
    } catch (error) {
      toast.error("Failed to save wallet setup. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Payout Wallet Setup</h2>
        <p className="text-[#A3A3A3]">
          Connect your Stellar wallet to receive royalty payments
        </p>
      </div>

      <div
        className="p-6 rounded-2xl space-y-4"
        style={{ background: "#FFFFFF0A", border: "1px solid #2A2A2A" }}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#D2045B] flex items-center justify-center text-white font-semibold">
            i
          </div>
          <div>
            <h3 className="text-white font-semibold mb-1">Why Stellar?</h3>
            <p className="text-[#A3A3A3] text-sm">
              AudioBlocks uses the Stellar blockchain for fast, low-cost international payments.
              You'll need the Freighter browser extension to receive payments.
            </p>
          </div>
        </div>

        {!address && (
          <a
            href="https://freighter.app"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-[#D2045B] hover:underline text-sm"
          >
            Don't have Freighter? Install it here →
          </a>
        )}
      </div>

      <div className="flex flex-col">
        <label className="text-sm font-medium text-white mb-2">
          Wallet Type <span className="text-red-500">*</span>
        </label>
        <select
          {...register("walletType", { required: "Wallet type is required" })}
          className="text-white focus:outline-none px-4 h-12 rounded-2xl"
          style={{
            background: "#FFFFFF0A",
            border: errors.walletType ? "1px solid #EF4444" : "none",
          }}
        >
          <option value="freighter">Freighter (Recommended)</option>
          <option value="other">Other (Manual Entry)</option>
        </select>
        {errors.walletType && (
          <span role="alert" className="text-xs text-red-500 mt-1">
            {errors.walletType.message}
          </span>
        )}
      </div>

      {address ? (
        <div
          className="p-4 rounded-2xl"
          style={{ background: "#FFFFFF0A", border: "1px solid #2A2A2A" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#A3A3A3]">Connected Wallet</span>
            <span className="h-2 w-2 rounded-full bg-green-500" />
          </div>
          <p className="text-white font-mono text-sm break-all">{address}</p>
          <p className="text-[#A3A3A3] text-xs mt-2">
            Your royalties will be sent to this Stellar address
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleConnectWallet}
          disabled={isConnecting}
          className={`${
            isConnecting
              ? "opacity-70 cursor-not-allowed"
              : "hover:bg-[#B8043F]"
          } w-full rounded-lg bg-[#D2045B] text-white font-semibold px-6 py-3 transition-colors`}
        >
          {isConnecting ? <MusicLoader small /> : "Connect Freighter Wallet"}
        </button>
      )}

      <input
        type="hidden"
        {...register("stellarPublicKey", {
          required: "Please connect your wallet",
        })}
      />
      {errors.stellarPublicKey && (
        <span role="alert" className="text-xs text-red-500">
          {errors.stellarPublicKey.message}
        </span>
      )}

      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="agreedToTerms"
          {...register("agreedToTerms", {
            required: "You must agree to the terms and conditions",
          })}
          className="mt-1 w-4 h-4 rounded border-[#2A2A2A] bg-[#FFFFFF0A] text-[#D2045B] focus:ring-[#D2045B]"
        />
        <label htmlFor="agreedToTerms" className="text-sm text-white">
          I agree to the{" "}
          <a href="/terms" className="text-[#D2045B] hover:underline">
            Terms and Conditions
          </a>{" "}
          and{" "}
          <a href="/privacy" className="text-[#D2045B] hover:underline">
            Privacy Policy
          </a>
          . I understand that payments will be made to my connected Stellar wallet.
          <span className="text-red-500"> *</span>
        </label>
      </div>
      {errors.agreedToTerms && (
        <span role="alert" className="text-xs text-red-500">
          {errors.agreedToTerms.message}
        </span>
      )}

      <div className="flex gap-4">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-lg border border-[#2A2A2A] text-white font-semibold px-6 py-3 hover:bg-[#FFFFFF0A] transition-colors"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={!isValid || isLoading}
          className={`${
            !isValid || isLoading
              ? "opacity-50 cursor-not-allowed"
              : "cursor-pointer hover:bg-[#B8043F]"
          } flex-1 rounded-lg bg-[#D2045B] text-white font-semibold px-6 py-3 transition-colors`}
        >
          {isLoading ? <MusicLoader small /> : "Complete Setup"}
        </button>
      </div>
    </form>
  );
}
