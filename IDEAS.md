Yes — this is the cleaner design.

Use **Drizzle `customType`** so the field itself owns the transformation:

* app code sees `string`
* SQLite stores `BLOB`
* Drizzle runs `toDriver()` on insert/update
* Drizzle runs `fromDriver()` on select

That is exactly what `customType` is for in Drizzle. ([orm.drizzle.team][1])

---

# 1. What we are building

You want this developer experience:

```ts
body: encryptedText("body").notNull()
```

and then:

```ts
await db.insert(notes).values({
  id: 1,
  title: "My note",
  body: "secret body text",
})
```

with this behaviour:

1. Drizzle sees `body` is an `encryptedText` column.
2. On write, it calls `toDriver("secret body text")`.
3. Your crypto layer encrypts it.
4. SQLite receives ciphertext bytes in a `BLOB` column.
5. On read, Drizzle calls `fromDriver(blob)`.
6. Your crypto layer decrypts it.
7. TypeScript gets plaintext again.

That mapping model is the documented purpose of `customType`, and TinyBase’s persistence model is designed to sit behind a persister/custom persister rather than inside the store itself. ([orm.drizzle.team][1])

---

# 2. The important architectural decision

This version is **Drizzle-native field encryption**, not “metadata plus manual encrypt before save”.

That means:

* you do **not** call `encrypt()` manually in app code
* you do **not** need a separate metadata registry for basic field encryption
* you do **not** need `userId` in the row to decide encryption
* the column definition itself is the signal

So the schema becomes the contract:

```ts
body: encryptedText("body")
```

That is much nicer.

---

# 3. The one big constraint you need to know first

`customType` conversion is effectively **synchronous** at the column boundary. Drizzle documents `toDriver`/`fromDriver` as plain conversion hooks, and there is an open feature request for async custom types, which means you should assume async crypto/key fetch is **not** supported there today. ([orm.drizzle.team][1])

So for this design to work well, your crypto layer must be:

* synchronous at call time
* already holding the active key in memory
* not depending on a network round trip or async KMS call during row mapping

That is totally fine for a Lunchbox client that already has a session key loaded.

---

# 4. Step-by-step: the moving parts

## Step 4.1 — define a tiny crypto interface

This is the only thing Drizzle needs to know about.

```ts
type CryptoBox = {
  encrypt(plain: string): Uint8Array
  decrypt(cipher: Uint8Array): string
}
```

What this means:

* `encrypt` takes plaintext string from TypeScript
* returns raw bytes for SQLite `BLOB`
* `decrypt` takes raw bytes from SQLite
* returns plaintext string back to TypeScript

Keep this interface generic.
Do **not** hardwire TinyBase, JWTs, or SQLite into it.

---

## Step 4.2 — make `encryptedText`

This is the reusable Drizzle column factory.

```ts
import { customType } from "drizzle-orm/sqlite-core"

export function makeEncryptedText(cryptoBox: CryptoBox) {
  return customType<{
    data: string
    driverData: Uint8Array
  }>({
    dataType() {
      return "blob"
    },
    toDriver(value: string): Uint8Array {
      return cryptoBox.encrypt(value)
    },
    fromDriver(value: Uint8Array): string {
      return cryptoBox.decrypt(value)
    },
  })
}
```

What each piece does:

* `data: string`
  This is the type your app sees.

* `driverData: Uint8Array`
  This is what the SQLite driver stores and reads.

* `dataType() => "blob"`
  The physical SQLite column type is `BLOB`.

* `toDriver()`
  Runs on insert/update.

* `fromDriver()`
  Runs on select.

This is the key trick.

---

## Step 4.3 — bind it to your current session crypto

```ts
const encryptedText = makeEncryptedText(cryptoBox)
```

That gives you a Drizzle column builder you can use like any other column type.

---

# 5. The schema

Now the schema becomes very clean:

```ts
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core"

export const notes = sqliteTable("notes", {
  id: integer("id").primaryKey(),
  title: text("title").notNull(),
  body: encryptedText("body").notNull(),
  preview: text("preview"),
})
```

What this means:

* `title` is normal plaintext SQLite `TEXT`
* `body` is encrypted `BLOB`
* `preview` stays plaintext if you want querying/search/list previews

This is a very good pattern for notes:

* encrypted full body
* plaintext preview or derived metadata if needed

---

# 6. Full minimal example

```ts
import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import { customType, sqliteTable, integer, text } from "drizzle-orm/sqlite-core"
import { eq } from "drizzle-orm"

type CryptoBox = {
  encrypt(plain: string): Uint8Array
  decrypt(cipher: Uint8Array): string
}

const cryptoBox: CryptoBox = {
  encrypt(plain) {
    return new TextEncoder().encode(`enc:${plain}`)
  },
  decrypt(cipher) {
    const raw = new TextDecoder().decode(cipher)
    if (!raw.startsWith("enc:")) throw new Error("Invalid ciphertext")
    return raw.slice(4)
  },
}

function makeEncryptedText(cryptoBox: CryptoBox) {
  return customType<{
    data: string
    driverData: Uint8Array
  }>({
    dataType() {
      return "blob"
    },
    toDriver(value) {
      return cryptoBox.encrypt(value)
    },
    fromDriver(value) {
      return cryptoBox.decrypt(value)
    },
  })
}

const encryptedText = makeEncryptedText(cryptoBox)

export const notes = sqliteTable("notes", {
  id: integer("id").primaryKey(),
  title: text("title").notNull(),
  body: encryptedText("body").notNull(),
  preview: text("preview"),
})

const sqlite = new Database(":memory:")
sqlite.exec(`
  create table notes (
    id integer primary key,
    title text not null,
    body blob not null,
    preview text
  )
