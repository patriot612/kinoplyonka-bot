import { touchUser, clearSession } from '../db.js';
import { WELCOME_TEXT, SUBSCRIBE_CONFIRMED_TEXT, NOT_SUBSCRIBED_TEXT } from '../texts.js';
import { startNextKeyboard, subscribeKeyboard, mainMenuKeyboard } from '../keyboards.js';
import { isSubscribed, sendSubscribePrompt } from '../subscription.js';

export async function handleStartCommand(ctx, db) {
  await touchUser(db, ctx.from.id);
  await clearSession(db, ctx.from.id);
  await ctx.reply(WELCOME_TEXT, { reply_markup: startNextKeyboard() });
}

/** Shown from the "📖 Старт / обязательно к прочтению" menu button — just
 * the informational text, without re-running the subscription flow. */
export async function handleStartInfoButton(ctx) {
  await ctx.reply(WELCOME_TEXT);
}

export async function handleStartNextCallback(ctx, config) {
  await ctx.answerCallbackQuery();
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});
  await sendSubscribePrompt(ctx, config);
}

export async function handleCheckSubscriptionCallback(ctx, config) {
  const subscribed = await isSubscribed(ctx.api, config.channelId, ctx.from.id);

  if (subscribed) {
    await ctx.answerCallbackQuery({ text: '✅ Подписка подтверждена!' });
    await ctx.editMessageText(SUBSCRIBE_CONFIRMED_TEXT).catch(() => {});
    await ctx.reply('Главное меню открыто 👇', { reply_markup: mainMenuKeyboard() });
  } else {
    await ctx.answerCallbackQuery({ text: NOT_SUBSCRIBED_TEXT, show_alert: true });
  }
}
