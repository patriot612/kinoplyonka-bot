import { getMovieByCode, findMovieByTitle, setSession } from '../db.js';
import { sendMovieCard } from '../movieCard.js';
import {
  ASK_CODE_TEXT,
  ASK_TITLE_TEXT,
  CODE_NOT_FOUND_TEXT,
  TITLE_NOT_FOUND_TEXT,
} from '../texts.js';

export async function promptSearchByCode(ctx, db) {
  await setSession(db, ctx.from.id, { mode: 'awaiting_code' });
  await ctx.reply(ASK_CODE_TEXT);
}

export async function promptSearchByTitle(ctx, db) {
  await setSession(db, ctx.from.id, { mode: 'awaiting_title' });
  await ctx.reply(ASK_TITLE_TEXT);
}

export async function handleCodeInput(ctx, db, code) {
  await setSession(db, ctx.from.id, {});
  const movie = await getMovieByCode(db, code);
  if (!movie) {
    await ctx.reply(CODE_NOT_FOUND_TEXT);
    return;
  }
  await sendMovieCard(ctx, db, movie);
}

export async function handleTitleInput(ctx, db, title) {
  await setSession(db, ctx.from.id, {});
  const movie = await findMovieByTitle(db, title);
  if (!movie) {
    await ctx.reply(TITLE_NOT_FOUND_TEXT);
    return;
  }
  await sendMovieCard(ctx, db, movie);
}
