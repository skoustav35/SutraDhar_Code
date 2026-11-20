<p align="center">
  <a href="https://sutradhar.ai">
    <picture>
      <source srcset=".github/assets/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset=".github/assets/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src=".github/assets/logo-ornate-light.svg" alt="Sutradhar logo">
    </picture>
  </a>
</p>
<p align="center">The open source AI coding agent.</p>
<p align="center">
  <a href="https://sutradhar.ai/discord"><img alt="Discord" src="https://img.shields.io/discord/1391832426048651334?style=flat-square&label=discord" /></a>
  <a href="https://www.npmjs.com/package/@sutradhar/cli"><img alt="npm" src="https://img.shields.io/npm/v/@sutradhar/cli?style=flat-square" /></a>
  <a href="https://github.com/anomalyco/sutradhar/actions/workflows/release.yml"><img alt="Build status" src="https://img.shields.io/github/actions/workflow/status/anomalyco/sutradhar/release.yml?style=flat-square&branch=dev" /></a>
</p>

<p align="center">
  <a href="README.md">English</a> |
  <a href="README.zh.md">简体中文</a> |
  <a href="README.zht.md">繁體中文</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.de.md">Deutsch</a> |
  <a href="README.es.md">Español</a> |
  <a href="README.fr.md">Français</a> |
  <a href="README.it.md">Italiano</a> |
  <a href="README.da.md">Dansk</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.pl.md">Polski</a> |
  <a href="README.ru.md">Русский</a> |
  <a href="README.bs.md">Bosanski</a> |
  <a href="README.ar.md">العربية</a> |
  <a href="README.no.md">Norsk</a> |
  <a href="README.br.md">Português (Brasil)</a> |
  <a href="README.th.md">ไทย</a> |
  <a href="README.tr.md">Türkçe</a> |
  <a href="README.uk.md">Українська</a> |
  <a href="README.bn.md">বাংলা</a> |
  <a href="README.gr.md">Ελληνικά</a> |
  <a href="README.vi.md">Tiếng Việt</a>
</p>

[![Sutradhar Terminal UI](services/site/public/v1/docs/assets/lander/screenshot.png)](https://sutradhar.ai)

---

### Installation

```bash
# YOLO
curl -fsSL https://sutradhar.ai/v2/install | bash

# Package managers
npm i -g @sutradhar/cli@latest      # or bun/pnpm/yarn
brew install anomalyco/tap/sutradhar-v2 # macOS and Linux (recommended, always up to date)
brew install sutradhar              # macOS and Linux (official brew formula, updated less)
sudo pacman -S sutradhar            # Arch Linux (Stable)
paru -S sutradhar-beta              # Arch Linux (Latest from AUR)
mise use -g sutradhar               # Any OS
nix run github:anomalyco/sutradhar  # Nix
```

> [!TIP]
> Remove versions older than 0.1.x before installing.

### Desktop App (BETA)

Sutradhar is also available as a desktop application. Download it from [sutradhar.ai/download](https://sutradhar.ai/download).

| Platform              | Download                           |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `sutradhar-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `sutradhar-desktop-mac-x64.dmg`     |
| Windows               | `sutradhar-desktop-win-x64.exe`     |
| Linux                 | `.deb`, `.rpm`, or `.AppImage`     |

```bash
# macOS (Homebrew)
brew install --cask sutradhar-desktop
```

#### Installation Directory

The install script installs Sutradhar to `$HOME/.sutradhar/bin`.

### Agents

Sutradhar includes two built-in agents you can switch between with the `Tab` key.

- **build** - Default, full-access agent for development work
- **plan** - Read-only agent for analysis and code exploration
  - Denies file edits by default
  - Asks permission before running bash commands
  - Ideal for exploring unfamiliar codebases or planning changes

Also included is a **general** subagent for complex searches and multistep tasks.
This is used internally and can be invoked using `@general` in messages.

Learn more about [agents](https://sutradhar.ai/docs/agents).

### Documentation

For more info on how to configure Sutradhar, [**head over to our docs**](https://sutradhar.ai/docs).

### Contributing

If you're interested in contributing to Sutradhar, please read our [contributing docs](./CONTRIBUTING.md) before submitting a pull request.

### Building on Sutradhar

If you are working on a project that's related to Sutradhar and is using "sutradhar" as part of its name, for example "sutradhar-dashboard" or "sutradhar-mobile", please add a note to your README to clarify that it is not built by the Sutradhar team and is not affiliated with us in any way.

---

**Join our community** [Discord](https://discord.gg/sutradhar) | [X.com](https://x.com/sutradhar)
