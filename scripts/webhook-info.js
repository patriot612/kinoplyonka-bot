/**
 * Usage: BOT_TOKEN=xxx node scripts/webhook-info.js
 * Or just open https://api.telegram.org/bot<TOKEN>/getWebhookInfo in a browser.
 */
const token = process.env.BOT_TOKEN;
if (!token) {
  console.error('Укажите переменную окружения BOT_TOKEN.');
  process.exit(1);
}
const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
console.log(JSON.stringify(await res.json(), null, 2));
