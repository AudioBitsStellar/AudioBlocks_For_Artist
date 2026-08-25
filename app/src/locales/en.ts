const en = {
  // Navigation
  nav: {
    dashboard: "Dashboard",
    myMusic: "My Music",
    analytics: "Analytics",
    events: "Events",
    merch: "Merch",
    profile: "Profile",
    settings: "Settings",
    uploadMusic: "Upload Music",
  },

  // Top header
  header: {
    welcome: "Welcome",
    search: "Search by artists, songs or albums",
    searchMobile: "Search artists, songs or albums",
    notifications: "Notifications and settings",
    switchToLight: "Switch to light mode",
    switchToDark: "Switch to dark mode",
    goToProfile: "Go to profile",
    openMenu: "Open navigation menu",
  },

  // Auth
  auth: {
    login: "Log in",
    signup: "Sign up",
    logout: "Log out",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm Password",
    forgotPassword: "Forgot password?",
    noAccount: "Don't have an account?",
    hasAccount: "Already have an account?",
  },

  // Music
  music: {
    myAlbums: "My Albums",
    noAlbums: "No albums yet",
    noAlbumsDescription: "Create your first album to organize and showcase your music collection.",
    deleteAlbum: "Delete album",
    viewAll: "View all albums",
    scrollLeft: "Scroll albums left",
    scrollRight: "Scroll albums right",
    noCover: "No Cover",

    // Metadata and multilingual content
    metadata: {
      title: "Title",
      titlePlaceholder: "Enter song/album title",
      description: "Description",
      descriptionPlaceholder: "Describe your music",
      genre: "Genre",
      genrePlaceholder: "Enter genre",
      releaseDate: "Release Date",
      releaseDatePlaceholder: "Select release date",
      artist: "Artist",
      artistPlaceholder: "Artist name",
      album: "Album",
      albumPlaceholder: "Album name",
      lyrics: "Lyrics",
      lyricsPlaceholder: "Enter song lyrics",
      tags: "Tags",
      tagsPlaceholder: "Add tags (comma separated)",
    },
  },

  // Actions
  actions: {
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    submit: "Submit",
    confirm: "Confirm",
    close: "Close",
    back: "Back",
    next: "Next",
    upload: "Upload",
  },

  // Status / feedback
  status: {
    loading: "Loading…",
    error: "Something went wrong. Please try again.",
    noData: "No data available.",
    success: "Done!",
    offline: "You're offline. Some features may not work.",
  },

  // Language switcher
  language: {
    label: "Language",
    en: "English",
    es: "Español",
  },

  // Fan Rewards & Loyalty Program
  rewards: {
    title: "Loyalty Program",
    yourPoints: "Your Points",
    currentTier: "Current Tier",
    earnMorePoints: "Earn More Points",
    redeemRewards: "Redeem Rewards",
    exclusiveContent: "Exclusive Content",
    unlockedContent: "Unlocked Content",
    lockedContent: "Locked Content",

    // Point sources
    pointsPerStream: "Points per stream",
    pointsPerPurchase: "Points per purchase",
    pointsPerShare: "Points per share",
    pointsPerReview: "Points per review",
    pointsPerEvent: "Points per event attendance",
    referralBonus: "Referral bonus",

    // Tiers
    tiers: {
      bronze: "Bronze",
      silver: "Silver",
      gold: "Gold",
      platinum: "Platinum",
    },

    // Actions
    unlock: "Unlock",
    redeem: "Redeem",
    share: "Share",
    viewDetails: "View Details",
    unlockNow: "Unlock Now",
    redeemNow: "Redeem Now",

    // Messages
    needMorePoints: "You need {points} more points to unlock this",
    pointsExpire: "Points expire on {date}",
    congratulations: "Congratulations!",
    newTierUnlocked: "You've unlocked {tier} tier!",
    rewardRedeemed: "Reward successfully redeemed",
    noRewards: "No rewards available yet",
    noExclusiveContent: "Check back soon for exclusive content",
  },
} as const;

export type Translations = typeof en;
export default en;
