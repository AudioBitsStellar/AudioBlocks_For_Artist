'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X, Search, Check } from 'lucide-react';
import { useState, useEffect, memo } from 'react';
import { useRouter } from 'next/navigation';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useAccount } from 'wagmi';
import Cookies from 'js-cookie';
import { useAuth } from '@/hooks/useAuth';
import { createApiClient } from '@/api/axios';
import { toast } from 'sonner';

interface ClaimArtistNameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ClaimArtistNameModal = memo(({ open, onOpenChange }: ClaimArtistNameModalProps) => {
  const [step, setStep] = useState(1);
  const [artistName, setArtistName] = useState('');
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [connectedServices, setConnectedServices] = useState({
    twitter: false,
    facebook: false,
    distrokid: false,
    wallet: false,
  });
  
  const router = useRouter();
  const { setShowAuthFlow } = useDynamicContext();
  const { isConnected } = useAccount();
  const token = Cookies.get('audioblocks_jwt');
  const { setShouldTriggerSignature, loading: authLoading } = useAuth();

  // Sync wallet connection state
  useEffect(() => {
    if (isConnected && token) {
      setConnectedServices(prev => ({ ...prev, wallet: true }));
    } else {
      setConnectedServices(prev => ({ ...prev, wallet: false }));
    }
  }, [isConnected, token]);

  // Check username availability with debounce
  useEffect(() => {
    if (artistName.length > 0) {
      setIsChecking(true);
      // TODO: Replace with real API call when endpoint is available
      // For now, we simulate availability
      const timeoutId = setTimeout(() => {
        setIsAvailable(true); 
        setIsChecking(false);
      }, 500);
      
      return () => clearTimeout(timeoutId);
    } else {
      setIsAvailable(null);
      setIsChecking(false);
    }
  }, [artistName]);

  const handleNext = () => {
    if (step === 1 && isAvailable) {
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleComplete = async () => {
    if (!token) {
      toast.error('Please connect your wallet first');
      handleConnect('wallet');
      return;
    }

    try {
      setIsSubmitting(true);
      const apiClient = await createApiClient();
      
      // Call create-profile endpoint
      await apiClient.post('/artist/create-profile', {
        name: artistName,
        // Add other fields if necessary, e.g. connected services info
      });

      setStep(4);
      setTimeout(() => {
        onOpenChange(false);
        // Reset modal state
        setStep(1);
        setArtistName('');
        setIsAvailable(null);
        setConnectedServices({
          twitter: false,
          facebook: false,
          distrokid: false,
          wallet: false,
        });
        // Redirect to dashboard after completion
        router.push('/dashboard/overview');
      }, 2000);
    } catch (error: any) {
      console.error('Error creating profile:', error);
      toast.error(error.response?.data?.message || 'Failed to create profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConnect = (service: 'twitter' | 'facebook' | 'distrokid' | 'wallet') => {
    if (service === 'wallet') {
      if (!isConnected) {
        setShowAuthFlow(true);
        setShouldTriggerSignature(true);
      } else if (!token) {
        setShouldTriggerSignature(true);
      }
    } else {
      // UI only - just toggle the connection state for others
      setConnectedServices((prev) => ({ ...prev, [service]: !prev[service] }));
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    // Reset state when closing
    setStep(1);
    setArtistName('');
    setIsAvailable(null);
    setIsChecking(false);
    setConnectedServices({
      twitter: false,
      facebook: false,
      distrokid: false,
      wallet: false,
    });
  };

  // Only render when open is true to prevent unnecessary renders
  if (!open) {
    return null;
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} modal={true}>
      <Dialog.Portal>
        <Dialog.Overlay 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm" 
          style={{ zIndex: 99999 }}
        />
        <Dialog.Content 
          className="fixed top-1/2 left-1/2 w-[90%] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-[#0F0F0F] border border-[#2E2E2E] p-8 shadow-xl focus:outline-none text-white"
          style={{ zIndex: 100000 }}
          onEscapeKeyDown={() => {
            onOpenChange(false);
          }}
          onPointerDownOutside={() => {
            onOpenChange(false);
          }}
        >
          {/* Step 1 & 2: Search Artist Name */}
          {(step === 1 || step === 2) && (
            <>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <Dialog.Title className="text-2xl font-semibold text-white mb-2">
                    Search Artist Name
                  </Dialog.Title>
                  <span className="text-sm text-[#A3A3A3]">1/2</span>
                </div>
                <Dialog.Close asChild>
                  <button
                    onClick={handleCancel}
                    className="hover:text-gray-400 transition p-1"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </Dialog.Close>
              </div>

              <p className="text-sm text-[#A3A3A3] mb-6">
                Secure your identity and stand out. Claim your artist name to appear on your public
                profile and releases.
              </p>

              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A3A3A3]" />
                  <input
                    type="text"
                    value={artistName}
                    onChange={(e) => setArtistName(e.target.value)}
                    placeholder="Search artist name"
                    className="w-full pl-12 pr-4 py-3 rounded-lg bg-[#1E1E1E] border border-[#2E2E2E] text-white placeholder-[#A3A3A3] focus:outline-none focus:border-[#D2045B]"
                  />
                </div>
                {isChecking && (
                  <p className="text-sm text-[#A3A3A3] mt-2">Checking availability...</p>
                )}
                {isAvailable === true && artistName.length > 0 && (
                  <p className="text-sm text-green-500 mt-2">Username available</p>
                )}
                {isAvailable === false && (
                  <p className="text-sm text-red-500 mt-2">Username taken</p>
                )}
              </div>

              <div className="flex justify-center mb-6">
                <div className="w-32 h-32 rounded-full bg-[#1E1E1E] border border-[#2E2E2E] flex items-center justify-center">
                  <Search className="w-16 h-16 text-[#A3A3A3]" />
                </div>
              </div>

              <p className="text-sm text-[#A3A3A3] text-center mb-6">
                Every great artist has a name. Lock in yours, verify your identity, and take center
                stage.
              </p>

              <div className="flex gap-4">
                <button
                  onClick={handleCancel}
                  className="flex-1 px-6 py-3 rounded-lg bg-transparent border border-[#2E2E2E] text-white hover:bg-[#1E1E1E] transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleNext}
                  disabled={!isAvailable || isChecking}
                  className="flex-1 px-6 py-3 rounded-lg bg-[#D2045B] text-white hover:bg-[#B8043F] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </>
          )}

          {/* Step 3: Claim Your Artist Name */}
          {step === 3 && (
            <>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <Dialog.Title className="text-2xl font-semibold text-white mb-2">
                    Claim Your Artist Name
                  </Dialog.Title>
                  <span className="text-sm text-[#A3A3A3]">2/2</span>
                </div>
                <Dialog.Close asChild>
                  <button
                    onClick={handleCancel}
                    className="hover:text-gray-400 transition p-1"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </Dialog.Close>
              </div>

              <p className="text-sm text-[#A3A3A3] mb-6">
                Secure your identity and stand out. Claim your artist name, verify your profile, and
                gain credibility on AudioBlocks.
              </p>

              <div className="mb-6">
                <input
                  type="text"
                  value={artistName}
                  readOnly
                  className="w-full px-4 py-3 rounded-lg bg-[#1E1E1E] border border-[#2E2E2E] text-white"
                />
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between p-4 rounded-lg bg-[#1E1E1E] border border-[#2E2E2E]">
                  <span className="text-white">X (Twitter)</span>
                  <button
                    onClick={() => handleConnect('twitter')}
                    className={`px-4 py-2 rounded-lg text-sm ${
                      connectedServices.twitter
                        ? 'bg-green-600 text-white'
                        : 'bg-[#2E2E2E] text-white hover:bg-[#3E3E3E]'
                    }`}
                  >
                    {connectedServices.twitter ? 'Connected' : 'Connect'}
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-[#1E1E1E] border border-[#2E2E2E]">
                  <span className="text-white">Facebook</span>
                  <button
                    onClick={() => handleConnect('facebook')}
                    className={`px-4 py-2 rounded-lg text-sm ${
                      connectedServices.facebook
                        ? 'bg-green-600 text-white'
                        : 'bg-[#2E2E2E] text-white hover:bg-[#3E3E3E]'
                    }`}
                  >
                    {connectedServices.facebook ? 'Connected' : 'Connect'}
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-[#1E1E1E] border border-[#2E2E2E]">
                  <span className="text-white">Distrokid</span>
                  <button
                    onClick={() => handleConnect('distrokid')}
                    className={`px-4 py-2 rounded-lg text-sm ${
                      connectedServices.distrokid
                        ? 'bg-green-600 text-white'
                        : 'bg-[#2E2E2E] text-white hover:bg-[#3E3E3E]'
                    }`}
                  >
                    {connectedServices.distrokid ? 'Connected' : 'Connect'}
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-[#1E1E1E] border border-[#2E2E2E]">
                  <span className="text-white">Wallet Address</span>
                  <button
                    onClick={() => handleConnect('wallet')}
                    disabled={authLoading}
                    className={`px-4 py-2 rounded-lg text-sm ${
                      connectedServices.wallet
                        ? 'bg-green-600 text-white'
                        : 'bg-[#2E2E2E] text-white hover:bg-[#3E3E3E]'
                    }`}
                  >
                    {authLoading ? 'Connecting...' : connectedServices.wallet ? 'Connected' : 'Connect'}
                  </button>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 rounded-lg bg-transparent border border-[#2E2E2E] text-white hover:bg-[#1E1E1E] transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleComplete}
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 rounded-lg bg-[#D2045B] text-white hover:bg-[#B8043F] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Complete'
                  )}
                </button>
              </div>
            </>
          )}

          {/* Step 4: Completed */}
          {step === 4 && (
            <div className="text-center py-8">
              <div className="flex justify-center mb-6">
                <div className="w-24 h-24 rounded-full bg-[#D2045B] flex items-center justify-center">
                  <Check className="w-12 h-12 text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">Completed!</h2>
              <p className="text-sm text-[#A3A3A3]">
                Your Artist Name Has Been Verified, You will be redirected to your dashboard.
              </p>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
});

ClaimArtistNameModal.displayName = 'ClaimArtistNameModal';

export default ClaimArtistNameModal;

