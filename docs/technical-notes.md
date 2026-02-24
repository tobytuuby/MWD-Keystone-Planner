# Technical Notes

## Local setup
1. Copy `.env.example` to `.env`
2. Set:
- `CLIENT_ID`
- `TOKEN`
- `EXPANSION` (example: `tww`)
- `SEASON` (example: `s3`)
3. Install dependencies:
- `npm install`

## Run and test
- Start bot: `node index.js`
- Register slash commands: `node deploy-commands.js`
- Lint: `npm run lint`
- Tests: `npm test -- --runInBand`

## Website
Static site files live in `website/`:
- `website/index.html`
- `website/terms-of-service.html`
- `website/privacy-policy.html`
- `website/styles.css`

GitHub Pages deploy workflow:
- `.github/workflows/pages.yml`

Published URL:
- `https://tobytuuby.github.io/MWD-Keystone-Planner/`

## Core command behavior
- Slash command: `/mwd-kp`
- Input format supports:
- `region/realm/name`
- `--best-runs`
- `--simulate <level>`

Data flow:
1. Read character data from Raider.IO
2. Build dungeon set for active expansion/season
3. Calculate score deltas
4. Return ranked image response
