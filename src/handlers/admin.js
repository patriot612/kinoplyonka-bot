import { countMovies, countUsers, clearSession } from '../db.js';
import { adminMenuKeyboard } from '../keyboards.js';
import { CANCELLED_TEXT, NOTHING_TO_CANCEL_TEXT } from '../texts.js';
import { startAddMovie } from './addMovie.js';
import { startEditMovieSelection } from './editMovie.js';
import { startDeleteMovieSelection } from './deleteMovie.js';
import { showMovieList } from './movieList.js';

export async function handleAdminCommand(ctx) {
  await ctx.reply('🛠 Админ-меню:', { reply_markup: adminMenuKeyboard() });
}

export async function handleStatsCommand(ctx, db) {
  const [movies, users] = await Promise.all([countMovies(db), countUsers(db)]);
  await ctx.reply(`📊 Статистика

👤 Пользователей: ${users}
🎬 Фильмов в каталоге: ${movies}`);
}

export async function handleCancelCommand(ctx, db) {
  const hadSession = await clearIfActive(ctx, db);
  await ctx.reply(hadSession ? CANCELLED_TEXT : NOTHING_TO_CANCEL_TEXT);
}

async function clearIfActive(ctx, db) {
  const { getSession } = await import('../db.js');
  const session = await getSession(db, ctx.from.id);
  const active = Boolean(session && session.mode);
  await clearSession(db, ctx.from.id);
  return active;
}

/** Routes taps on the /admin inline menu. */
export async function handleAdminMenuCallback(ctx, db, action) {
  await ctx.answerCallbackQuery();
  switch (action) {
    case 'stats':
      await handleStatsCommand(ctx, db);
      break;
    case 'movies':
      await showMovieList(ctx, db, 'view', 0);
      break;
    case 'addmovie':
      await startAddMovie(ctx, db);
      break;
    case 'editmovie':
      await startEditMovieSelection(ctx, db);
      break;
    case 'deletemovie':
      await startDeleteMovieSelection(ctx, db);
      break;
    case 'cancel':
      await handleCancelCommand(ctx, db);
      break;
    default:
      break;
  }
}
