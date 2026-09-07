import { INSTRUCTIONS_TEXT } from '../texts.js';
import { backOnlyKeyboard } from '../keyboards.js';

export async function handleInstructions(ctx) {
  await ctx.reply(INSTRUCTIONS_TEXT, {
    reply_markup: backOnlyKeyboard('instructions:back'),
  });
}

export async function handleInstructionsBack(ctx) {
  await ctx.answerCallbackQuery();
  await ctx.deleteMessage().catch(() => {});
}
