# PRD — Lunchbox v1

## TDD-first build plan for SQLite backup, restore, and continuous sync

## 1. Overview

Lunchbox is a Go CLI plus Go server for backing up self-hosted databases.

The first user-facing command is:

```bash
lunchbox sync ~/mydb.sqlite
```

That should:

* authenticate with an API key
* register the database with the server
* create a consistent initial snapshot
* continuously sync later changes
* allow restore to a local file
* encrypt payloads client-side before upload
* use modern transport security with hybrid post-quantum support where available in Go TLS

This PRD is deliberately written as a **test-driven delivery plan**.

The goal is not just to build features. The goal is to make it safe to move from one step to the next with high confidence.

---

# 2. Product goal

Make SQLite backup and restore feel simple enough that a developer can trust:

```bash
lunchbox sync ~/mydb.sqlite
```

without having to manually wire together Litestream, object storage, retention policies, and restore procedures.

But the more important internal goal is:

**every major capability must be unlocked by passing a clear test gate first.**

---

# 3. Delivery philosophy

This project should use the strongest parts of TDD, not the dogmatic parts.

## 3.1 What “TDD” means here

For Lunchbox, TDD means:

* write the smallest failing test for the next piece of behaviour
* implement the smallest amount of code to make it pass
* refactor only after green
* do not start the next capability until the current behaviour is protected by tests
* use the correct test shape for the risk:

  * unit tests for logic
  * contract tests for API boundaries
  * integration tests for backup/restore correctness
  * soak and failure tests for long-running sync

## 3.2 What not to do

Do not pretend that fragile distributed/database behaviour can be proven by unit tests alone.

For Lunchbox, correctness requires:

* deterministic fixtures
* end-to-end restore tests
* failure injection
* stateful integration tests
* long-running interruption tests

## 3.3 Core engineering rule

A backup feature is not considered “done” when upload works.

A backup feature is only done when:

1. upload works
2. restore works
3. restore is validated automatically by tests

---

# 4. Product scope

## 4.1 In scope for v1

* Go CLI: `lunchbox`
* Go server: `lunchboxd`
* API key login
* SQLite database registration
* SQLite validation
* WAL-mode requirement
* one-shot backup
* continuous sync
* restore
* local resumable sync state
* server metadata in Postgres
* encrypted blob storage in S3-compatible storage
* client-side payload encryption
* transport over Go TLS with hybrid PQ support where negotiated
* retention groundwork
* observability
* full test harness

## 4.2 Out of scope for v1

* HA replicas
* full dashboard UI
* billing
* advanced org/team model
* customer-managed KMS
* Postgres implementation
* live query serving
* conflict resolution across clients

---

# 5. Success criteria

Lunchbox v1 succeeds when a developer can:

1. log in with an API key
2. back up a SQLite DB
3. continuously sync a SQLite DB
4. restore the DB correctly
5. trust the result because backup/restore correctness is covered by deterministic automated tests

---

# 6. Test strategy

## 6.1 The test pyramid for Lunchbox

### Unit tests

Use for:

* config parsing
* metadata validation
* chunk lineage logic
* manifest generation
* retry/backoff rules
* encryption round trips

### Contract tests

Use for:

* CLI ↔ server API payloads
* server ↔ object storage adapter
* manifest schema compatibility

### Integration tests

Use for:

* login against test server
* DB registration
* snapshot backup
* restore
* continuous sync after real writes
* interrupted uploads
* restart resume

### Deterministic restore oracle tests

Use for:

* generating a known SQLite DB state
* applying a scripted series of writes
* restoring from Lunchbox
* comparing restored DB content to expected logical state

### Soak and failure tests

Use for:

* repeated process restarts
* server outages
* object storage failures
* WAL growth under sustained writes
* retry correctness over time

## 6.2 Mandatory test gates

No milestone is complete until its gate passes.

Every gate must include:

* green local test run
* green CI run
* no flaky failures over repeated runs
* restore validation where relevant

---

# 7. Development rules

## 7.1 Red-green-refactor

Every new behaviour should follow:

