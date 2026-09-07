/**
 * Optional convenience script — sets the Telegram webhook to your deployed
 * Cloudflare Worker URL. You can also just open the URL printed by this
 * script directly in your phone's browser instead of running this script;
 * see DEPLOYMENT_RU.md, раздел "Настройка Webhook".
 *
 * Usage:
 *   BOT_TOKEN=xxx WORKER_URL=https://your-worker.workers.dev WEBHOOK_SECRET=yyy node scripts/set-webhook.js
 */
const token = process.env.BOT_TOKEN;
const workerUrl = process.env.WORKER_URL;
const secret = process.env.WEBHOOK_SECRET;

if (!token || !workerUrl) {
  console.error('Укажите переменные окружения BOT_TOKEN и WORKER_URL.');
  process.exit(1);
}

const url = new URL(`https://api.telegram.org/bot${token}/setWebhook`);
url.searchParams.set('url', workerUrl);
if (secret) url.searchParams.set('secret_token', secret);

const res = await fetch(url);
const data = await res.json();
console.log(JSON.stringify(data, null, 2));
