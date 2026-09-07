import { subscribeKeyboard } from './keyboards.js';
import { SUBSCRIBE_PROMPT_TEXT, NOT_SUBSCRIBED_TEXT } from './texts.js';

const ALLOWED_STATUSES = ['creator', 'administrator', 'member'];
// 'restricted' can still count as subscribed depending on channel settings;
// left out on purpose to keep the check strict and unambiguous.

/**
 * Calls the Telegram Bot API directly (getChatMember) — this is always a
 * live check, never a cached/assumed value, which is what makes the
 * "continuous validation" requirement work.
 */
export async function isSubscribed(api, channelId, userId) {
  try {
    const member = await api.getChatMember(channelId, userId);
    return ALLOWED_STATUSES.includes(member.status);
  } catch (err) {
    // If the bot isn't an admin of the channel, or the user has never
    // interacted with it, Telegram may throw. Fail closed (treat as not
    // subscribed) rather than silently granting access.
    console.error('getChatMember failed:', err.message);
    return false;
  }
}

/**
 * Sends the subscription prompt. Used both for first-time users and for
 * users who lost their subscription later.
 */
export async function sendSubscribePrompt(ctx, config) {
  await ctx.reply(SUBSCRIBE_PROMPT_TEXT, {
    reply_markup: subscribeKeyboard(config.channelUrl),
  });
}

/**
 * Gatekeeper used before every protected action (menu buttons, code/title
 * search, random movie, etc). Returns true if the user may proceed.
 */
export async function ensureSubscribed(ctx, config) {
  const subscribed = await isSubscribed(ctx.api, config.channelId, ctx.from.id);
  if (!subscribed) {
    await sendSubscribePrompt(ctx, config);
  }
  return subscribed;
}

export { NOT_SUBSCRIBED_TEXT };