1. write failing test
2. make test pass minimally
3. refactor behind green tests

## 7.2 No untested plumbing leaps

Do not build three layers of abstraction ahead of need.

For example:

* do not design the full engine system before SQLite works
* do not build a general replication framework before snapshot backup passes
* do not add optimisation paths before restore correctness is locked down

## 7.3 Characterisation before refactor

If any code becomes messy but is already working, first wrap it in tests, then refactor.

## 7.4 Golden fixtures

Use fixed test fixtures for:

* SQLite files
* manifests
* encrypted blob metadata
* restore plans

## 7.5 Deterministic clocks and IDs

Tests must use injectable:

* clocks
* UUID/ID generators
* temp paths
* backoff timers

Otherwise the suite will become brittle.

---

# 8. Architecture summary

## 8.1 Binaries

* `lunchbox` — CLI
* `lunchboxd` — server

## 8.2 High-level responsibilities

### CLI

Owns:

* SQLite inspection
* snapshot creation
* incremental sync
* local state
* payload encryption
* restore execution

### Server

Owns:

* auth
* catalog
* retention metadata
* object storage orchestration
* restore manifest planning
* audit events

---

# 9. TDD-first delivery plan

This plan is intentionally written as **test gates**, not just feature phases.

---

## Gate 0 — Build the test harness first

### Goal

Create the environment that makes future TDD possible.

### Why first

If the harness comes later, the team will cut corners and ship unprovable logic.

### Build

* local dev stack for Postgres + object storage + server
* test helpers for temp dirs, clocks, IDs
* SQLite fixture factory
* fake object store for unit/contract tests
* container-backed integration test environment
* test assertion helpers for DB content comparison
* CI workflow

### Write tests first

* test fixture factory creates valid SQLite DBs
* test helper can spin up isolated server stack
* test object store adapter can store and retrieve blobs
* test cleanup leaves no state behind

### Done when

* any integration test can start a fully isolated stack
* fixture helpers are reusable
* CI can run unit + integration suites

### Hard gate

Do not start product code until this exists.

---

## Gate 1 — Login and auth contract

### Goal

Prove the CLI can authenticate and persist credentials safely.

### Behaviour

```bash
lunchbox login --api-key lb_live_xxx
```

### Write tests first

#### Unit

* credentials file path resolution
* secure file permission enforcement
* API key validation result parsing

#### Contract

* CLI request matches server auth schema
* server success and error payloads stay stable

#### Integration

* valid API key logs in successfully
* invalid API key is rejected
* credentials persist locally
* repeated login updates existing state cleanly

### Code to build

* auth verify endpoint
* CLI login command
* local credential storage
* device ID creation/loading

### Done when

* login works end to end
* invalid login gives actionable error
* tests prove credentials persist and reload correctly

---

## Gate 2 — Database registration

### Goal

Prove a SQLite DB can be identified and registered without backup yet.

### Behaviour

```bash
lunchbox list
lunchbox sync ~/mydb.sqlite
```

up to registration only

### Write tests first

#### Unit

* path canonicalisation
* SQLite header validation
* WAL mode check result parsing

#### Contract

* DB registration request/response schema

#### Integration

* valid SQLite DB registers successfully
* non-SQLite file is rejected
* SQLite DB not in WAL mode is rejected with clear message
* `list` returns the registered DB

### Code to build

* SQLite inspect package
* register DB endpoint
* CLI `list`
* basic DB metadata persistence

### Done when

* registration is deterministic
* invalid files fail early
* WAL requirement is enforced clearly

---

## Gate 3 — Snapshot-only backup

### Goal

Prove Lunchbox can safely produce one valid backup artifact.

### Behaviour

```bash
lunchbox backup ~/mydb.sqlite
```

### Write tests first

#### Unit

* snapshot metadata generation
* compression before encryption
* encryption/decryption round trip
* content hash generation

#### Contract

* snapshot upload headers/body contract
* metadata persistence contract

#### Integration

* one-shot backup uploads snapshot successfully
* uploaded snapshot metadata is stored
* downloaded snapshot decrypts correctly

