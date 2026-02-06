import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useEffect, useState, useRef } from 'react';
import { useAccount } from 'wagmi';
import Cookies from 'js-cookie';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export const useAuth = () => {
  const { user } = useDynamicContext();
  const { primaryWallet, handleLogOut } = useDynamicContext();
  const { address } = useAccount();
  const [shouldTriggerSignature, setShouldTriggerSignature] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const isAuthenticating = useRef(false);

  useEffect(() => {
    const runSignatureFlow = async () => {
      const currentAddress = address || primaryWallet?.address;
      
      // Debug logging
      console.log('Auth Flow Check:', { 
        userId: user?.userId, 
        hasPrimaryWallet: !!primaryWallet, 
        address: currentAddress, 
        shouldTriggerSignature,
        isAuthenticating: isAuthenticating.current
      });

      if (!shouldTriggerSignature) {
        return;
      }

      if (isAuthenticating.current) {
        console.log('Authentication already in progress, skipping...');
        return;
      }

      if (!user?.userId || !primaryWallet || !currentAddress) {
        console.log('Missing requirements for signature flow - waiting for all fields');
        return;
      }

      isAuthenticating.current = true;
      let timeoutId: NodeJS.Timeout;

      const getSignature = async (email: string) => {
        const url = 'https://audioblock-backend-v2.onrender.com';
        
        console.log('Fetching nonce message from:', `${url}/api/auth/nonce/${email}`);
        
        // Show loading toast for nonce fetch (in case server is sleeping)
        const nonceToastId = toast.loading('Connecting to server...');
        
        try {
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), 60000); // 60s timeout

          const response = await fetch(`${url}/api/auth/nonce/${email}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              // Explicitly remove Authorization header to ensure no stale token is sent
              // In fetch, we just don't include it if we don't want it
            },
            signal: controller.signal
          });
          
          clearTimeout(id);

          if (!response.ok) {
            throw new Error(`Failed to fetch nonce: ${response.status} ${response.statusText}`);
          }

          const data = await response.json();
          
          toast.dismiss(nonceToastId);

          if (!data.success || !data.message) {
            throw new Error('Failed to fetch nonce message from backend');
          }
          
          const message = data.message;
          
          // Create a timeout promise
          const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error('Signature request timed out')), 60000); // 60s timeout
          });

          console.log('Requesting signature from wallet:', primaryWallet.id);
          console.log('Signing message:', message);
          
          // Race the signature request against the timeout
          const signature: any = await Promise.race([
            primaryWallet.signMessage(message),
            timeoutPromise
          ]);
          
          // Clear timeout immediately after success
          if (timeoutId) clearTimeout(timeoutId);
          
          return { signature, message };
        } catch (error) {
          toast.dismiss(nonceToastId);
          throw error;
        }
      };

      try {
        console.log('Starting signature flow...');
        
        setLoading(true); 
        
        const userEmail = user.email || `wallet_${currentAddress.slice(0, 6)}@audioblocks.com`;
        
        toast.info('Please sign the message in your wallet to continue.');
        const { signature, message } = await getSignature(userEmail);
        
        console.log('Signature obtained:', signature);

        const userName = user?.username || userEmail.split('@')[0];
        const userId = user?.userId || `temp_${Date.now()}`; // Fallback to ensure not empty

        console.log('Authenticating user with backend...', { userEmail, currentAddress, userName, userId });
        await authenticateUser('artist', userEmail, userName, userId, currentAddress, signature, message, getSignature);
      } catch (err: any) {
        console.error('Signature flow error:', err);
        if (err.message === 'Signature request timed out') {
          toast.error('Signature request timed out. Please try again.');
        } else {
          toast.error('Failed to sign message. Please try again.');
        }
      } finally {
        if (timeoutId!) clearTimeout(timeoutId);
        console.log('Auth flow finished, resetting loading state');
        setLoading(false); 
        setShouldTriggerSignature(false);
        isAuthenticating.current = false;
      }
    };

    runSignatureFlow();
  }, [user?.userId, primaryWallet, address, shouldTriggerSignature]);



  const authenticateUser = async (
    role: string,
    email: string,
    username: string,
    userId: string,
    walletAddress: any,
    signature: string,
    message: string,
    getSignature: (email: string) => Promise<{ signature: string, message: string }>
  ) => {
    const url = 'https://audioblock-backend-v2.onrender.com';
    const endpoint = `${url}/api/auth/login`;

    console.log(`Sending login request to: ${endpoint}`);

    try {
      // Notify user that we are connecting to the backend
      toast.loading('Verifying signature with server... (This may take a moment)', {
        id: 'auth-loading' // Assign an ID so we can dismiss it later
      });

      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 120000); // 120s timeout

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Explicitly ensure no Authorization header is sent
        },
        body: JSON.stringify({
          role,
          email,
          walletAddress,
          signature,
          message,
        }),
        signal: controller.signal
      });

      clearTimeout(id);

      const responseData = await response.json();

      console.log('Login Response:', responseData);

      if (!response.ok) {
        const error: any = new Error(responseData.message || 'Login failed');
        error.response = { data: responseData, status: response.status };
        throw error;
      }

      toast.dismiss('auth-loading');

      // Token can be at the top level OR inside user object
      const token = responseData.token || responseData.jwt || responseData.user?.token;
      
      console.log('Extracted Token:', token);

      if (!token) {
        throw new Error('No token received from login');
      }

      Cookies.set('audioblocks_jwt', token);
      localStorage.setItem('token', token); // Sync with localStorage for api/axios.ts
      toast.success(responseData?.message || 'Logged in successfully');
      
      router.push('/dashboard/overview');
      return responseData;

    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || 'Login failed';
      console.log('Login Error:', errorMsg, error);

      if (errorMsg?.toLowerCase().includes('user not found')) {
        console.log('User not found, attempting registration...');
        try {
          // Re-fetch nonce and re-sign for registration because login consumed the nonce
          toast.dismiss('auth-loading');
          toast.info('Account not found. Please sign again to create your account.');
          
          const { signature: newSignature, message: newMessage } = await getSignature(email);

          const registerEndpoint = `${url}/api/auth/register`;
          console.log(`Sending register request to: ${registerEndpoint}`);
          
          const registerPayload = {
            role,
            email,
            walletAddress,
            signature: newSignature,
            message: newMessage,
            dynamixUserId: userId,
            username: username,
          };

          console.log('Register Payload:', registerPayload);

          toast.loading('Creating your account...', {
            id: 'auth-loading'
          });

          const regController = new AbortController();
          const regId = setTimeout(() => regController.abort(), 120000); // 120s timeout

          const registerResponse = await fetch(registerEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(registerPayload),
            signal: regController.signal
          });

          clearTimeout(regId);

          const registerData = await registerResponse.json();

          console.log('Register Response:', registerData);

          if (!registerResponse.ok) {
             const error: any = new Error(registerData.message || 'Registration failed');
             error.response = { data: registerData, status: registerResponse.status };
             throw error;
          }

          toast.dismiss('auth-loading');

          const registerToken = registerData.token || registerData.jwt || registerData.user?.token;
          
          console.log('Extracted Register Token:', registerToken);

          if (!registerToken) {
            throw new Error('No token received from registration');
          }

          Cookies.set('audioblocks_jwt', registerToken);
          localStorage.setItem('token', registerToken); // Sync with localStorage
          toast.success(registerData?.message || 'Registered successfully');

          router.push('/dashboard/overview');
          return registerData;
        } catch (registerError: any) {
          console.error('Registration Error:', registerError);
          
          const errorResponse = registerError?.response?.data;
          const errorMessage = errorResponse?.message || registerError?.message || 'Registration failed';
          
          console.log('Full Error Response:', errorResponse);
          
          toast.error(`Registration failed: ${errorMessage}`);
          handleLogOut();
        }
      } else {
        toast.dismiss('auth-loading');
        handleLogOut();
        toast.error(errorMsg);
      }
    }
  };

  return { setShouldTriggerSignature, handleLogOut, loading };
};

