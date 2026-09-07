import { getSession } from '../db.js';
import { MENU_BUTTONS } from '../keyboards.js';
import { ensureSubscribed } from '../subscription.js';
import { handleStartInfoButton } from './start.js';
import { handleRandomMovie } from './randomMovie.js';
import {
  promptSearchByCode,
  promptSearchByTitle,
  handleCodeInput,
  handleTitleInput,
} from './search.js';
import { handleInstructions } from './instructions.js';
import { isAdmin } from '../config.js';
import { handleAddMovieText } from './addMovie.js';
import { handleEditMovieText } from './editMovie.js';

/**
 * Handles every plain text message that isn't a "/command".
 * Priority order:
 *   1. Active admin wizard (addmovie / editmovie) — admins only.
 *   2. Active "awaiting_code" / "awaiting_title" search prompt.
 *   3. A tap on one of the main-menu reply-keyboard buttons.
 *   4. Otherwise, ignored (no protected action requested).
 */
export async function routeTextMessage(ctx, db, config, text) {
  const session = await getSession(db, ctx.from.id);

  if (session.mode === 'admin_addmovie' && isAdmin(config, ctx.from.id)) {
    await handleAddMovieText(ctx, db, session, text);
    return;
  }

  if (session.mode === 'admin_editmovie' && isAdmin(config, ctx.from.id)) {
    await handleEditMovieText(ctx, db, session, text);
    return;
  }

  if (session.mode === 'awaiting_code') {
    if (!(await ensureSubscribed(ctx, config))) return;
    await handleCodeInput(ctx, db, text);
    return;
  }

  if (session.mode === 'awaiting_title') {
    if (!(await ensureSubscribed(ctx, config))) return;
    await handleTitleInput(ctx, db, text);
    return;
  }

  switch (text) {
    case MENU_BUTTONS.START_INFO:
      await handleStartInfoButton(ctx);
      return;
    case MENU_BUTTONS.RANDOM:
      if (!(await ensureSubscribed(ctx, config))) return;
      await handleRandomMovie(ctx, db);
      return;
    case MENU_BUTTONS.SEARCH_CODE:
      if (!(await ensureSubscribed(ctx, config))) return;
      await promptSearchByCode(ctx, db);
      return;
    case MENU_BUTTONS.SEARCH_TITLE:
      if (!(await ensureSubscribed(ctx, config))) return;
      await promptSearchByTitle(ctx, db);
      return;
    case MENU_BUTTONS.INSTRUCTIONS:
      if (!(await ensureSubscribed(ctx, config))) return;
      await handleInstructions(ctx);
      return;
    default:
      // Unrecognized free text with no active session: stay quiet rather
      // than spam the user, matching "do not add unrequested behaviour".
      return;
  }
}
