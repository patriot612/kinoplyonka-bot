/**
 * Central place that reads configuration from Cloudflare Worker environment
 * bindings/secrets. Nothing sensitive is hardcoded anywhere else in the code.
 *
 * Required secrets/vars (set via `wrangler secret put <NAME>` or the
 * Cloudflare dashboard — see DEPLOYMENT_RU.md):
 *
 *  BOT_TOKEN       - Telegram bot token from @BotFather
 *  CHANNEL_ID      - channel used for the mandatory subscription check.
 *                    Can be "@channelusername" or a numeric "-100..." id.
 *  CHANNEL_URL     - https://t.me/... link opened by the "Подписаться" button
 *  ADMIN_IDS       - comma-separated list of admin Telegram numeric IDs
 *  WEBHOOK_SECRET  - random string used to verify Telegram webhook requests
 */
export function getConfig(env) {
  const adminIds = (env.ADMIN_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number);

  return {
    botToken: env.BOT_TOKEN,
    channelId: env.CHANNEL_ID,
    channelUrl: env.CHANNEL_URL,
    adminIds,
    webhookSecret: env.WEBHOOK_SECRET,
  };
}

export function isAdmin(config, telegramId) {
  return config.adminIds.includes(Number(telegramId));
}
