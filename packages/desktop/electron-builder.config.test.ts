import { expect, test } from "bun:test"
import type { Configuration } from "electron-builder"

const channels = [
  { channel: "dev", appId: "ai.sutradhar.desktop.dev" },
  { channel: "beta", appId: "ai.sutradhar.desktop.beta" },
  { channel: "prod", appId: "ai.sutradhar.desktop" },
] as const

for (const channel of channels) {
  test(`uses one Linux desktop identity for ${channel.channel}`, async () => {
    const previous = process.env.SUTRADHAR_CHANNEL
    process.env.SUTRADHAR_CHANNEL = channel.channel

    const module = await import(`./electron-builder.config.ts?channel=${channel.channel}`)
    const config = module.default as Configuration

    if (previous === undefined) delete process.env.SUTRADHAR_CHANNEL
    else process.env.SUTRADHAR_CHANNEL = previous

    expect(config.appId).toBe(channel.appId)
    expect(config.extraMetadata?.desktopName).toBe(`${channel.appId}.desktop`)
    expect(config.linux?.executableName).toBe(channel.appId)
    expect(config.linux?.desktop?.entry?.StartupWMClass).toBe(channel.appId)
    expect(config.deb?.fpm).toContainEqual(expect.stringContaining(`/usr/share/metainfo/${channel.appId}.metainfo.xml`))
    expect(config.rpm?.fpm).toContainEqual(expect.stringContaining(`/usr/share/metainfo/${channel.appId}.metainfo.xml`))
  })
}

for (const channel of ["dev", "beta", "prod"] as const) {
  test(`does not bundle legacy CLI binaries in ${channel} builds`, async () => {
    const previous = process.env.SUTRADHAR_CHANNEL
    process.env.SUTRADHAR_CHANNEL = channel
    const module = await import(`./electron-builder.config.ts?no-cli-resource=${channel}`)
    const config = module.default as Configuration
    if (previous === undefined) delete process.env.SUTRADHAR_CHANNEL
    else process.env.SUTRADHAR_CHANNEL = previous

    expect(config.extraResources).not.toContainEqual(
      expect.objectContaining({ filter: ["sutradhar-cli*"] }),
    )
  })
}
