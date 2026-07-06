## Cursor Cloud specific instructions

This repository is a **GitHub Profile README** — it contains only a single `README.md` file with markdown badges, stats widgets, and social links. There is no application code, no dependencies, no build system, no tests, and no services to run.

### Developing

- Edit `README.md` directly. It uses GitHub-flavored Markdown with HTML for layout (e.g. `<p align="center">`).
- Badge images use shields.io; GitHub stats use `github-readme-stats.vercel.app` and `github-readme-streak-stats.herokuapp.com`.

### Previewing changes

- Use `grip` (GitHub Readme Instant Preview) to render `README.md` locally:
  ```
  pip install grip
  grip README.md 0.0.0.0:6419
  ```
  Then open `http://localhost:6419/` in a browser.

### Lint / Test / Build

- There are no lint, test, or build steps for this repository.
