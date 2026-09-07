import { Bot, webhookCallback } from 'grammy';
import { getConfig, isAdmin } from './config.js';
import { touchUser } from './db.js';
import { NOT_ADMIN_TEXT } from './texts.js';

import { handleStartCommand, handleStartNextCallback, handleCheckSubscriptionCallback } from './handlers/start.js';
import { handleCardTelegram, handleCardBack, handleCardServices, handleServiceOpen, handleServicesBack } from './handlers/movieCardCallbacks.js';
import { handleInstructionsBack } from './handlers/instructions.js';
import { routeTextMessage } from './handlers/menuRouter.js';
import { handleAdminCommand, handleStatsCommand, handleCancelCommand, handleAdminMenuCallback } from './handlers/admin.js';
import {
  startAddMovie,
  handleAddMoviePhoto,
  handleAddServiceMoreCallback,
  handleAddServiceFinishCallback,
  handleAddServiceCommand,
  handleAddMovieSaveCallback,
  handleAddMovieDiscardCallback,
} from './handlers/addMovie.js';
import {
  startEditMovieSelection,
  handleEditFieldCallback,
  handleEditMoviePhoto,
  handleEditMovieSaveCallback,
  handleEditMovieDiscardCallback,
  handleEditServiceFinish,
} from './handlers/editMovie.js';
import {
  startDeleteMovieSelection,
  handleDeleteConfirmCallback,
  handleDeleteCancelCallback,
} from './handlers/deleteMovie.js';
import { showMovieList, handleMovieListCallback, handleManageCallback } from './handlers/movieList.js';
import { getSession } from './db.js';