#### Restore oracle

* create fixture DB
* take snapshot backup
* restore snapshot
* compare restored DB contents to original logical contents

### Code to build

* consistent snapshot creator
* compression pipeline
* client-side encryption
* snapshot upload endpoint
* snapshot catalog persistence
* simple restore from latest snapshot

### Done when

* snapshot backup works
* restored DB opens correctly
* snapshot restore oracle passes

### Hard gate

No continuous sync work begins until snapshot restore is proven.

---

## Gate 4 — Snapshot restore as a first-class feature

### Goal

Make restore real before incrementals exist.

### Behaviour

```bash
lunchbox restore db_123 --output ~/restored.sqlite
```

### Write tests first

#### Unit

* output path protection
* restore manifest parsing
* decrypt-and-write flow

#### Integration

* restore latest snapshot succeeds
* existing output path is rejected unless `--force`
* restored DB opens successfully in SQLite

#### Restore oracle

* compare schema
* compare table contents
* compare important indexes/triggers where relevant

### Code to build

* restore endpoint
* restore manifest format for snapshot-only case
* CLI restore command
* overwrite protection

### Done when

* restore is boring and reliable
* tests prove snapshot-only recovery

---

## Gate 5 — Local sync state and resumability skeleton

### Goal

Before WAL syncing, prove the client can persist and reload sync state.

### Why now

Resume logic must not be bolted on after the fact.

### Write tests first

#### Unit

* state file read/write
* generation ID persistence
* last uploaded sequence persistence
* corrupt state detection

#### Integration

* create state, stop CLI, restart, state reloads correctly
* corrupt state fails safely

### Code to build

* local state store
* device-scoped DB sync record
* state versioning

### Done when

* client can resume metadata cleanly before chunk streaming exists

---

## Gate 6 — Incremental chunk model without real WAL watching yet

### Goal

Prove ordered incremental upload and replay logic separately from file watching complexity.

### Why this matters

Watching WAL and chunk lineage are different risks. Test them independently.

### Write tests first

#### Unit

* chunk sequence ordering
* previous-hash validation
* manifest accumulation
* replay ordering

#### Contract

* chunk upload schema
* sequence acknowledgement schema

#### Integration

* synthetic chunk stream uploads in order
* interrupted stream resumes from last accepted sequence
* duplicate sequence rejected cleanly
* wrong previous hash rejected

#### Restore oracle

* create synthetic base snapshot + chunk sequence
* restore from manifest
* resulting DB equals expected state

### Code to build

* chunk metadata model
* chunk upload endpoint
* server lineage validation
* restore manifest planner for snapshot + chunks
* replay engine

### Done when

* snapshot-plus-chunk restore works using a synthetic source
* lineage checks are enforced

### Hard gate

Do not connect file watching until replay correctness is proven.

---

## Gate 7 — Real SQLite incremental capture

### Goal

Replace synthetic increments with real SQLite-derived incremental capture.

### Write tests first

#### Unit

* WAL parsing helpers
* frame boundary parsing
* chunk batching rules

#### Integration

* start sync on real SQLite DB
* perform scripted writes
* client emits real increments
* server accepts them in order

#### Restore oracle

* write deterministic sequence of inserts/updates/deletes
* restore latest state
* restored DB matches expected final state

#### Failure tests

* restart client mid-write burst
* resume sync
* restore remains correct

### Code to build

* WAL watcher or polling mechanism
* incremental capture logic
* chunk batching from real DB changes
* sync session creation

### Done when

* real writes to a real SQLite DB can be restored correctly after sync

---

## Gate 8 — Full `lunchbox sync`

### Goal

Join snapshot backup, incremental sync, local state, and restore into the actual user workflow.

### Behaviour

```bash
lunchbox sync ~/mydb.sqlite
```

### Write tests first

#### Integration

* fresh sync performs registration + snapshot + incrementals
* second run resumes existing sync
* network interruption retries successfully
* server restart does not break eventual recovery

#### End-to-end restore oracle

* start sync
* perform real workload
* stop everything
* restore from Lunchbox
* compare logical DB state to oracle

