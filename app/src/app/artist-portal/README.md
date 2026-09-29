# Artist Portal

The Artist Portal is a dedicated landing and signup flow for artists joining AudioBlocks.

## Features

### 1. Landing Page (`/artist-portal`)

- Hero section with compelling value proposition
- Feature showcase highlighting platform benefits
- Call-to-action sections encouraging signup
- Responsive design matching AudioBlocks brand

### 2. Artist Signup (`/artist-portal/signup`)

- Privy-powered authentication
- Multiple login methods:
  - Email
  - Wallet (MetaMask, WalletConnect, etc.)
  - Social login (Google)
- Automatic embedded wallet creation for users without wallets
- Seamless onboarding experience

## Components

- **ArtistPortalHero**: Main hero section with value proposition
- **ArtistPortalFeatures**: Feature grid showcasing platform capabilities
- **ArtistPortalCTA**: Call-to-action section encouraging signup

## Authentication

The artist portal uses [Privy](https://www.privy.io/) for Web3 authentication, providing:

- Multi-method login (email, wallet, social)
- Embedded wallet creation
- Secure authentication flow
- User-friendly onboarding

### Setup

1. Create a Privy account at [privy.io](https://www.privy.io/)
2. Create a new app and get your App ID
3. Add to `.env.local`:
   ```
   NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id
   ```

## Routes

- `/artist-portal` - Landing page
- `/artist-portal/signup` - Artist signup with Privy auth

## Integration with Existing Flow

The artist portal complements the existing signup flow:

- Traditional signup (`/signup`) - Email/password authentication
- Artist portal signup (`/artist-portal/signup`) - Web3-first with Privy

Both flows lead to the same dashboard after successful authentication.
