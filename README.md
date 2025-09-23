# EOXS Ticket Dragger API

A lightweight API wrapping a Playwright automation to create/drag EOXS tickets.

## Quick start (local)
1. Copy .env.example to .env and set values
2. Install deps and browsers

```bash
npm install
npx playwright install chromium
npm start
```

- Health: GET /health
- Info: GET /
- Create single ticket: POST /create-ticket
- Create batch tickets: POST /create-tickets-batch

Example request:
```bash
curl -X POST http://localhost:3000/create-ticket \
  -H 'Content-Type: application/json' \
  -d '{"subject":"Testing","customer":"Discount Pipe & Steel","body":"Email content","assignedTo":"Sahaj Katiyar"}'
```

## Deploy (Docker/Railway)
- Dockerfile installs Chromium via Playwright image
- Server listens on PORT (default 3000) and exposes health at /health
- Railway config provided in railway.json

## Required env vars
- EOXS_EMAIL
- EOXS_PASSWORD
- HEADLESS (true/false, defaults true in Docker)

## Notes
- Screenshots saved in repo root as screenshot_*.png
- To run headfully locally, set HEADLESS=false

# EOXS Ticket Dragger API

A lightweight API wrapping a Playwright automation to create/drag EOXS tickets.

## Quick start (local)
1. Copy .env.example to .env and set values
2. Install deps and browsers

```bash
npm install
npx playwright install chromium
npm start
```

- Health: GET /health
- Info: GET /
- Create single ticket: POST /create-ticket
- Create batch tickets: POST /create-tickets-batch

Example request:
```bash
curl -X POST http://localhost:3000/create-ticket \
  -H 'Content-Type: application/json' \
  -d '{"subject":"Testing","customer":"Discount Pipe & Steel","body":"Email content","assignedTo":"Sahaj Katiyar"}'
```

## Deploy (Docker/Railway)
- Dockerfile installs Chromium via Playwright image
- Server listens on PORT (default 3000) and exposes health at /health
- Railway config provided in railway.json

## Required env vars
- EOXS_EMAIL
- EOXS_PASSWORD
- HEADLESS (true/false, defaults true in Docker)

## Notes
- Screenshots saved in repo root as screenshot_*.png
- To run headfully locally, set HEADLESS=false
