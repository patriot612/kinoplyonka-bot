# Kinoplyonka Telegram Bot

A Telegram movie-catalog bot ("Киноплёнка"). The bot never streams or hosts
video — it only shows movie cards (poster, title, country, year, rating,
description) and links out to external services configured per movie.

Runs on **Cloudflare Workers** (serverless, no always-on process) with
**Cloudflare D1** (SQLite) as the database, using the
[grammY](https://grammy.dev) Telegram bot framework and Telegram webhooks.

For step-by-step deployment instructions in Russian, see
[`DEPLOYMENT_RU.md`](./DEPLOYMENT_RU.md).

## Project structure

```
src/
  index.js              Cloudflare Worker entry point / webhook router
  config.js             Reads secrets & admin IDs from the environment
  db.js                 All database access (D1)
  texts.js              All user-facing strings
  keyboards.js          Reply & inline keyboard builders
  movieCard.js          Movie card rendering helpers
  subscription.js       Channel-subscription verification
  handlers/
    start.js            /start + subscription flow
    menuRouter.js        Routes reply-keyboard taps & free-text input
    randomMovie.js       "🎲 Случайное кино"
    search.js            "🔑 Поиск по коду" / "🔎 Поиск по названию"
    instructions.js       "📜 Инструкция"
    movieCardCallbacks.js Movie card buttons (Telegram / Сервисы / Назад)
    admin.js              /admin, /stats, /cancel
    addMovie.js           /addmovie step-by-step wizard + /addservice
    editMovie.js          /editmovie field-by-field editor
    deleteMovie.js        /deletemovie + confirmation
    movieList.js          Shared movie browsing list (admin)
schema.sql              D1 database schema
wrangler.toml           Cloudflare Workers configuration
scripts/                Optional local helper scripts for webhook setup
```

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars   # fill in your real values
npm run db:init                  # create local D1 tables
npm run dev                      # wrangler dev, with a tunnel for webhooks
```

## Deploying

```bash
npm run db:init:remote           # create tables in the production D1 database
npm run deploy
```

Full explanation (GitHub + Cloudflare + Telegram webhook, written for a
non-programmer) is in `DEPLOYMENT_RU.md`.
