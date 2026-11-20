/**
 * Application-wide constants and configuration
 */
export const config = {
  consoleMarketingEnabled: import.meta.env.VITE_CONSOLE_MARKETING_ENABLED === "true",

  // Base URL
  baseUrl: "https://sutradhar.ai",

  // GitHub
  github: {
    repoUrl: "https://github.com/anomalyco/sutradhar",
    starsFormatted: {
      compact: "208K",
      full: "208,000",
    },
  },

  // Social links
  social: {
    twitter: "https://x.com/sutradhar",
    discord: "https://discord.gg/sutradhar",
  },

  // Static stats (used on landing page)
  stats: {
    contributors: "950",
    commits: "13,000",
    monthlyUsers: "16M",
  },
} as const
