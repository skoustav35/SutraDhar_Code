<p align="center">
  <a href="https://sutradhar.ai">
    <picture>
      <source srcset=".github/assets/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset=".github/assets/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src=".github/assets/logo-ornate-light.svg" alt="Logo do Sutradhar">
    </picture>
  </a>
</p>
<p align="center">O agente de programação com IA de código aberto.</p>
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

### Instalação

```bash
# YOLO
curl -fsSL https://sutradhar.ai/v2/install | bash

# Gerenciadores de pacotes
npm i -g @sutradhar/cli@latest      # ou bun/pnpm/yarn
brew install anomalyco/tap/sutradhar-v2 # macOS e Linux (recomendado, sempre atualizado)
brew install sutradhar              # macOS e Linux (fórmula oficial do brew, atualiza menos)
sudo pacman -S sutradhar            # Arch Linux (Stable)
paru -S sutradhar-beta              # Arch Linux (Latest from AUR)
mise use -g sutradhar               # qualquer sistema
nix run github:anomalyco/sutradhar  # Nix
```

> [!TIP]
> Remova versões anteriores a 0.1.x antes de instalar.

### App desktop (BETA)

O Sutradhar também está disponível como aplicativo desktop. Baixe em [sutradhar.ai/download](https://sutradhar.ai/download).

| Plataforma            | Download                           |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `sutradhar-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `sutradhar-desktop-mac-x64.dmg`     |
| Windows               | `sutradhar-desktop-win-x64.exe`     |
| Linux                 | `.deb`, `.rpm` ou AppImage         |

```bash
# macOS (Homebrew)
brew install --cask sutradhar-desktop
```

#### Diretório de instalação

O script de instalação instala o Sutradhar em `$HOME/.sutradhar/bin`.

### Agents

O Sutradhar inclui dois agents integrados, que você pode alternar com a tecla `Tab`.

- **build** - Padrão, agent com acesso total para trabalho de desenvolvimento
- **plan** - Agent somente leitura para análise e exploração de código
  - Nega edições de arquivos por padrão
  - Pede permissão antes de executar comandos bash
  - Ideal para explorar codebases desconhecidas ou planejar mudanças

Também há um subagent **general** para buscas complexas e tarefas em várias etapas.
Ele é usado internamente e pode ser invocado com `@general` nas mensagens.

Saiba mais sobre [agents](https://sutradhar.ai/docs/agents).

### Documentação

Para mais informações sobre como configurar o Sutradhar, [**veja nossa documentação**](https://sutradhar.ai/docs).

### Contribuir

Se você tem interesse em contribuir com o Sutradhar, leia os [contributing docs](./CONTRIBUTING.md) antes de enviar um pull request.

### Construindo com Sutradhar

Se você estiver trabalhando em um projeto relacionado ao Sutradhar e estiver usando "sutradhar" como parte do nome (por exemplo, "sutradhar-dashboard" ou "sutradhar-mobile"), adicione uma nota no README para deixar claro que não foi construído pela equipe do Sutradhar e não é afiliado a nós de nenhuma forma.

---

**Junte-se à nossa comunidade** [Discord](https://discord.gg/sutradhar) | [X.com](https://x.com/sutradhar)
