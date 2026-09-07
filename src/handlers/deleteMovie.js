import { getMovieById, deleteMovie, clearSession } from '../db.js';
import { confirmDeleteKeyboard } from '../keyboards.js';
import { showMovieList } from './movieList.js';

export async function startDeleteMovieSelection(ctx, db) {
  await showMovieList(ctx, db, 'delete', 0);
}

export async function startDeleteConfirm(ctx, db, movieId) {
  const movie = await getMovieById(db, movieId);
  if (!movie) {
    await ctx.reply('❌ Фильм не найден (возможно, уже удалён).');
    return;
  }
  await ctx.reply(
    `🗑 Удалить фильм «${movie.title}» (${movie.year}) из каталога?\n\nЭто действие необратимо.`,
    { reply_markup: confirmDeleteKeyboard(movieId) }
  );
}

export async function handleDeleteConfirmCallback(ctx, db, movieId) {
  await ctx.answerCallbackQuery();
  const movie = await getMovieById(db, movieId);
  if (!movie) {
    await ctx.editMessageText('❌ Фильм уже был удалён.').catch(() => {});
    return;
  }
  await deleteMovie(db, movieId);
  await ctx.editMessageText(`✅ Фильм «${movie.title}» удалён из каталога.`).catch(() => {});
}

export async function handleDeleteCancelCallback(ctx, db) {
  await ctx.answerCallbackQuery();
  await clearSession(db, ctx.from.id);
  await ctx.editMessageText('❌ Удаление отменено.').catch(() => {});
}
