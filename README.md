# AudioBlocks_For_Artist

[![CI](https://github.com/AudioBitsStellar/AudioBlocks_For_Artist/actions/workflows/ci.yml/badge.svg)](https://github.com/AudioBitsStellar/AudioBlocks_For_Artist/actions/workflows/ci.yml)

AudioBlocks is a comprehensive artist dashboard for managing music, earnings, analytics, events, merchandise, and fan engagement on the blockchain. This repository contains the Next.js frontend application that empowers artists to take control of their music career.

## 🎵 Features

- **Music Management**: Upload, organize, and distribute your tracks
- **Analytics Dashboard**: Real-time insights into streams, downloads, and revenue
- **Event Management**: Create and manage concerts, meet-and-greets, and virtual events
- **Merchandise Store**: Set up and track merchandise sales
- **Fan Messaging**: Direct communication with your fanbase
- **Web3 Integration**: Stellar blockchain integration for transparent payments and NFTs
- **Premium Features**: Enhanced tools for verified artists
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Dark/Light Mode**: User-preference based theming
- **Accessibility**: WCAG 2.1 AA compliance with screen reader support

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 20.x or higher (LTS recommended)
- **npm**: Version 9.x or higher (bundled with Node.js)
- **Git**: For version control
- **Modern Browser**: Chrome, Firefox, Safari, or Edge (latest versions)

**Optional:**
- **Docker**: For containerized development
- **Playwright**: For E2E testing (installed as dev dependency)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/AudioBitsStellar/AudioBlocks_For_Artist.git
cd AudioBlocks_For_Artist
```

### 2. Install Dependencies

```bash
cd app
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the `app` directory:

```env
# API Configuration
NEXT_PUBLIC_API_BASE_URL=https://api.audioblocks.com
NEXT_PUBLIC_API_URL=https://api.audioblocks.com

# Sentry Configuration (optional for error tracking)
SENTRY_DSN=your-sentry-dsn
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project

# Stellar Configuration
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
```

See `app/.env.example` for a complete list of available environment variables.

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The app will hot-reload as you make changes.

## 📦 Available Scripts

Run these commands from the `app` directory:

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Build production-optimized bundle |
| `npm start` | Run production server (requires build first) |
| `npm run lint` | Run ESLint for code quality checks |
| `npm run format` | Format code with Prettier |
| `npm run test` | Run unit tests with Vitest |
| `npm run test:ui` | Open Vitest UI for interactive testing |
| `npm run test:coverage` | Generate test coverage report |
| `npm run test:e2e` | Run end-to-end tests with Playwright |
| `npm run storybook` | Start Storybook component explorer |
| `npm run storybook:build` | Build static Storybook |

## 🏗️ Project Structure

```
AudioBlocks_For_Artist/
├── .github/                    # GitHub configuration
│   ├── workflows/             # CI/CD pipelines
│   └── ISSUE_TEMPLATE/        # Issue templates
├── app/                       # Next.js application
│   ├── public/               # Static assets (images, fonts)
│   ├── src/
│   │   ├── app/             # Next.js App Router pages
│   │   │   ├── dashboard/   # Dashboard routes
│   │   │   │   ├── overview/
│   │   │   │   ├── my-music/
│   │   │   │   ├── analytics/
│   │   │   │   ├── events/
│   │   │   │   ├── merches/
│   │   │   │   ├── messages/
│   │   │   │   ├── premium/
│   │   │   │   └── settings/
│   │   │   └── layout.tsx   # Root layout
│   │   ├── components/       # Reusable React components
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TopHeader.tsx
│   │   │   └── ...
│   │   ├── context/         # React Context providers
│   │   │   ├── PlaybackContext.tsx
│   │   │   ├── playbackReducer.ts
│   │   │   └── provider.tsx
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API client and data services
│   │   │   ├── messageService.ts
│   │   │   └── ...
│   │   ├── api/             # Axios configuration
│   │   ├── lib/             # Utility libraries
│   │   ├── types/           # TypeScript type definitions
│   │   ├── utils/           # Helper functions
│   │   ├── theme/           # Theme configuration
│   │   ├── __tests__/       # Unit and integration tests
│   │   └── __mocks__/       # Test mocks
│   ├── e2e/                 # Playwright E2E tests
│   ├── .storybook/          # Storybook configuration
│   ├── package.json
│   └── next.config.ts
├── docs/                     # Additional documentation
├── CONTRIBUTING.md          # Contribution guidelines
├── CODE_OF_CONDUCT.md       # Code of conduct
└── README.md                # This file
```

## 🛠️ Tech Stack

### Core Framework
- **[Next.js 16.1.5](https://nextjs.org/)** - React framework with App Router
- **[React 19.2.0](https://react.dev/)** - UI library
- **[TypeScript 5](https://www.typescriptlang.org/)** - Type-safe JavaScript

### Styling
- **[Tailwind CSS 4](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Framer Motion 12](https://www.framer.com/motion/)** - Animation library
- **[Lucide React](https://lucide.dev/)** - Icon library

### State Management
- **React Context + useReducer** - Local state management
- **[@tanstack/react-query 5](https://tanstack.com/query)** - Server state management

### Forms & Validation
- **[React Hook Form 7](https://react-hook-form.com/)** - Form handling
- **[Zod 3](https://zod.dev/)** - Schema validation

### HTTP & API
- **[Axios 1](https://axios-http.com/)** - HTTP client

### Web3
- **[@stellar/freighter-api 6](https://freighter.app/)** - Stellar wallet integration

### UI Components
- **[Radix UI](https://www.radix-ui.com/)** - Accessible component primitives
- **[Recharts 3](https://recharts.org/)** - Data visualization
- **[Sonner](https://sonner.emilkowal.ski/)** - Toast notifications

### Testing
- **[Vitest 3](https://vitest.dev/)** - Unit testing framework
- **[@testing-library/react 16](https://testing-library.com/)** - Component testing utilities
- **[Playwright 1](https://playwright.dev/)** - E2E testing

### Dev Tools
- **[Storybook 8](https://storybook.js.org/)** - Component development environment
- **[ESLint 9](https://eslint.org/)** - Linting
- **[Prettier 3](https://prettier.io/)** - Code formatting
- **[Husky 9](https://typicode.github.io/husky/)** - Git hooks
- **[lint-staged 15](https://github.com/okonet/lint-staged)** - Staged file linting

### Monitoring
- **[@sentry/nextjs 9](https://sentry.io/)** - Error tracking and performance monitoring

## 🏛️ Architecture

### State Management Pattern

The application uses a hybrid state management approach:

1. **React Context + useReducer**: For global UI state (playback, theme, auth)
   - `PlaybackContext` uses a reducer pattern with actions for predictable state transitions
   - Reducers are extracted to separate files for testability

2. **TanStack Query**: For server state caching and synchronization
   - Automatic refetching and invalidation
   - Optimistic updates for better UX

3. **Local State**: For component-specific state using `useState`

### Component Architecture

- **Atomic Design**: Components organized by complexity
- **Client Components**: Marked with `"use client"` directive where interactivity is needed
- **Server Components**: Default for better performance and SEO
- **Compound Components**: For complex UI like dialogs and tabs

### Routing

Next.js App Router with file-based routing:
- `/dashboard/*` - Protected routes requiring authentication
- `/` - Public landing page
- Middleware handles route protection

### API Integration

- Centralized Axios instance in `src/api/axios.ts`
- API endpoints defined in `src/api/api-endpoint.ts`
- Service layer abstracts API calls from components

### Accessibility

- Semantic HTML elements
- ARIA labels and roles where needed
- Keyboard navigation support
- Focus management
- Screen reader announcements via live regions
- Color contrast compliance (WCAG AA)

## 🚢 Deployment

### Production Build

```bash
cd app
npm run build
npm start
```

### Docker Deployment

Development:
```bash
docker-compose up
```

Production:
```bash
docker build -f Dockerfile -t audioblocks-artist .
docker run -p 3000:3000 audioblocks-artist
```

### Environment-Specific Configuration

Ensure production environment variables are set:
- Update API URLs to production endpoints
- Configure Sentry DSN for error tracking
- Set Stellar network to `public` (mainnet)

## 🧪 Testing Strategy

### Unit Tests
- Component logic testing with Vitest
- React Testing Library for component testing
- Aim for >80% code coverage on critical paths

### Integration Tests
- Context provider testing
- API service mocking with MSW

### E2E Tests
- Critical user flows with Playwright
- Authentication, music upload, event creation

### Component Testing
- Visual regression with Storybook + Chromatic
- Isolated component development

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch: `feat/your-feature` or `fix/your-bugfix`
3. **Make** your changes following our code standards
4. **Test** thoroughly:
   ```bash
   npm run lint
   npm run format
   npm run test
   npm run test:e2e
   ```
5. **Commit** with clear messages following [Conventional Commits](https://www.conventionalcommits.org/)
6. **Push** to your fork
7. **Open** a Pull Request with a detailed description

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

### Code Standards

- TypeScript strict mode enabled
- ESLint and Prettier enforced via pre-commit hooks
- All public functions must have JSDoc comments
- Components should be accessible (WCAG 2.1 AA)
- Tests required for new features

## 🔄 CI/CD

The project uses GitHub Actions for continuous integration:

- **On PR & Push to `main`**:
  - Lint checking
  - TypeScript compilation
  - Unit tests
  - Build verification

Workflow file: `.github/workflows/ci.yml`

## ♿ Accessibility

This project prioritizes accessibility:
- WCAG 2.1 AA compliance target
- Screen reader tested
- Keyboard navigation support
- Color contrast verified
- Toast notifications announced via ARIA live regions

**Note**: Full WCAG compliance requires manual testing with assistive technologies.

## 📄 License

This project is licensed under the [ISC License](LICENSE).

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/AudioBitsStellar/AudioBlocks_For_Artist/issues)
- **Discussions**: [GitHub Discussions](https://github.com/AudioBitsStellar/AudioBlocks_For_Artist/discussions)
- **Code of Conduct**: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

## 🙏 Acknowledgments

Built with ❤️ by the AudioBits team for artists worldwide.

---

**Ready to revolutionize music distribution?** Start building with AudioBlocks today!
