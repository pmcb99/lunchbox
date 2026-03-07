# Platform Documentation

This document describes the purpose and function of each button and interactive element on the platform pages.

---

## Overview Page (`/platform`)

### Actions
- **Create backup** (per database row) - Creates a manual revision for the selected database when in daemon mode. If the database is daemonless, it opens a CLI instruction dialog instead. Requires an active API key.

### Database Cards
- **View all** button - Navigates to the full Databases page (`/platform/databases`) to see all databases with detailed information.

### Access Section
- **Generate new key** - Creates a new API key for the workspace, sets it as the active key, and refreshes the key list. This key can be used for CLI operations or API calls.

### Recent Revisions
- **Restore** button (on each revision) - Placeholder for initiating a restore operation (currently not implemented).

---

## Databases Page (`/platform/databases`)

### Actions
- **Import database** - Opens a form to import a new SQLite database into the workspace and choose a backup mode.
  - Form appears with name and size (MB) inputs
  - Choose **Daemon** or **Daemonless (CLI)** mode
  - Click **Import** to create the database (requires active API key)
  - Click **Cancel** to close the form

- **Export list** button - Placeholder for exporting the database inventory to a file.

### Database Row Actions
Each database card has two action buttons:

- **Metadata** - Fetches and refreshes the database's current metadata (size, checksum) from the backend. Requires an active API key.

- **Mutate** - Increases the database size by 1.0 MB by appending data to the database file. Creates a new revision. Requires an active API key. Shows loading state while processing.

- **Backup mode switch** - Toggles between **Daemon** and **Daemonless (CLI)** modes for the database. Requires an active API key.

---

## DB Viewer Page (`/platform/db-viewer`)

### Database Selection (Left Panel)
- Clicking a database card loads all tables within that database. Only SQLite databases are supported.

### Table Selection (Right Panel)
- Clicking a table row loads the first 50 rows of that table.

### Table Data View
- **Export data** button (top right) - Placeholder for exporting the current table data to CSV or JSON.

### Pagination
- **Previous** button - Loads the previous 50 rows. Disabled when at the start of results.

- **Next** button - Loads the next 50 rows. Shows a loading spinner while fetching. Disabled when at the end of results.

---

## Revisions Page (`/platform/revisions`)

### Actions
- **Database selector** - Chooses which database the Create revision action targets.
- **Create revision** - Creates a manual revision of the selected database when in daemon mode. If the database is daemonless, it opens a CLI instruction dialog instead.

### Revision List Actions
- **Download report** button - Placeholder for downloading a report of all revisions.

### Revision Row Actions
- **Restore** button (on each revision) - Placeholder for initiating a database restore to a previous state.

---

## Schedules Page (`/platform/schedules`)

### Actions
- **New schedule** button - Placeholder for creating a new automated backup schedule.

### Schedule List Actions
- **Pause all** button - Placeholder for pausing all scheduled backup jobs.

### Schedule Row Actions
- **Manage** button (on each schedule) - Placeholder for editing or deleting a schedule.

### Schedule Health Panel
- **Update policy** button - Placeholder for updating key rotation or retention policies.

- **Review incidents** button - Placeholder for viewing missed or failed scheduled runs.

---

## API Keys Page (`/platform/keys`)

### Actions
- **Generate API key** - Generates a new API key for the workspace, sets it as the active key, and refreshes the key list. The key is displayed and can be used for API authentication.

### Key List Actions
- **Export keys** button - Placeholder for exporting all keys to a file.

### Key Row Actions
Each key card has two action buttons (shown when applicable):

- **Set active** - Marks this key as the currently active API key. The active key is used for database operations, imports, and other API calls requiring authentication. Only appears for Active keys that aren't currently active.

- **Revoke** - Deactivates and revokes the API key. If the revoked key was the active key, the active key is cleared. Requires using the key's own value for authentication. Only available for Active keys.

### Key Policy Panel
- **Update policy** button - Placeholder for changing key rotation cadence or access policies.

---

## Sign Out

All platform pages have a **Sign out** button (in both the sidebar footer and header). Clicking it clears the authentication token and email from storage, then redirects to the login page (`/platform/login`).

---

## Notes

- **Active API Key**: Most operations (import, mutate, create revision) require an active API key to be set. Create a key first in Overview or API Keys page.
- **SQLite Only**: The DB Viewer only supports SQLite databases imported through the platform. PostgreSQL databases are excluded.
- **Placeholder Buttons**: Many buttons marked as "placeholder" are not yet implemented and will show no action when clicked.
