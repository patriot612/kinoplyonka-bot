import { Keyboard, InlineKeyboard } from 'grammy';

// Text of the user reply-keyboard buttons. Exported so handlers can match
// incoming text messages against these exact labels.
export const MENU_BUTTONS = {
  START_INFO: '📖 Старт / обязательно к прочтению',
  RANDOM: '🎲 Случайное кино',
  SEARCH_CODE: '🔑 Поиск по коду',
  SEARCH_TITLE: '🔎 Поиск по названию',
  INSTRUCTIONS: '📜 Инструкция',
};

export function mainMenuKeyboard() {
  return new Keyboard()
    .text(MENU_BUTTONS.START_INFO)
    .row()
    .text(MENU_BUTTONS.RANDOM)
    .row()
    .text(MENU_BUTTONS.SEARCH_CODE)
    .text(MENU_BUTTONS.SEARCH_TITLE)
    .row()
    .text(MENU_BUTTONS.INSTRUCTIONS)
    .resized();
}

export function startNextKeyboard() {
  return new InlineKeyboard().text('➡️ Дальше', 'start:next');
}

export function subscribeKeyboard(channelUrl) {
  return new InlineKeyboard()
    .url('📢 Подписаться на канал', channelUrl)
    .row()
    .text('✅ Проверить подписку', 'sub:check');
}

export function movieCardKeyboard(movieId) {
  return new InlineKeyboard()
    .text('📢 Telegram', `card:telegram:${movieId}`)
    .text('🎬 Сервисы', `card:services:${movieId}`)
    .row()
    .text('⬅️ Назад', `card:back:${movieId}`);
}

export function servicesKeyboard(movieId, services) {
  const kb = new InlineKeyboard();
  services.forEach((service, index) => {
    kb.text(`${service.emoji} ${service.name}`, `svc:open:${movieId}:${index}`).row();
  });
  kb.text('⬅️ Назад', `svc:back:${movieId}`);
  return kb;
}

export function backOnlyKeyboard(callbackData) {
  return new InlineKeyboard().text('⬅️ Назад', callbackData);
}

export function saveCancelKeyboard() {
  return new InlineKeyboard()
    .text('💾 Сохранить', 'addmovie:save')
    .text('❌ Не сохранять', 'addmovie:discard');
}

export function editSaveCancelKeyboard() {
  return new InlineKeyboard()
    .text('💾 Сохранить', 'editmovie:save')
    .text('❌ Не сохранять', 'editmovie:discard');
}

export function adminMenuKeyboard() {
  return new InlineKeyboard()
    .text('📊 Stats', 'admin:stats')
    .row()
    .text('🎬 Movies', 'admin:movies')
    .row()
    .text('➕ Add Movie', 'admin:addmovie')
    .row()
    .text('✏️ Edit Movie', 'admin:editmovie')
    .row()
    .text('🗑 Delete Movie', 'admin:deletemovie')
    .row()
    .text('❌ Cancel', 'admin:cancel');
}

export function editFieldsKeyboard() {
  return new InlineKeyboard()
    .text('Название', 'editfield:title')
    .text('Страна', 'editfield:country')
    .row()
    .text('Год', 'editfield:year')
    .text('Рейтинг', 'editfield:rating')
    .row()
    .text('Описание', 'editfield:description')
    .text('Постер', 'editfield:poster')
    .row()
    .text('Код', 'editfield:code')
    .text('Сервисы', 'editfield:services')
    .row()
    .text('💾 Сохранить изменения', 'editfield:done')
    .row()
    .text('❌ Отмена', 'editfield:cancel');
}

/**
 * Paginated inline list of movies. `action` distinguishes what happens on
 * tap: "view" (from /movies), "edit" (from /editmovie) or "delete" (from
 * /deletemovie).
 */
export function movieListKeyboard(movies, action, { offset = 0, hasMore = false } = {}) {
  const kb = new InlineKeyboard();
  for (const movie of movies) {
    kb.text(`${movie.title} (${movie.year})`, `movielist:${action}:${movie.id}`).row();
  }
  const navRow = [];
  if (offset > 0) {
    navRow.push({ text: '⬅️ Назад', data: `movielist:${action}:page:${Math.max(0, offset - 20)}` });
  }
  if (hasMore) {
    navRow.push({ text: 'Вперёд ➡️', data: `movielist:${action}:page:${offset + 20}` });
  }
  for (const btn of navRow) {
    kb.text(btn.text, btn.data);
  }
  if (navRow.length) kb.row();
  return kb;
}

export function movieManageKeyboard(movieId) {
  return new InlineKeyboard()
    .text('✏️ Редактировать', `manage:edit:${movieId}`)
    .text('🗑 Удалить', `manage:delete:${movieId}`);
}

export function confirmDeleteKeyboard(movieId) {
  return new InlineKeyboard()
    .text('🗑 Да, удалить', `delete:confirm:${movieId}`)
    .text('❌ Отмена', 'delete:cancel');
}

export function addServiceEmojiSkipNote() {
  // no-op placeholder kept for symmetry / future extension
}
