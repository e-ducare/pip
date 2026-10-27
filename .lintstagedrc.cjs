module.exports = {
  "*.md": "oxfmt --no-error-on-unmatched-pattern",
  // One glob, one array: the commands run in order, so oxfmt never writes a file
  // while oxlint reads it. oxlint takes no filenames because --type-aware needs
  // the whole program. A commit may contain only files oxfmt's config ignores.
  "*.{ts,tsx,js,jsx,mjs,cjs,mts,json,jsonc,css}": (files) => [
    `oxfmt --no-error-on-unmatched-pattern ${files.join(" ")}`,
    "pnpm lint",
  ],
};
