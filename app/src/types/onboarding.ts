export type OnboardingStep = 1 | 2 | 3;

export interface ArtistBasicInfo {
  artistName: string;
  bio: string;
  genre: string[];
  website?: string;
  socialMedia?: {
    twitter?: string;
    instagram?: string;
    spotify?: string;
  };
}

export interface ArtistVerification {
  legalName: string;
  dateOfBirth: string;
  country: string;
  idType: "passport" | "drivers_license" | "national_id";
  idNumber: string;
  idDocument?: File;
  proofOfAddress?: File;
}

export interface PayoutWalletSetup {
  stellarPublicKey: string;
  walletType: "freighter" | "other";
  agreedToTerms: boolean;
}

export interface OnboardingProgress {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  basicInfo?: ArtistBasicInfo;
  verification?: ArtistVerification;
  payoutWallet?: PayoutWalletSetup;
}
