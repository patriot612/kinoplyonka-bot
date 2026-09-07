/**
 * All database access lives in this one file so the rest of the code never
 * has to know it's talking to D1/SQLite. If the storage engine ever needs to
 * change, this is the only file that has to be rewritten.
 */

// ---------------------------------------------------------------------------
// Movies
// ---------------------------------------------------------------------------

/** @typedef {{emoji: string, name: string, url: string}} Service */

function rowToMovie(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    country: row.country,
    year: row.year,
    rating: row.rating,
    description: row.description,
    posterFileId: row.poster_file_id,
    code: row.code,
    services: JSON.parse(row.services || '[]'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getMovieById(db, id) {
  const row = await db
    .prepare('SELECT * FROM movies WHERE id = ?')
    .bind(id)
    .first();
  return rowToMovie(row);
}

export async function getMovieByCode(db, code) {
  const row = await db
    .prepare('SELECT * FROM movies WHERE code = ? COLLATE NOCASE')
    .bind(code.trim())
    .first();
  return rowToMovie(row);
}

/**
 * Finds the best-matching movie for a free-text title search.
 * Tries an exact (case-insensitive) match first, then falls back to a
 * "contains" match, returning the most recently added movie if several
 * titles contain the search text.
 */
export async function findMovieByTitle(db, title) {
  const clean = title.trim();
  if (!clean) return null;

  const exact = await db
    .prepare('SELECT * FROM movies WHERE title = ? COLLATE NOCASE LIMIT 1')
    .bind(clean)
    .first();
  if (exact) return rowToMovie(exact);

  const partial = await db
    .prepare(
      'SELECT * FROM movies WHERE title LIKE ? COLLATE NOCASE ORDER BY created_at DESC LIMIT 1'
    )
    .bind(`%${clean}%`)
    .first();
  return rowToMovie(partial);
}

export async function getRandomMovie(db) {
  const row = await db
    .prepare('SELECT * FROM movies ORDER BY RANDOM() LIMIT 1')
    .first();
  return rowToMovie(row);
}

export async function countMovies(db) {
  const row = await db.prepare('SELECT COUNT(*) AS c FROM movies').first();
  return row?.c ?? 0;
}

export async function listMovies(db, { limit = 20, offset = 0 } = {}) {
  const { results } = await db
    .prepare(
      'SELECT * FROM movies ORDER BY created_at DESC LIMIT ? OFFSET ?'
    )
    .bind(limit, offset)
    .all();
  return results.map(rowToMovie);
}

export async function codeExists(db, code, excludeId = null) {
  const row = excludeId
    ? await db
        .prepare(
          'SELECT id FROM movies WHERE code = ? COLLATE NOCASE AND id != ?'
        )
        .bind(code.trim(), excludeId)
        .first()
    : await db
        .prepare('SELECT id FROM movies WHERE code = ? COLLATE NOCASE')
        .bind(code.trim())
        .first();
  return Boolean(row);
}

/**
 * @param {object} movie
 * @param {string} movie.title
 * @param {string} movie.country
 * @param {string} movie.year
 * @param {string} movie.rating
 * @param {string} movie.description
 * @param {string} movie.posterFileId
 * @param {string} movie.code
 * @param {Service[]} movie.services
 */
export async function createMovie(db, movie) {
  const now = Date.now();
  const result = await db
    .prepare(
      `INSERT INTO movies
        (title, country, year, rating, description, poster_file_id, code, services, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      movie.title,
      movie.country,
      movie.year,
      movie.rating,
      movie.description,
      movie.posterFileId,
      movie.code,
      JSON.stringify(movie.services || []),
      now,
      now
    )
    .run();
  return result.meta.last_row_id;
}

export async function updateMovie(db, id, movie) {
  const now = Date.now();
  await db
    .prepare(
      `UPDATE movies SET
        title = ?, country = ?, year = ?, rating = ?, description = ?,
        poster_file_id = ?, code = ?, services = ?, updated_at = ?
       WHERE id = ?`
    )
    .bind(
      movie.title,
      movie.country,
      movie.year,
      movie.rating,
      movie.description,
      movie.posterFileId,
      movie.code,
      JSON.stringify(movie.services || []),
      now,
      id
    )
    .run();
}

export async function deleteMovie(db, id) {
  await db.prepare('DELETE FROM movies WHERE id = ?').bind(id).run();
}

// ---------------------------------------------------------------------------
// Users (for /stats)
// ---------------------------------------------------------------------------

export async function touchUser(db, telegramId) {
  await db
    .prepare(
      'INSERT INTO users (telegram_id, first_seen) VALUES (?, ?) ON CONFLICT(telegram_id) DO NOTHING'
    )
    .bind(telegramId, Date.now())
    .run();
}

export async function countUsers(db) {
  const row = await db.prepare('SELECT COUNT(*) AS c FROM users').first();
  return row?.c ?? 0;
}

// ---------------------------------------------------------------------------
// Sessions (multi-step conversation state)
// ---------------------------------------------------------------------------

export async function getSession(db, telegramId) {
  const row = await db
    .prepare('SELECT state FROM sessions WHERE telegram_id = ?')
    .bind(telegramId)
    .first();
  if (!row) return {};
  try {
    return JSON.parse(row.state);
  } catch {
    return {};
  }
}

export async function setSession(db, telegramId, state) {
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO sessions (telegram_id, state, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(telegram_id) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at`
    )
    .bind(telegramId, JSON.stringify(state), now)
    .run();
}

export async function clearSession(db, telegramId) {
  await setSession(db, telegramId, {});
}

// ---------------------------------------------------------------------------
// Message context (for delete/restore behaviour of cards & services)
// ---------------------------------------------------------------------------

export async function getMessageContext(db, telegramId) {
  const row = await db
    .prepare('SELECT * FROM message_context WHERE telegram_id = ?')
    .bind(telegramId)
    .first();
  if (!row) return {};
  return {
    lastMovieCardMessageId: row.last_movie_card_message_id,
    lastMovieId: row.last_movie_id,
    lastServicesMessageId: row.last_services_message_id,
  };
}

export async function setMessageContext(db, telegramId, patch) {
  const current = await getMessageContext(db, telegramId);
  const merged = { ...current, ...patch };
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO message_context
        (telegram_id, last_movie_card_message_id, last_movie_id, last_services_message_id, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(telegram_id) DO UPDATE SET
        last_movie_card_message_id = excluded.last_movie_card_message_id,
        last_movie_id = excluded.last_movie_id,
        last_services_message_id = excluded.last_services_message_id,
        updated_at = excluded.updated_at`
    )
    .bind(
      telegramId,
      merged.lastMovieCardMessageId ?? null,
      merged.lastMovieId ?? null,
      merged.lastServicesMessageId ?? null,
      now
    )
    .run();
}