#### CLI acceptance

* status output reflects progress
* errors are actionable
* chunk retry/backoff does not lose lineage

### Code to build

* full sync command
* sync session API
* status command
* retry/backoff logic
* progress/health reporting

### Done when

* the main user journey works end to end
* restore oracle proves correctness after live sync

---

## Gate 9 — Failure injection and hardening

### Goal

Prove the system behaves correctly when things go wrong.

### Write tests first

#### Failure scenarios

* object store unavailable
* server unavailable
* partial upload accepted then connection drops
* corrupt chunk metadata
* tampered payload
* stale sequence
* state file corruption
* restore output already exists

#### Soak tests

* long-running sync with repeated restarts
* periodic writes over hours
* repeated retry cycles
* no silent corruption

### Code to build

* better retry logic
* idempotency handling
* defensive validation
* richer logging and metrics

### Done when

* failure tests are green
* no silent corruption paths remain
* restore either succeeds or fails loudly and safely

---

## Gate 10 — Retention and compaction

### Goal

Add operational controls only after correctness exists.

### Write tests first

#### Unit

* retention policy evaluation
* safe deletion candidate selection

#### Integration

* expired snapshots/chunks are handled according to policy
* no required restore path is deleted
* compacted snapshot can replace older paths correctly

#### Restore oracle

* after compaction and retention, latest restore still works

### Code to build

* retention engine
* object cleanup planner
* compaction hooks

### Done when

* storage cleanup cannot silently destroy valid restore paths

---

## Gate 11 — Engine abstraction for Postgres day 2

### Goal

Refactor toward a pluggable engine model only after SQLite is proven.

### Write tests first

#### Characterisation

* snapshot backup behaviour remains unchanged
* sync behaviour remains unchanged
* restore behaviour remains unchanged

#### Unit

* engine interface compliance tests

### Code to build

* engine interface
* SQLite engine adapter
* Postgres design scaffolding only

### Done when

* refactor introduces no behaviour regressions
* SQLite full suite still passes unchanged

---

# 10. Command surface

## Required commands

```bash
lunchbox login --api-key <key>
lunchbox sync <sqlite-path>
lunchbox backup <sqlite-path>
lunchbox restore <db-id> --output <path>
lunchbox status [<sqlite-path>]
lunchbox list
lunchbox unlink <sqlite-path>
```

## Optional later

```bash
lunchbox restore <db-id> --at <timestamp> --output <path>
lunchbox sync <sqlite-path> --name <name>
```

---

# 11. Functional requirements

## 11.1 CLI

### FR-1

CLI must support API key login.

### FR-2

CLI must validate SQLite files before backup/sync.

### FR-3

CLI must require WAL mode for continuous sync.

### FR-4

CLI must create a consistent initial snapshot.

### FR-5

CLI must upload encrypted snapshot payloads.

### FR-6

CLI must continuously upload ordered incremental chunks.

### FR-7

CLI must persist resumable sync state locally.

### FR-8

CLI must support restore to a specified path.

### FR-9

CLI must refuse overwrite unless `--force`.

### FR-10

CLI must expose sync status.

## 11.2 Server

### FR-11

Server must verify API keys.

### FR-12

Server must catalogue registered databases.

### FR-13

Server must accept snapshot uploads.

### FR-14

Server must accept chunk uploads.

### FR-15

Server must validate chunk lineage.

### FR-16

Server must generate restore manifests.

### FR-17

Server must expose restore points.

### FR-18

Server must store encrypted blobs in object storage.

### FR-19

Server must persist audit events.

### FR-20

Server must support retention metadata.

---

# 12. Security requirements

## 12.1 Transport

All traffic must use TLS 1.3 via Go standard library TLS. Use runtime defaults compatible with hybrid post-quantum key exchange where negotiated.

## 12.2 Payload encryption

All snapshot and chunk payloads must be:

1. compressed
2. encrypted client-side
3. uploaded as ciphertext

## 12.3 Integrity

Every snapshot/chunk must have:

* content hash
* key ID
* nonce metadata
* generation ID
* sequence number where applicable
* previous hash where applicable

