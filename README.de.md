<p align="center">
  <a href="https://sutradhar.ai">
    <picture>
      <source srcset=".github/assets/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset=".github/assets/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src=".github/assets/logo-ornate-light.svg" alt="Sutradhar logo">
    </picture>
  </a>
</p>
<p align="center">Der Open-Source KI-Coding-Agent.</p>
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

# Paketmanager
npm i -g @sutradhar/cli@latest      # oder bun/pnpm/yarn
brew install anomalyco/tap/sutradhar-v2 # macOS und Linux (empfohlen, immer aktuell)
brew install sutradhar              # macOS und Linux (offizielle Brew-Formula, seltener aktualisiert)
sudo pacman -S sutradhar            # Arch Linux (Stable)
paru -S sutradhar-beta              # Arch Linux (Latest from AUR)
mise use -g sutradhar               # jedes Betriebssystem
nix run github:anomalyco/sutradhar  # Nix
```

> [!TIP]
> Entferne Versionen älter als 0.1.x vor der Installation.

### Desktop-App (BETA)

Sutradhar ist auch als Desktop-Anwendung verfügbar. Lade sie von [sutradhar.ai/download](https://sutradhar.ai/download) herunter.

| Plattform             | Download                           |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `sutradhar-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `sutradhar-desktop-mac-x64.dmg`     |
| Windows               | `sutradhar-desktop-win-x64.exe`     |
| Linux                 | `.deb`, `.rpm` oder AppImage       |

```bash
# macOS (Homebrew)
brew install --cask sutradhar-desktop
```

#### Installationsverzeichnis

Das Installationsskript installiert Sutradhar in `$HOME/.sutradhar/bin`.

### Agents

Sutradhar enthält zwei eingebaute Agents, zwischen denen du mit der `Tab`-Taste wechseln kannst.

- **build** - Standard-Agent mit vollem Zugriff für Entwicklungsarbeit
- **plan** - Nur-Lese-Agent für Analyse und Code-Exploration
  - Verweigert Datei-Edits standardmäßig
  - Fragt vor dem Ausführen von bash-Befehlen nach
  - Ideal zum Erkunden unbekannter Codebases oder zum Planen von Änderungen

Außerdem ist ein **general**-Subagent für komplexe Suchen und mehrstufige Aufgaben enthalten.
Dieser wird intern genutzt und kann in Nachrichten mit `@general` aufgerufen werden.

Mehr dazu unter [Agents](https://sutradhar.ai/docs/agents).

### Dokumentation

Mehr Infos zur Konfiguration von Sutradhar findest du in unseren [**Docs**](https://sutradhar.ai/docs).

### Beitragen

Wenn du zu Sutradhar beitragen möchtest, lies bitte unsere [Contributing Docs](./CONTRIBUTING.md), bevor du einen Pull Request einreichst.

### Auf Sutradhar aufbauen

Wenn du an einem Projekt arbeitest, das mit Sutradhar zusammenhängt und "sutradhar" als Teil seines Namens verwendet (z.B. "sutradhar-dashboard" oder "sutradhar-mobile"), füge bitte einen Hinweis in deine README ein, dass es nicht vom Sutradhar-Team gebaut wird und nicht in irgendeiner Weise mit uns verbunden ist.

---

**Tritt unserer Community bei** [Discord](https://discord.gg/sutradhar) | [X.com](https://x.com/sutradhar)
