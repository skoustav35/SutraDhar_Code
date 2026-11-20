#!/usr/bin/env bash
# render-homebrew.sh <sign-macos dir> <build-archives dir> <tap dir>: writes Formula sutradhar-v2.rb with the
# hashes of the signed macOS and the Linux archives.
. "$(dirname "$0")/lib.sh"

macos=$1 archives=$2 tap=$3
sum() { sha256 "$1" | cut -c1-64; }
base="https://sutradhar.ai/files/bin/$SUTRADHAR_VERSION"
cat > "$tap/sutradhar-v2.rb" <<FORMULA
# typed: false
# frozen_string_literal: true

class SutradharV2 < Formula
  desc "Sutradhar V2 - the AI coding agent for the terminal"
  homepage "https://github.com/anomalyco/sutradhar"
  version "$SUTRADHAR_VERSION"
  license "MIT"

  depends_on "ripgrep"
  conflicts_with "sutradhar", because: "both install an sutradhar binary"

  on_macos do
    if Hardware::CPU.arm?
      url "$base/sutradhar-darwin-arm64.zip"
      sha256 "$(sum "$macos/sutradhar-darwin-arm64.zip")"
    else
      url "$base/sutradhar-darwin-x64-baseline.zip"
      sha256 "$(sum "$macos/sutradhar-darwin-x64-baseline.zip")"
    end
  end

  on_linux do
    if Hardware::CPU.arm?
      url "$base/sutradhar-linux-arm64.tar.gz"
      sha256 "$(sum "$archives/sutradhar-linux-arm64.tar.gz")"
    else
      url "$base/sutradhar-linux-x64-baseline.tar.gz"
      sha256 "$(sum "$archives/sutradhar-linux-x64-baseline.tar.gz")"
    end
  end

  def install
    bin.install "sutradhar"
  end
end
FORMULA
cat "$tap/sutradhar-v2.rb"
