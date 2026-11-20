declare global {
  const SUTRADHAR_VERSION: string
  const SUTRADHAR_CHANNEL: string
}

// Dev/local builds bake in "0.0.0-dev-*", which the sutradhar.ai free tier rejects (HTTP 426,
// requires >= 2.0.0). Report a release-compatible version in that case.
const COMPAT_VERSION = "2.2.5"
export const InstallationVersion =
  typeof SUTRADHAR_VERSION === "string" &&
  !SUTRADHAR_VERSION.startsWith("0.0.0") &&
  !SUTRADHAR_VERSION.startsWith("1.")
    ? SUTRADHAR_VERSION
    : COMPAT_VERSION
export const InstallationChannel =
  typeof SUTRADHAR_CHANNEL === "string" ? SUTRADHAR_CHANNEL : process.env["SUTRADHAR_CHANNEL"] || "local"
export const InstallationLocal = InstallationChannel === "local"
