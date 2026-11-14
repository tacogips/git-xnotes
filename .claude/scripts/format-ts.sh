#!/bin/bash
# Format TypeScript files if they exist
shopt -s nullglob globstar
files=(src/**/*.ts)
if [ ${#files[@]} -gt 0 ]; then
  bunx prettier --write "${files[@]}"
fi
exit 0
