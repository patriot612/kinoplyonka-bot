import { listMovies, getMovieById } from '../db.js';
import { movieListKeyboard, movieManageKeyboard } from '../keyboards.js';
import { NO_MOVIES_TEXT } from '../texts.js';
import { buildMovieCaption } from '../movieCard.js';
import { startEditMovie } from './editMovie.js';
import { startDeleteConfirm } from './deleteMovie.js';

const PAGE_SIZE = 20;

/**
 * @param {'view'|'edit'|'delete'} action
 */
export async function showMovieList(ctx, db, action, offset = 0) {
  const movies = await listMovies(db, { limit: PAGE_SIZE + 1, offset });
  if (movies.length === 0 && offset === 0) {
    await ctx.reply(NO_MOVIES_TEXT);
    return;
  }
  const hasMore = movies.length > PAGE_SIZE;
  const page = movies.slice(0, PAGE_SIZE);
  const title = { view: '🎬 Каталог фильмов', edit: '✏️ Выберите фильм для редактирования', delete: '🗑 Выберите фильм для удаления' }[action];
  await ctx.reply(title, {
    reply_markup: movieListKeyboard(page, action, { offset, hasMore }),
  });
}

/** Routes taps on a movie-list item / pagination button. */
export async function handleMovieListCallback(ctx, db, action, rest) {
  await ctx.answerCallbackQuery();

  if (rest[0] === 'page') {
    const offset = Number(rest[1]) || 0;
    await ctx.deleteMessage().catch(() => {});
    await showMovieList(ctx, db, action, offset);
    return;
  }

  const movieId = Number(rest[0]);
  if (action === 'view') {
    await showAdminMoviePreview(ctx, db, movieId);
  } else if (action === 'edit') {
    await ctx.deleteMessage().catch(() => {});
    await startEditMovie(ctx, db, movieId);
  } else if (action === 'delete') {
    await ctx.deleteMessage().catch(() => {});
    await startDeleteConfirm(ctx, db, movieId);
  }
}

/** Admin-only preview that also shows the internal code and manage buttons. */
export async function showAdminMoviePreview(ctx, db, movieId) {
  const movie = await getMovieById(db, movieId);
  if (!movie) {
    await ctx.reply('❌ Фильм не найден (возможно, был удалён).');
    return;
  }
  const caption = `${buildMovieCaption(movie)}\n\n🔑 Код: ${movie.code}`;
  await ctx.replyWithPhoto(movie.posterFileId, {
    caption,
    reply_markup: movieManageKeyboard(movie.id),
  });
}

/** "✏️ Редактировать" / "🗑 Удалить" pressed from the admin preview card. */
export async function handleManageCallback(ctx, db, action, movieId) {
  await ctx.answerCallbackQuery();
  await ctx.deleteMessage().catch(() => {});
  if (action === 'edit') {
    await startEditMovie(ctx, db, movieId);
  } else if (action === 'delete') {
    await startDeleteConfirm(ctx, db, movieId);
  }
}
