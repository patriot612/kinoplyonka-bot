import { getMovieById, setSession, clearSession, codeExists, updateMovie } from '../db.js';
import { editFieldsKeyboard, editSaveCancelKeyboard } from '../keyboards.js';
import { buildMovieCaption } from '../movieCard.js';
import { showMovieList } from './movieList.js';
import { isValidUrl } from './addMovie.js';

const FIELD_LABELS = {
  title: 'Название',
  country: 'Страну',
  year: 'Год',
  rating: 'Рейтинг',
  description: 'Описание',
  code: 'Код',
};

export async function startEditMovieSelection(ctx, db) {
  await showMovieList(ctx, db, 'edit', 0);
}

export async function startEditMovie(ctx, db, movieId) {
  const movie = await getMovieById(db, movieId);
  if (!movie) {
    await ctx.reply('❌ Фильм не найден (возможно, был удалён).');
    return;
  }
  await setSession(db, ctx.from.id, {
    mode: 'admin_editmovie',
    movieId,
    data: { ...movie },
  });
  await sendFieldsMenu(ctx, movie, { ...movie });
}

async function sendFieldsMenu(ctx, original, data) {
  const caption = `${buildMovieCaption(data)}\n\n🔑 Код: ${data.code}\n📺 Сервисов: ${data.services.length}\n\nВыберите поле для редактирования:`;
  await ctx.replyWithPhoto(data.posterFileId, {
    caption,
    reply_markup: editFieldsKeyboard(),
  });
}

export async function handleEditFieldCallback(ctx, db, session, field) {
  await ctx.answerCallbackQuery();

  if (field === 'cancel') {
    await clearSession(db, ctx.from.id);
    await ctx.reply('❌ Редактирование отменено. Изменения не сохранены.');
    return;
  }

  if (field === 'done') {
    await sendFinalPreview(ctx, session.data);
    return;
  }

  if (field === 'poster') {
    session.waitingField = 'poster';
    await setSession(db, ctx.from.id, session);
    await ctx.reply('🖼 Отправьте новый постер (фото):');
    return;
  }

  if (field === 'services') {
    session.waitingField = null;
    session.serviceEdit = { step: 'emoji', current: {}, collected: [] };
    await setSession(db, ctx.from.id, session);
    await ctx.reply(
      '📺 Сервисы будут заменены новым списком (до 4 штук).\n\nВведите эмодзи для сервиса 1:'
    );
    return;
  }

  session.waitingField = field;
  await setSession(db, ctx.from.id, session);
  await ctx.reply(`Введите новое значение (${FIELD_LABELS[field]}):`);
}

export async function handleEditMovieText(ctx, db, session, text) {
  if (session.serviceEdit) {
    await handleServiceEditSubStep(ctx, db, session, text);
    return;
  }

  const field = session.waitingField;
  if (!field) return;

  if (field === 'code') {
    const exists = await codeExists(db, text, session.movieId);
    if (exists) {
      await ctx.reply('❌ Такой код уже используется другим фильмом. Введите другой код:');
      return;
    }
    session.data.code = text.trim();
  } else {
    session.data[field] = text.trim();
  }

  session.waitingField = null;
  await setSession(db, ctx.from.id, session);
  await sendFieldsMenu(ctx, null, session.data);
}

export async function handleEditMoviePhoto(ctx, db, session, fileId) {
  if (session.waitingField !== 'poster') return;
  session.data.posterFileId = fileId;
  session.waitingField = null;
  await setSession(db, ctx.from.id, session);
  await sendFieldsMenu(ctx, null, session.data);
}

async function handleServiceEditSubStep(ctx, db, session, text) {
  const se = session.serviceEdit;

  if (se.step === 'emoji') {
    se.current.emoji = text.trim();
    se.step = 'name';
    await setSession(db, ctx.from.id, session);
    await ctx.reply('Введите название сервиса:');
    return;
  }

  if (se.step === 'name') {
    se.current.name = text.trim();
    se.step = 'url';
    await setSession(db, ctx.from.id, session);
    await ctx.reply('Введите URL сервиса:');
    return;
  }

  if (se.step === 'url') {
    if (!isValidUrl(text.trim())) {
      await ctx.reply('❌ Некорректная ссылка (нужен http:// или https://). Введите URL ещё раз:');
      return;
    }
    se.current.url = text.trim();
    se.collected.push({ ...se.current });
    se.current = {};

    if (se.collected.length >= 4) {
      session.data.services = se.collected;
      delete session.serviceEdit;
      await setSession(db, ctx.from.id, session);
      await sendFieldsMenu(ctx, null, session.data);
      return;
    }

    se.step = 'more';
    await setSession(db, ctx.from.id, session);
    await ctx.reply(
      `✅ Сервис добавлен (${se.collected.length} из 4). Отправьте /addservice чтобы закончить, или продолжайте — введите эмодзи следующего сервиса:`
    );
    return;
  }

  if (se.step === 'more') {
    // Any text here starts the next service's emoji step.
    se.step = 'emoji';
    await handleServiceEditSubStep(ctx, db, session, text);
  }
}

/** /addservice used while editing services. */
export async function handleEditServiceFinish(ctx, db, session) {
  if (!session.serviceEdit) return false;
  session.data.services = session.serviceEdit.collected;
  delete session.serviceEdit;
  await setSession(db, ctx.from.id, session);
  await sendFieldsMenu(ctx, null, session.data);
  return true;
}

async function sendFinalPreview(ctx, data) {
  const servicesList = data.services.length
    ? data.services.map((s) => `${s.emoji} ${s.name} → ${s.url}`).join('\n')
    : '(нет сервисов)';

  const caption = `${buildMovieCaption(data)}

🔑 Код: ${data.code}

📺 Сервисы:
${servicesList}

Сохранить изменения?`;

  await ctx.replyWithPhoto(data.posterFileId, {
    caption,
    reply_markup: editSaveCancelKeyboard(),
  });
}

export async function handleEditMovieSaveCallback(ctx, db, session) {
  await ctx.answerCallbackQuery();
  await updateMovie(db, session.movieId, session.data);
  await clearSession(db, ctx.from.id);
  await ctx.reply('✅ Изменения сохранены.');
}

export async function handleEditMovieDiscardCallback(ctx, db) {
  await ctx.answerCallbackQuery();
  await clearSession(db, ctx.from.id);
  await ctx.reply('❌ Изменения не сохранены.');
}
