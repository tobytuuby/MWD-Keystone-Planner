# MWD Keystone Planner
MWD Keystone Planner is a Discord bot that checks a character's Mythic+ runs and returns which dungeons would most improve overall score.

## Environment variables
Copy `.env.example` to `.env` and set:
- `CLIENT_ID`
- `TOKEN`
- `EXPANSION` (example: `tww`)
- `SEASON` (example: `s3`)

## Website
A static site bundle is included in `website/`:
- `website/index.html`
- `website/terms-of-service.html`
- `website/privacy-policy.html`
- `website/styles.css`

GitHub Pages deployment is configured via `.github/workflows/pages.yml`.
After pushing to `main` or `master`, the site is published to:
- `https://tobytuuby.github.io/MWD-Keystone-Planner/`
