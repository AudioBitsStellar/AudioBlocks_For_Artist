import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import axios from 'axios';
import Cookies from 'js-cookie';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { clearSession } from '@/api/axios';


export const Auth = () => {
  const { user } = useDynamicContext();
  const { primaryWallet, handleLogOut } = useDynamicContext();
  const { address } = useAccount();
  const [shouldTriggerSignature, setShouldTriggerSignature] = useState(false);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();

  const logout = async () => {
    clearSession();
    queryClient.clear();
    await handleLogOut();
    router.push('/login');
  };

  useEffect(() => {
    if (!user && !loading) {
      clearSession();
      queryClient.clear();
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login') && !window.location.pathname.includes('/signup')) {
        router.push('/login');
      }
    }
  }, [user, loading, router, queryClient]);

  useEffect(() => {
    const runSignatureFlow = async () => {
      if (!user?.userId || !primaryWallet || !address || !shouldTriggerSignature) return;

      const message = `Welcome to AudioBlocks! Sign this message to authenticate: ${new Date().toISOString()}`;

      try {
        setLoading(true); 
        const signature: any = await primaryWallet.signMessage(message);

        await authenticateUser('listener', user.email!, address, signature, message);
      } catch (err: any) {
        console.log(err);
      } finally {
        setLoading(false); 
        setShouldTriggerSignature(false); // Prevent future auto-triggers
      }
    };

    runSignatureFlow();
  }, [user?.userId, primaryWallet, address, shouldTriggerSignature]);



  const authenticateUser = async (
    role: string,
    email: string,
    walletAddress: any,
    signature: string,
    message: string
  ) => {
    const url = process.env.NEXT_PUBLIC_API_URL;

    try {
      const response = await axios.post(`${url}/api/auth/login`, {
        role,
        email,
        walletAddress,
        signature,
        message,
      });

      const token = response.data.user.token;
      Cookies.set('audioblocks_jwt', token);
      toast.success(response.data?.message);
      return response.data;

    } catch (error: any) {
      const errorMsg = error?.response?.data?.message;

      if (errorMsg?.toLowerCase().includes('user not found')) {
        try {
          const registerResponse = await axios.post(`${url}/api/auth/register`, {
            role,
            email,
            walletAddress,
            signature,
            message,
          });

          const registerToken = registerResponse.data?.user?.token;
          Cookies.set('audioblocks_jwt', registerToken);
          toast.success(registerResponse.data?.message);
          return registerResponse.data;
        } catch (registerError: any) {
          toast.error(registerError?.response?.data?.message || 'Registration failed');
          handleLogOut();
        }
      } else {
        handleLogOut();
        toast.error(error.response?.data?.message);
      }
    }
  };

  return { setShouldTriggerSignature, handleLogOut, loading, logout };
};