`)

const db = drizzle(sqlite)

await db.insert(notes).values({
  id: 1,
  title: "My note",
  body: "secret body text",
  preview: "secret body text".slice(0, 20),
})

const raw = sqlite.prepare("select id, title, hex(body) as body_hex, preview from notes").get()
console.log(raw)

const note = await db.select().from(notes).where(eq(notes.id, 1)).get()
console.log(note)
```

What happens here:

* app inserts plaintext
* raw SQLite sees bytes
* Drizzle reads plaintext back again

---

# 7. How this fits TinyBase

TinyBase persistence is supposed to happen through a `Persister`, and TinyBase also supports custom persisters for fully customised storage flows. ([tinybase.org][2])

So TinyBase should **not** know about encryption.

Instead:

```text
TinyBase store
    ↓
Lunchbox bridge / persister
    ↓
Drizzle repo
    ↓
encryptedText custom columns
    ↓
SQLite
```

That means TinyBase works with normal plaintext objects in memory, while Drizzle handles encryption at the DB edge.

---

# 8. Step-by-step TinyBase flow

## Step 8.1 — TinyBase holds normal app data

```ts
{
  notes: {
    "1": {
      title: "My note",
      body: "secret body text",
      preview: "secret body text"
    }
  }
}
```

## Step 8.2 — bridge flushes to DB

Your bridge reads TinyBase rows and writes them through Drizzle:

```ts
await db.insert(notes).values({
  id: 1,
  title: "My note",
  body: "secret body text",
  preview: "secret body text",
})
```

## Step 8.3 — Drizzle encrypts automatically

Because `body` is `encryptedText("body")`, Drizzle calls `toDriver()` and stores ciphertext bytes.

## Step 8.4 — loading back

When you query via Drizzle:

```ts
const rows = await db.select().from(notes)
```

Drizzle calls `fromDriver()` on `body`, so your TinyBase bridge receives plaintext again.

---

# 9. The TinyBase bridge API I would use

TinyBase’s database persistence docs show that tabular persistence maps DB rows to TinyBase row IDs and columns, and it warns that TinyBase is in-memory so you should be selective about what you load. ([tinybase.org][3])

For your use case, I would keep the bridge explicit:

```ts
type LunchboxTinyBaseBridge = {
  loadNotes(): Promise<void>
  flushNotes(): Promise<void>
  startAutoSave(): void
  stopAutoSave(): void
}
```

Minimal implementation shape:

```ts
import { createStore } from "tinybase"

function createNotesBridge(store: any, db: ReturnType<typeof drizzle>) {
  return {
    async loadNotes() {
      const rows = await db.select().from(notes)
      const table: Record<string, Record<string, any>> = {}

      for (const row of rows) {
        table[String(row.id)] = {
          title: row.title,
          body: row.body,
          preview: row.preview,
        }
      }

      store.setTable("notes", table)
    },

    async flushNotes() {
      const table = store.getTable("notes")
      for (const [id, row] of Object.entries(table)) {
        await db.insert(notes).values({
          id: Number(id),
          title: row.title as string,
          body: row.body as string,
          preview: row.preview as string | null,
        }).onConflictDoUpdate({
          target: notes.id,
          set: {
            title: row.title as string,
            body: row.body as string,
            preview: row.preview as string | null,
          },
        })
      }
    },
  }
}
```

What this does:

* TinyBase only sees plaintext
* Drizzle encrypts/decrypts transparently
* Lunchbox stays mostly glue code

---

# 10. Where auth/JWT fits

You said encryption should depend on auth context rather than a posted `userId`.

That fits well here.

The right place for that is **inside `cryptoBox` construction**, not inside the column value.

Example idea:

```ts
function createSessionCryptoBox(session: { userId: string; key: Uint8Array }): CryptoBox {
  return {
    encrypt(plain) {
      return encryptWithKey(session.key, plain)
    },
    decrypt(cipher) {
      return decryptWithKey(session.key, cipher)
    },
  }
}
```

Then at app start:

```ts
const cryptoBox = createSessionCryptoBox(session)
const encryptedText = makeEncryptedText(cryptoBox)
```

So:

* JWT/session authenticates the user
* app derives or fetches the right key once
* Drizzle custom type uses that key synchronously
* ciphertext does **not** need embedded `userId`
* `body` does **not** need a `kid`

That matches what you want.

---

# 11. What the Lunchbox client should own

Lunchbox client should do 3 things:

## A. build the session crypto

From auth/session/JWT context

## B. build the Drizzle encrypted column factory

