import { getMovieById, setMessageContext, getMessageContext } from '../db.js';
import { servicesKeyboard } from '../keyboards.js';
import { SERVICES_PROMPT_TEXT } from '../texts.js';
import { restoreMovieCard } from '../movieCard.js';

export async function handleCardTelegram(ctx, config) {
  await ctx.answerCallbackQuery({ url: config.channelUrl });
}

export async function handleCardBack(ctx, db, movieId) {
  await ctx.answerCallbackQuery();
  await ctx.deleteMessage().catch(() => {});
  await setMessageContext(db, ctx.from.id, {
    lastMovieCardMessageId: null,
    lastMovieId: null,
  });
}

/**
 * "🎬 Сервисы" pressed on a movie card:
 * 1. delete the movie card
 * 2. if a stale services message from a *different* movie is still open,
 *    delete it too (message accumulation guard)
 * 3. send a fresh services message for this movie
 */
export async function handleCardServices(ctx, db, movieId) {
  await ctx.answerCallbackQuery();

  const movie = await getMovieById(db, movieId);
  if (!movie) {
    await ctx.reply('❌ Этот фильм больше недоступен.');
    return;
  }

  const context = await getMessageContext(db, ctx.from.id);

  // delete the movie card the user opened Services from
  await ctx.deleteMessage().catch(() => {});

  // guard against orphaned services messages from another movie
  if (context.lastServicesMessageId) {
    await ctx.api
      .deleteMessage(ctx.chat.id, context.lastServicesMessageId)
      .catch(() => {});
  }

  if (!movie.services || movie.services.length === 0) {
    const sent = await ctx.reply('📺 Для этого фильма пока не добавлены сервисы для просмотра.');
    await setMessageContext(db, ctx.from.id, {
      lastServicesMessageId: sent.message_id,
      lastMovieId: movie.id,
      lastMovieCardMessageId: null,
    });
    return;
  }

  const sent = await ctx.reply(SERVICES_PROMPT_TEXT, {
    reply_markup: servicesKeyboard(movie.id, movie.services),
  });

  await setMessageContext(db, ctx.from.id, {
    lastServicesMessageId: sent.message_id,
    lastMovieId: movie.id,
    lastMovieCardMessageId: null,
  });
}

export async function handleServiceOpen(ctx, db, movieId, serviceIndex) {
  const movie = await getMovieById(db, movieId);
  const service = movie?.services?.[serviceIndex];
  if (!service) {
    await ctx.answerCallbackQuery({ text: '❌ Сервис не найден.', show_alert: true });
    return;
  }
  await ctx.answerCallbackQuery({ url: service.url });
}

/**
 * "⬅️ Назад" on the services message: delete it and restore the exact movie
 * card (as a new message, since Telegram doesn't let us turn a text message
 * back into a photo message via edit).
 */
export async function handleServicesBack(ctx, db, movieId) {
  await ctx.answerCallbackQuery();

  const movie = await getMovieById(db, movieId);
  await ctx.deleteMessage().catch(() => {});

  if (!movie) {
    await ctx.reply('❌ Этот фильм больше недоступен.');
    return;
  }

  await restoreMovieCard(ctx, db, movie);
}
