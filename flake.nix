{

  description = "reviews in git notes";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/release-24.11";
    nixpkgs-unstable.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      nixpkgs-unstable,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs { inherit system; };
        pkgs-unstable = import nixpkgs-unstable { inherit system; };

        # Minimum required bun version
        minBunVersion = "1.0.0";

        # git-xnotes package
        git-xnotes = pkgs.stdenv.mkDerivation {
          pname = "git-xnotes";
          version = "0.1.0";

          src = ./.;

          dontBuild = true;

          installPhase = ''
            runHook preInstall

            # Install source files
            mkdir -p $out/lib/git-xnotes
            cp -r src $out/lib/git-xnotes/
            cp package.json $out/lib/git-xnotes/
            cp tsconfig.json $out/lib/git-xnotes/

            # Create wrapper script
            mkdir -p $out/bin
            cat > $out/bin/git-xnotes << 'WRAPPER'
#!/usr/bin/env bash
set -euo pipefail

MIN_BUN_VERSION="${minBunVersion}"

# Function to compare version strings
version_ge() {
  # Returns 0 (true) if $1 >= $2
  local v1="$1"
  local v2="$2"

  # Split versions into arrays
  IFS='.' read -ra V1_PARTS <<< "$v1"
  IFS='.' read -ra V2_PARTS <<< "$v2"

  # Compare each part
  for i in 0 1 2; do
    local part1="''${V1_PARTS[$i]:-0}"
    local part2="''${V2_PARTS[$i]:-0}"

    # Remove any non-numeric suffix (e.g., "1" from "1-beta")
    part1="''${part1%%[^0-9]*}"
    part2="''${part2%%[^0-9]*}"

    if (( part1 > part2 )); then
      return 0
    elif (( part1 < part2 )); then
      return 1
    fi
  done
  return 0
}

# Check if bun is installed
if ! command -v bun &> /dev/null; then
  echo "Error: bun is not installed." >&2
  echo "" >&2
  echo "git-xnotes requires bun >= $MIN_BUN_VERSION" >&2
  echo "" >&2
  echo "Install bun:" >&2
  echo "  - nix profile install nixpkgs#bun" >&2
  echo "  - or see https://bun.sh/" >&2
  exit 1
fi

# Get bun version
BUN_VERSION=$(bun --version 2>/dev/null || echo "0.0.0")

# Check version
if ! version_ge "$BUN_VERSION" "$MIN_BUN_VERSION"; then
  echo "Error: bun version $BUN_VERSION is too old." >&2
  echo "" >&2
  echo "git-xnotes requires bun >= $MIN_BUN_VERSION" >&2
  echo "Current version: $BUN_VERSION" >&2
  echo "" >&2
  echo "Please upgrade bun:" >&2
  echo "  - bun upgrade" >&2
  exit 1
fi

# Get the directory where this script is installed
SCRIPT_DIR="$(cd "$(dirname "''${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="$(dirname "$SCRIPT_DIR")/lib/git-xnotes"

# Run git-xnotes with bun
exec bun run "$LIB_DIR/src/main.ts" "$@"
WRAPPER

            chmod +x $out/bin/git-xnotes

            runHook postInstall
          '';

          meta = with pkgs.lib; {
            description = "Distributed code review annotations stored in git notes";
            homepage = "https://github.com/tacogips/git-xnotes";
            license = licenses.mit;
            mainProgram = "git-xnotes";
          };
        };

        devPackages = with pkgs; [
          # Bun runtime
          pkgs-unstable.bun

          # TypeScript tooling
          pkgs-unstable.typescript
          pkgs-unstable.typescript-language-server
          nodePackages.prettier

          # Development tools
          fd
          gnused
          gh
          go-task
        ];

      in
      {
        packages = {
          default = git-xnotes;
          git-xnotes = git-xnotes;
        };

        devShells.default = pkgs.mkShell {
          packages = devPackages;

          shellHook = ''
            echo "TypeScript development environment ready"
            echo "Bun version: $(bun --version)"
            echo "TypeScript version: $(tsc --version)"
            echo "Task version: $(task --version 2>/dev/null || echo 'not available')"
          '';
        };
      }
    );
}