`const encryptedText = makeEncryptedText(cryptoBox)`

## C. expose TinyBase-friendly repositories/bridges

So app code does not deal with raw SQL

Example:

```ts
const lunchbox = createLunchboxClient({
  session,
  sqlite,
})

await lunchbox.notes.save({
  id: 1,
  title: "My note",
  body: "secret body text",
  preview: "secret body text".slice(0, 120),
})
```

Internally:

* repository writes through Drizzle
* `body` encrypts automatically

---

# 12. What to keep plaintext

Do not encrypt everything.

Good plaintext fields:

* `id`
* timestamps
* sort keys
* owner foreign keys
* preview if you want fast list views
* flags like archived/starred

Good encrypted fields:

* `body`
* private JSON blobs
* secrets/tokens
* note attachments metadata if sensitive

That gives you usable local app behaviour without over-encrypting.

---

# 13. Best file layout

```ts
src/
  crypto/
    cryptoBox.ts
    encryptedText.ts
  db/
    schema.ts
    client.ts
    notesRepo.ts
  tinybase/
    notesBridge.ts
```

## `crypto/encryptedText.ts`

```ts
import { customType } from "drizzle-orm/sqlite-core"

export type CryptoBox = {
  encrypt(plain: string): Uint8Array
  decrypt(cipher: Uint8Array): string
}

export function makeEncryptedText(cryptoBox: CryptoBox) {
  return customType<{ data: string; driverData: Uint8Array }>({
    dataType() {
      return "blob"
    },
    toDriver(value) {
      return cryptoBox.encrypt(value)
    },
    fromDriver(value) {
      return cryptoBox.decrypt(value)
    },
  })
}
```

## `db/schema.ts`

```ts
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core"
import { makeEncryptedText } from "../crypto/encryptedText"
import { cryptoBox } from "../crypto/cryptoBox"

const encryptedText = makeEncryptedText(cryptoBox)

export const notes = sqliteTable("notes", {
  id: integer("id").primaryKey(),
  title: text("title").notNull(),
  body: encryptedText("body").notNull(),
  preview: text("preview"),
})
```

---

# 14. One caveat you should actively test

There is a recent Drizzle issue where `customType` columns with `fromDriver()` can interact badly with some advanced `select({ ...getTableColumns(table), computed: ... })` patterns, causing computed expressions after the custom type to map incorrectly. The issue is marked fixed-in-beta / will be fixed soon, but it is recent enough that you should keep tests around advanced select composition. ([GitHub][4])

Practical guidance:

* basic inserts/updates/selects are the main intended path
* keep tests for:

  * plain `select().from(table)`
  * joins
  * `getTableColumns()`
  * computed SQL fields after encrypted columns

---

# 15. Why this is better than the previous metadata-only design

Because this version gives you true automatic behaviour.

With metadata-only:

* app must remember to transform values before save
* app must remember to decrypt after load
* easier to miss a code path

With `customType`:

* the field definition owns the behaviour
* Drizzle enforces the conversion consistently
* schema is self-describing
* TinyBase bridge stays much thinner

That is the big win.

---

# 16. SQLite-first, Postgres-later

This scales cleanly.

For SQLite now:

```ts
import { customType } from "drizzle-orm/sqlite-core"
```

Later for Postgres, the same pattern becomes:

```ts
import { customType } from "drizzle-orm/pg-core"
```

The idea is unchanged:

* app sees `string`
* driver stores binary/text ciphertext
* `toDriver` / `fromDriver` do the mapping

Drizzle explicitly exposes `customType` per dialect. ([orm.drizzle.team][1])

So your core abstraction should be:

```ts
type EncryptedColumnFactory = ReturnType<typeof makeEncryptedText>
```

not “SQLite-only encryption logic”.

---

# 17. Recommended v1 shape

Use exactly this pattern:

```ts
const encryptedText = makeEncryptedText(sessionCryptoBox)

export const notes = sqliteTable("notes", {
  id: integer("id").primaryKey(),
  title: text("title").notNull(),
  body: encryptedText("body").notNull(),
  preview: text("preview"),
})
```

Then make TinyBase flush/load through Drizzle repositories.

That gives you:

* Drizzle-native encryption
* no Drizzle monkey-patching
* no external metadata registry needed for simple encrypted fields
* no `kid` or `userId` in the ciphertext body
* SQLite now
* clean path to Postgres later

If you want, the next step is I turn this into a concrete small TypeScript package layout for Lunchbox:

* `makeEncryptedText`
* `createSessionCryptoBox`
* `createNotesRepo`
* `createTinyBaseBridge`

[1]: https://orm.drizzle.team/docs/custom-types "Drizzle ORM - Custom types"
[2]: https://tinybase.org/api/persisters/interfaces/persister/persister/ "Persister | TinyBase"
[3]: https://tinybase.org/guides/persistence/database-persistence/ "Database Persistence | TinyBase"
[4]: https://github.com/drizzle-team/drizzle-orm/issues/5358 "[BUG]: getTableColumns() + computed SQL expression in .select() returns wrong value when schema includes customType columns · Issue #5358 · drizzle-team/drizzle-orm · GitHub"
