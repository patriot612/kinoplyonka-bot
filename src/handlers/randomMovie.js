import { getRandomMovie } from '../db.js';
import { sendMovieCard } from '../movieCard.js';
import { NO_MOVIES_TEXT } from '../texts.js';

export async function handleRandomMovie(ctx, db) {
  const movie = await getRandomMovie(db);
  if (!movie) {
    await ctx.reply(NO_MOVIES_TEXT);
    return;
  }
  await sendMovieCard(ctx, db, movie);
}
