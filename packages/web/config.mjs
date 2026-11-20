const stage = process.env.SST_STAGE || "dev"

export default {
  url: stage === "production" ? "https://sutradhar.ai" : `https://${stage}.sutradhar.ai`,
  console: stage === "production" ? "https://sutradhar.ai/auth" : `https://${stage}.sutradhar.ai/auth`,
  email: "help@anoma.ly",
  socialCard: "https://social-cards.sst.dev",
  github: "https://github.com/anomalyco/sutradhar",
  discord: "https://sutradhar.ai/discord",
  headerLinks: [
    { name: "app.header.home", url: "/" },
    { name: "app.header.docs", url: "/v2/docs" },
  ],
}
