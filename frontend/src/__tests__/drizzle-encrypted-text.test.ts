/** @vitest-environment node */

import Database from 'better-sqlite3';
import { eq, getTableColumns, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { describe, expect, it } from 'vitest';

import { makeEncryptedText } from '@/lib/encryptedText';

describe('drizzle customType encryptedText', () => {
  it('writes plaintext through toDriver as BLOB and reads through fromDriver', async () => {
    const writes: string[] = [];
    const reads: string[] = [];

    const cryptoBox = {
      encrypt(plain: string): Uint8Array {
        writes.push(plain);
        return new TextEncoder().encode(`enc:${plain}`);
      },
      decrypt(cipher: Uint8Array): string {
        const raw = new TextDecoder().decode(cipher);
        reads.push(raw);

        if (!raw.startsWith('enc:')) {
          throw new Error('invalid ciphertext');
        }

        return raw.slice(4);
      },
    };

    const encryptedText = makeEncryptedText(cryptoBox);

    const notes = sqliteTable('notes', {
      id: integer('id').primaryKey(),
      title: text('title').notNull(),
      body: encryptedText('body').notNull(),
    });

    const sqlite = new Database(':memory:');
    sqlite.exec('CREATE TABLE notes (id INTEGER PRIMARY KEY, title TEXT NOT NULL, body BLOB NOT NULL)');

    const db = drizzle(sqlite);

    await db.insert(notes).values({
      id: 1,
      title: 'My note',
      body: 'secret body text',
    });

    const rows = await db.select().from(notes).where(eq(notes.id, 1));
    const row = rows[0];

    expect(row).toEqual({
      id: 1,
      title: 'My note',
      body: 'secret body text',
    });

    const rawRow = sqlite
      .prepare<{ id: number }, { body: Uint8Array }>('SELECT body FROM notes WHERE id = ?')
      .get(1);

    expect(rawRow.body).toBeInstanceOf(Uint8Array);
    expect(new TextDecoder().decode(rawRow.body)).toBe('enc:secret body text');
    expect(writes).toEqual(['secret body text']);
    expect(reads).toEqual(['enc:secret body text']);

    sqlite.close();
  });

  it('keeps column mapping correct when using getTableColumns plus computed select', async () => {
    const encryptedText = makeEncryptedText({
      encrypt(plain: string): Uint8Array {
        return new TextEncoder().encode(`enc:${plain}`);
      },
      decrypt(cipher: Uint8Array): string {
        const raw = new TextDecoder().decode(cipher);
        return raw.slice(4);
      },
    });

    const notes = sqliteTable('notes', {
      id: integer('id').primaryKey(),
      title: text('title').notNull(),
      body: encryptedText('body').notNull(),
    });

    const sqlite = new Database(':memory:');
    sqlite.exec('CREATE TABLE notes (id INTEGER PRIMARY KEY, title TEXT NOT NULL, body BLOB NOT NULL)');

    const db = drizzle(sqlite);

    await db.insert(notes).values({ id: 1, title: 'alpha', body: 'secret' });

    const result = await db
      .select({
        ...getTableColumns(notes),
        titleLength: sql<number>`length(${notes.title})`,
      })
      .from(notes)
      .where(eq(notes.id, 1));

    expect(result).toEqual([
      {
        id: 1,
        title: 'alpha',
        body: 'secret',
        titleLength: 5,
      },
    ]);

    sqlite.close();
  });
});