## 12.4 Local secret handling

CLI must store:

* credentials
* device identity
* encryption material
  with restrictive permissions.

---

# 13. Data model

## Server tables

* users
* api_keys
* devices
* databases
* sync_sessions
* snapshots
* chunks
* manifests
* retention_policies
* audit_events

## Local client state

```json
{
  "db_id": "db_123",
  "path": "/Users/paul/mydb.sqlite",
  "generation": "gen_abc",
  "last_uploaded_seq": 10293,
  "last_snapshot_id": "snap_789",
  "encryption_key_id": "key_1",
  "device_id": "dev_123"
}
```

---

# 14. Package layout

## CLI

```text
/cmd/lunchbox
/internal/cli
/internal/config
/internal/auth
/internal/sqlite
/internal/replication
/internal/restore
/internal/crypto
/internal/chunking
/internal/state
/internal/httpclient
/internal/backoff
```

## Server

```text
/cmd/lunchboxd
/internal/api
/internal/auth
/internal/db
/internal/storage
/internal/catalog
/internal/ingest
/internal/restore
/internal/retention
/internal/crypto
/internal/audit
```

---

# 15. Acceptance suite

This suite should become the main confidence engine for the project.

## 15.1 Canonical acceptance scenario

1. create test SQLite DB
2. insert deterministic records
3. run `lunchbox backup`
4. restore DB
5. compare restored logical state to original

Then:

1. start `lunchbox sync`
2. perform deterministic write workload
3. interrupt process mid-stream
4. restart
5. continue writes
6. restore latest state
7. compare restored DB to oracle

If this scenario ever fails, the build is not releasable.

---

# 16. CI pipeline requirements

Every PR should run:

1. fast unit tests
2. contract tests
3. integration tests
4. restore oracle tests

Nightly or pre-release should run:

1. soak tests
2. fault injection tests
3. compaction/retention tests

No code should merge if restore oracle tests fail.

---

# 17. Risks and TDD-specific mitigations

## Risk

Team writes too much infrastructure before proving user behaviour.

### Mitigation

Every milestone starts with a failing acceptance or integration test.

## Risk

Unit tests pass but restore is broken.

### Mitigation

Backup features are gated by restore oracle tests.

## Risk

Resume logic becomes flaky.

### Mitigation

Persisted state is introduced before real continuous sync.

## Risk

WAL capture complexity hides bugs.

### Mitigation

Test chunk lineage and replay separately before connecting real WAL watching.

## Risk

Refactors break working behaviour.

### Mitigation

Use characterisation tests before refactors such as engine abstraction.

---

# 18. Definition of done

Lunchbox v1 is done when:

1. `login` works
2. `backup` works
3. `restore` works
4. `sync` works
5. restart/resume works
6. chunk lineage validation works
7. restore oracle tests pass consistently
8. interruption/failure tests pass
9. retention does not break restore paths
10. SQLite functionality is protected enough to safely start Postgres day 2

---

# 19. Immediate implementation order

## Sprint A

Gate 0 and Gate 1
Harness, CI, auth, login

## Sprint B

Gate 2 and Gate 3
SQLite validation, registration, snapshot backup

## Sprint C

Gate 4 and Gate 5
Restore, local state persistence

## Sprint D

Gate 6 and Gate 7
Synthetic chunk pipeline, then real SQLite incremental capture

## Sprint E

Gate 8 and Gate 9
Full sync, retries, resume, hardening

## Sprint F

Gate 10 and Gate 11
Retention, compaction, engine abstraction

---

# 20. Engineering summary

Build Lunchbox in the order that reduces uncertainty fastest:

1. prove auth
2. prove snapshot backup
3. prove restore
4. prove resumability
5. prove chunk replay
6. prove real incremental capture
7. prove live sync under failure
8. only then optimise or generalise

That is the right TDD shape for a product where correctness matters more than speed of initial coding.

Next, I can turn this into a **ticket-by-ticket backlog** with each ticket written as:

* failing test to add
* minimal code to write
* acceptance condition