function buildBot(env) {
  const config = getConfig(env);
  const db = env.DB;
  const bot = new Bot(config.botToken);

  // Track every private-chat user for /stats, and reject updates from
  // anywhere except private chats (this bot has no group functionality).
  bot.use(async (ctx, next) => {
    if (ctx.chat?.type !== 'private') return;
    if (ctx.from) await touchUser(db, ctx.from.id);
    await next();
  });

  function requireAdmin(handler) {
    return async (ctx) => {
      if (!isAdmin(config, ctx.from.id)) {
        await ctx.reply(NOT_ADMIN_TEXT);
        return;
      }
      await handler(ctx);
    };
  }

  // ---- Commands ------------------------------------------------------
  bot.command('start', (ctx) => handleStartCommand(ctx, db));

  bot.command('admin', requireAdmin((ctx) => handleAdminCommand(ctx)));
  bot.command('stats', requireAdmin((ctx) => handleStatsCommand(ctx, db)));
  bot.command('movies', requireAdmin((ctx) => showMovieList(ctx, db, 'view', 0)));
  bot.command('addmovie', requireAdmin((ctx) => startAddMovie(ctx, db)));
  bot.command('editmovie', requireAdmin((ctx) => startEditMovieSelection(ctx, db)));
  bot.command('deletemovie', requireAdmin((ctx) => startDeleteMovieSelection(ctx, db)));

  bot.command('cancel', requireAdmin((ctx) => handleCancelCommand(ctx, db)));

  bot.command('addservice', requireAdmin(async (ctx) => {
    const session = await getSession(db, ctx.from.id);
    if (session.serviceEdit) {
      const handled = await handleEditServiceFinish(ctx, db, session);
      if (handled) return;
    }
    await handleAddServiceCommand(ctx, db, session);
  }));

  // ---- Photos (poster upload during add/edit movie) -------------------
  bot.on('message:photo', async (ctx) => {
    if (ctx.chat?.type !== 'private' || !isAdmin(config, ctx.from.id)) return;
    const session = await getSession(db, ctx.from.id);
    const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;

    if (session.mode === 'admin_addmovie' && session.step === 'poster') {
      await handleAddMoviePhoto(ctx, db, session, fileId);
      return;
    }
    if (session.mode === 'admin_editmovie' && session.waitingField === 'poster') {
      await handleEditMoviePhoto(ctx, db, session, fileId);
      return;
    }
  });

  // ---- Plain text (menu buttons + search prompts + wizard input) ------
  bot.on('message:text', async (ctx) => {
    await routeTextMessage(ctx, db, config, ctx.message.text);
  });

  // ---- Callback queries -------------------------------------------------
  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;
    const parts = data.split(':');
    const [ns, action, ...rest] = parts;

    try {
      switch (ns) {
        case 'start':
          if (action === 'next') await handleStartNextCallback(ctx, config);
          return;
        case 'sub':
          if (action === 'check') await handleCheckSubscriptionCallback(ctx, config);
          return;
        case 'card': {
          const movieId = Number(rest[0]);
          if (action === 'telegram') await handleCardTelegram(ctx, config);
          else if (action === 'services') await handleCardServices(ctx, db, movieId);
          else if (action === 'back') await handleCardBack(ctx, db, movieId);
          return;
        }
        case 'svc': {
          if (action === 'open') {
            const [movieId, idx] = rest;
            await handleServiceOpen(ctx, db, Number(movieId), Number(idx));
          } else if (action === 'back') {
            await handleServicesBack(ctx, db, Number(rest[0]));
          }
          return;
        }
        case 'instructions':
          if (action === 'back') await handleInstructionsBack(ctx);
          return;
        case 'admin':
          if (!isAdmin(config, ctx.from.id)) {
            await ctx.answerCallbackQuery({ text: NOT_ADMIN_TEXT, show_alert: true });
            return;
          }
          await handleAdminMenuCallback(ctx, db, action);
          return;
        case 'addservice':
          if (!isAdmin(config, ctx.from.id)) return;
          {
            const session = await getSession(db, ctx.from.id);
            if (action === 'more') await handleAddServiceMoreCallback(ctx, db, session);
            else if (action === 'finish') await handleAddServiceFinishCallback(ctx, db, session);
          }
          return;
        case 'addmovie':
          if (!isAdmin(config, ctx.from.id)) return;
          {
            const session = await getSession(db, ctx.from.id);
            if (action === 'save') await handleAddMovieSaveCallback(ctx, db, session);
            else if (action === 'discard') await handleAddMovieDiscardCallback(ctx, db);
          }
          return;
        case 'editfield':
          if (!isAdmin(config, ctx.from.id)) return;
          {
            const session = await getSession(db, ctx.from.id);
            await handleEditFieldCallback(ctx, db, session, action);
          }
          return;
        case 'editmovie':
          if (!isAdmin(config, ctx.from.id)) return;
          {
            const session = await getSession(db, ctx.from.id);
            if (action === 'save') await handleEditMovieSaveCallback(ctx, db, session);
            else if (action === 'discard') await handleEditMovieDiscardCallback(ctx, db);
          }
          return;
        case 'movielist':
          if (!isAdmin(config, ctx.from.id)) return;
          await handleMovieListCallback(ctx, db, action, rest);
          return;
        case 'manage':
          if (!isAdmin(config, ctx.from.id)) return;
          await handleManageCallback(ctx, db, action, Number(rest[0]));
          return;
        case 'delete':
          if (!isAdmin(config, ctx.from.id)) return;
          if (action === 'confirm') await handleDeleteConfirmCallback(ctx, db, Number(rest[0]));
          else if (action === 'cancel') await handleDeleteCancelCallback(ctx, db);
          return;
        default:
          await ctx.answerCallbackQuery();
      }
    } catch (err) {
      console.error('callback_query error:', err);
      await ctx.answerCallbackQuery({ text: '⚠️ Произошла ошибка.', show_alert: true }).catch(() => {});
    }
  });

  bot.catch((err) => {
    console.error('Bot error:', err.error ?? err);
  });

  return { bot, config };
}

export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'POST') {
      return new Response('Kinoplyonka bot is running.', { status: 200 });
    }

    try {
      const { bot, config } = buildBot(env);
      const handleUpdate = webhookCallback(bot, 'cloudflare-mod', {
        secretToken: config.webhookSecret || undefined,
      });
      return await handleUpdate(request);
    } catch (err) {
      console.error('Fatal webhook error:', err);
      return new Response('OK', { status: 200 });
    }
  },
};
