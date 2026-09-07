import { setSession, getSession, clearSession, codeExists, createMovie } from '../db.js';
import { saveCancelKeyboard } from '../keyboards.js';
import { buildMovieCaption } from '../movieCard.js';
import { InlineKeyboard } from 'grammy';

const STEP_PROMPTS = {
  title: '🎬 Введите название фильма:',
  country: '🌍 Введите страну:',
  year: '📅 Введите год выпуска:',
  rating: '⭐ Введите рейтинг:',
  description: '📝 Введите описание фильма:',
  poster: '🖼 Отправьте постер фильма (фото):',
  code: '🔑 Введите уникальный код фильма:',
};

const STEP_ORDER = ['title', 'country', 'year', 'rating', 'description', 'poster', 'code'];

function nextStep(step) {
  const i = STEP_ORDER.indexOf(step);
  return STEP_ORDER[i + 1];
}

function serviceMoreKeyboard() {
  return new InlineKeyboard()
    .text('➕ Добавить ещё сервис', 'addservice:more')
    .row()
    .text('✅ Готово (как /addservice)', 'addservice:finish');
}

export async function startAddMovie(ctx, db) {
  await setSession(db, ctx.from.id, {
    mode: 'admin_addmovie',
    step: 'title',
    data: { services: [] },
  });
  await ctx.reply(STEP_PROMPTS.title);
}

/** Handles a plain text message while an addmovie session is active. */
export async function handleAddMovieText(ctx, db, session, text) {
  const { step, data } = session;

  if (STEP_ORDER.includes(step) && step !== 'poster') {
    if (step === 'code') {
      const exists = await codeExists(db, text);
      if (exists) {
        await ctx.reply('❌ Такой код уже используется. Введите другой уникальный код:');
        return;
      }
      data.code = text.trim();
      session.step = 'services';
      session.serviceSub = 'emoji';
      session.currentService = {};
      await setSession(db, ctx.from.id, session);
      await ctx.reply('🧩 Сервис 1 из 4 (максимум).\n\nВведите эмодзи для сервиса:');
      return;
    }

    data[step] = text.trim();
    const next = nextStep(step);
    session.step = next;
    await setSession(db, ctx.from.id, session);
    await ctx.reply(STEP_PROMPTS[next]);
    return;
  }

  if (step === 'services') {
    await handleServiceSubStep(ctx, db, session, text);
    return;
  }
}

/** Handles a sent photo while waiting for the poster. */
export async function handleAddMoviePhoto(ctx, db, session, fileId) {
  session.data.posterFileId = fileId;
  session.step = 'code';
  await setSession(db, ctx.from.id, session);
  await ctx.reply(STEP_PROMPTS.code);
}

async function handleServiceSubStep(ctx, db, session, text) {
  const { currentService } = session;

  if (session.serviceSub === 'emoji') {
    currentService.emoji = text.trim();
    session.serviceSub = 'name';
    await setSession(db, ctx.from.id, session);
    await ctx.reply('Введите название сервиса:');
    return;
  }

  if (session.serviceSub === 'name') {
    currentService.name = text.trim();
    session.serviceSub = 'url';
    await setSession(db, ctx.from.id, session);
    await ctx.reply('Введите URL (ссылку) сервиса:');
    return;
  }

  if (session.serviceSub === 'url') {
    if (!isValidUrl(text.trim())) {
      await ctx.reply('❌ Похоже, это не похоже на корректную ссылку (должна начинаться с http:// или https://). Введите URL ещё раз:');
      return;
    }
    currentService.url = text.trim();
    session.data.services.push({ ...currentService });
    session.currentService = {};
    session.serviceSub = null;
    await setSession(db, ctx.from.id, session);

    if (session.data.services.length >= 4) {
      await finishServices(ctx, db, session);
      return;
    }

    await ctx.reply(
      `✅ Сервис добавлен (${session.data.services.length} из 4). Добавить ещё один?`,
      { reply_markup: serviceMoreKeyboard() }
    );
    return;
  }
}

export async function handleAddServiceMoreCallback(ctx, db, session) {
  await ctx.answerCallbackQuery();
  session.serviceSub = 'emoji';
  session.currentService = {};
  await setSession(db, ctx.from.id, session);
  await ctx.reply(`🧩 Сервис ${session.data.services.length + 1} из 4.\n\nВведите эмодзи для сервиса:`);
}

export async function handleAddServiceFinishCallback(ctx, db, session) {
  await ctx.answerCallbackQuery();
  await finishServices(ctx, db, session);
}

/** Handles the /addservice command (finish service entry early). */
export async function handleAddServiceCommand(ctx, db, session) {
  if (!session || session.mode !== 'admin_addmovie' || session.step !== 'services') {
    await ctx.reply('Команда /addservice доступна только во время добавления сервисов при создании фильма.');
    return;
  }
  await finishServices(ctx, db, session);
}

async function finishServices(ctx, db, session) {
  session.step = 'confirm';
  await setSession(db, ctx.from.id, session);
  await sendPreview(ctx, session.data);
}

async function sendPreview(ctx, data) {
  const servicesList = data.services.length
    ? data.services.map((s) => `${s.emoji} ${s.name} → ${s.url}`).join('\n')
    : '(нет сервисов)';

  const caption = `${buildMovieCaption({ ...data })}

🔑 Код: ${data.code}

📺 Сервисы:
${servicesList}

Сохранить этот фильм в каталоге?`;

  await ctx.replyWithPhoto(data.posterFileId, {
    caption,
    reply_markup: saveCancelKeyboard(),
  });
}

export async function handleAddMovieSaveCallback(ctx, db, session) {
  await ctx.answerCallbackQuery();
  const { data } = session;
  await createMovie(db, data);
  await clearSession(db, ctx.from.id);
  await ctx.reply('✅ Фильм сохранён и добавлен в каталог.');
}

export async function handleAddMovieDiscardCallback(ctx, db) {
  await ctx.answerCallbackQuery();
  await clearSession(db, ctx.from.id);
  await ctx.reply('❌ Добавление фильма отменено. Фильм не сохранён.');
}

function isValidUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export { isValidUrl };
