import { movieCardKeyboard } from './keyboards.js';
import { setMessageContext } from './db.js';

/** Builds the caption shown under the poster. Never includes the internal code. */
export function buildMovieCaption(movie) {
  return `🎬 ${movie.title}
🌍 ${movie.country} • 📅 ${movie.year}
⭐ ${movie.rating}

📝 ${movie.description}`;
}

/**
 * Sends a fresh movie card (poster + caption + buttons) and records it in
 * message_context so that "Назад" / "Сервисы" → "Назад" know which message
 * to delete or restore later.
 */
export async function sendMovieCard(ctx, db, movie) {
  const sent = await ctx.replyWithPhoto(movie.posterFileId, {
    caption: buildMovieCaption(movie),
    reply_markup: movieCardKeyboard(movie.id),
  });
  await setMessageContext(db, ctx.from.id, {
    lastMovieCardMessageId: sent.message_id,
    lastMovieId: movie.id,
    lastServicesMessageId: null,
  });
  return sent;
}

/** Re-sends a movie card as a *new* message (used to restore it from Services). */
export async function restoreMovieCard(ctx, db, movie) {
  return sendMovieCard(ctx, db, movie);
}
