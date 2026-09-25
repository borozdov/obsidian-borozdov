# Contributing

Issues and pull requests are welcome.

## Reporting a problem

Open an issue with your Obsidian version, operating system, light or dark mode, and a
screenshot. If a plugin or a CSS snippet is involved, name it.

## Working on the theme

1. Clone the repository and link it into a test vault:
   `ln -s "$PWD" "<vault>/.obsidian/themes/Borozdov"`
2. Choose Borozdov under Settings → Appearance → Themes. After editing `theme.css`, run
   **Reload app without saving** from the command palette.
3. Lint with the rules the community directory applies: `npm install`, then
   `npm run lint`.
4. After a visible change, rerender the screenshots: `npm run screenshots`. It needs
   macOS with Obsidian and Google Chrome installed, and Pillow for Python. The theme is
   laid over Obsidian's own stylesheet, extracted from the installed app at run time;
   `screenshots/` is rewritten.

House rules:

- Obsidian's CSS variables first, plain selectors after; no `!important`, no `:has()`.
- Colors come from the palette in section 1 of `theme.css`; nothing else holds a color
  literal.
- No hue, no gradients, no shadows, no pills. Radii are 2, 4, 6 or 8 px.
- Fonts: the originals are in `fonts/source/`. `python3 scripts/slim-fonts.py` cuts them
  to what the theme uses (Latin and Cyrillic, weights 400–600, no ligatures) into
  `fonts/`, and `scripts/embed-fonts.sh` embeds those into `theme.css`.
- The release ships `dist/theme.css` from `npm run build`: the same file without
  comments. The build fails on any lint problem and at 100 KiB, the size above which
  the community directory flags a theme.

## Releasing

1. Bump `version` in `manifest.json` and add the same version to `versions.json`, mapped
   to the minimum Obsidian version it needs.
2. Commit, then push an annotated tag named with the bare version:
   `git tag -a 1.0.1 -m "1.0.1: …"` and `git push origin 1.0.1`.
3. The release workflow lints and builds the theme, checks the tag against
   `manifest.json` and `versions.json`, attests `manifest.json` and `dist/theme.css`, and
   publishes the GitHub release with both files attached. The tag message becomes the
   release notes.
