<p align="center">
  <a href="https://sutradhar.ai">
    <picture>
      <source srcset=".github/assets/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset=".github/assets/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src=".github/assets/logo-ornate-light.svg" alt="Sutradhar logo">
    </picture>
  </a>
</p>
<p align="center">Sutradhar je open source AI agent za programiranje.</p>
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

### Instalacija

```bash
# YOLO
curl -fsSL https://sutradhar.ai/v2/install | bash

# Package manageri
npm i -g @sutradhar/cli@latest      # ili bun/pnpm/yarn
brew install anomalyco/tap/sutradhar-v2 # macOS i Linux (preporučeno, uvijek ažurno)
brew install sutradhar              # macOS i Linux (zvanična brew formula, rjeđe se ažurira)
sudo pacman -S sutradhar            # Arch Linux (Stable)
paru -S sutradhar-beta              # Arch Linux (Latest from AUR)
mise use -g sutradhar               # Bilo koji OS
nix run github:anomalyco/sutradhar  # Nix
```

> [!TIP]
> Ukloni verzije starije od 0.1.x prije instalacije.

### Desktop aplikacija (BETA)

Sutradhar je dostupan i kao desktop aplikacija. Preuzmi je sa [sutradhar.ai/download](https://sutradhar.ai/download).

| Platforma             | Preuzimanje                        |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `sutradhar-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `sutradhar-desktop-mac-x64.dmg`     |
| Windows               | `sutradhar-desktop-win-x64.exe`     |
| Linux                 | `.deb`, `.rpm`, ili AppImage       |

```bash
# macOS (Homebrew)
brew install --cask sutradhar-desktop
```

#### Instalacijski direktorij

Instalacijska skripta instalira Sutradhar u `$HOME/.sutradhar/bin`.

### Agenti

Sutradhar uključuje dva ugrađena agenta između kojih možeš prebacivati tasterom `Tab`.

- **build** - Podrazumijevani agent sa punim pristupom za razvoj
- **plan** - Agent samo za čitanje za analizu i istraživanje koda
  - Podrazumijevano zabranjuje izmjene datoteka
  - Traži dozvolu prije pokretanja bash komandi
  - Idealan za istraživanje nepoznatih codebase-ova ili planiranje izmjena

Uključen je i **general** pod-agent za složene pretrage i višekoračne zadatke.
Koristi se interno i može se pozvati pomoću `@general` u porukama.

Saznaj više o [agentima](https://sutradhar.ai/docs/agents).

### Dokumentacija

Za više informacija o konfiguraciji Sutradhar-a, [**pogledaj dokumentaciju**](https://sutradhar.ai/docs).

### Doprinosi

Ako želiš doprinositi Sutradhar-u, pročitaj [upute za doprinošenje](./CONTRIBUTING.md) prije slanja pull requesta.

### Gradnja na Sutradhar-u

Ako radiš na projektu koji je povezan s Sutradhar-om i koristi "sutradhar" kao dio naziva, npr. "sutradhar-dashboard" ili "sutradhar-mobile", dodaj napomenu u svoj README da projekat nije napravio Sutradhar tim i da nije povezan s nama.

---

**Pridruži se našoj zajednici** [Discord](https://discord.gg/sutradhar) | [X.com](https://x.com/sutradhar)
