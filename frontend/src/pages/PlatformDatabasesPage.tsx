import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlatformLayout } from '@/components/PlatformLayout';
import {
  importDatabase,
  getDatabases,
  getDatabaseMetadata,
  mutateDatabase,
  updateDatabaseBackupMode,
  type DatabaseRecord,
} from '@/lib/api';
import { DEFAULT_WORKSPACE_ID } from '@/lib/constants';
import { getActiveApiKey } from '@/lib/apiKey';

export function PlatformDatabasesPage() {
  const [databases, setDatabases] = useState<DatabaseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);
  const [importName, setImportName] = useState('');
  const [importSize, setImportSize] = useState('2.0');
  const [importMode, setImportMode] = useState<'daemon' | 'daemonless'>('daemon');
  const [actionMessage, setActionMessage] = useState('');
  const [mutatingDbId, setMutatingDbId] = useState<string | null>(null);
  const [updatingModeId, setUpdatingModeId] = useState<string | null>(null);

  const refresh = async () => {
    const response = await getDatabases(DEFAULT_WORKSPACE_ID);
    setDatabases(response.data);
  };

  const handleImportDatabase = async () => {
    const apiKey = getActiveApiKey();
    if (!apiKey) {
      setActionMessage('No active API key. Please create one first.');
      window.setTimeout(() => setActionMessage(''), 3000);
      return;
    }
    if (!importName || !importSize) {
      setActionMessage('Please provide name and target size.');
      window.setTimeout(() => setActionMessage(''), 3000);
      return;
    }
    setIsImporting(true);
    try {
      await importDatabase(
        DEFAULT_WORKSPACE_ID,
        { name: importName, target_size_mb: parseFloat(importSize), backup_mode: importMode },
        apiKey,
      );
      await refresh();
      setActionMessage(`Database "${importName}" imported.`);
      setImportName('');
      setImportSize('2.0');
      setImportMode('daemon');
      setShowImportForm(false);
    } catch {
      setActionMessage('Failed to import database. Check API key permissions.');
    } finally {
      setIsImporting(false);
      window.setTimeout(() => setActionMessage(''), 3000);
    }
  };

  const handleMutateDatabase = async (databaseId: string) => {
    const apiKey = getActiveApiKey();
    if (!apiKey) {
      setActionMessage('No active API key. Please create one first.');
      window.setTimeout(() => setActionMessage(''), 3000);
      return;
    }
    setMutatingDbId(databaseId);
    try {
      await mutateDatabase(databaseId, { additional_size_mb: 1.0 }, apiKey);
      await refresh();
      setActionMessage(`Database mutated (+1.0 MB).`);
    } catch {
      setActionMessage('Failed to mutate database. Check API key permissions.');
    } finally {
      setMutatingDbId(null);
      window.setTimeout(() => setActionMessage(''), 3000);
    }
  };

  const handleFetchMetadata = async (databaseId: string) => {
    const apiKey = getActiveApiKey();
    if (!apiKey) {
      setActionMessage('No active API key. Please create one first.');
      window.setTimeout(() => setActionMessage(''), 3000);
      return;
    }
    try {
      await getDatabaseMetadata(databaseId, apiKey);
      await refresh();
      setActionMessage('Metadata refreshed.');
    } catch {
      setActionMessage('Failed to fetch metadata. Check API key permissions.');
    } finally {
      window.setTimeout(() => setActionMessage(''), 3000);
    }
  };

  const handleToggleBackupMode = async (db: DatabaseRecord) => {
    const apiKey = getActiveApiKey();
    if (!apiKey) {
      setActionMessage('No active API key. Please create one first.');
      window.setTimeout(() => setActionMessage(''), 3000);
      return;
    }
    const nextMode = db.backup_mode === 'daemonless' ? 'daemon' : 'daemonless';
    setUpdatingModeId(db.id);
    try {
      await updateDatabaseBackupMode(db.id, nextMode, apiKey);
      await refresh();
      setActionMessage(`Backup mode set to ${nextMode}.`);
    } catch {
      setActionMessage('Failed to update backup mode.');
    } finally {
      setUpdatingModeId(null);
      window.setTimeout(() => setActionMessage(''), 3000);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        await refresh();
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  return (
    <PlatformLayout
      eyebrow="Databases"
      title="Database inventory"
      subtitle={actionMessage || 'Track coverage, health, and storage footprint per environment.'}
      actions={
        showImportForm ? (
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Database name"
              value={importName}
              onChange={(e) => setImportName(e.target.value)}
              className="bg-[#111111] border-[#2a2a2a] text-white w-48"
            />
            <Input
              type="number"
              step="0.1"
              placeholder="Size (MB)"
              value={importSize}
              onChange={(e) => setImportSize(e.target.value)}
              className="bg-[#111111] border-[#2a2a2a] text-white w-24"
            />
            <select
              value={importMode}
              onChange={(e) => setImportMode(e.target.value as 'daemon' | 'daemonless')}
              className="bg-[#111111] border border-[#2a2a2a] text-white rounded-md px-3 py-2 text-sm"
            >
              <option value="daemon">Daemon</option>
              <option value="daemonless">Daemonless (CLI)</option>
            </select>
            <Button
              onClick={handleImportDatabase}
              disabled={isImporting}
              className="bg-[#ff6b35] hover:bg-[#ff6b35]/90 text-white"
            >
              {isImporting ? 'Importing...' : 'Import'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowImportForm(false)}
              className="border-[#2a2a2a] text-white hover:bg-white/5"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            className="bg-[#ff6b35] hover:bg-[#ff6b35]/90 text-white"
            onClick={() => setShowImportForm(true)}
          >
            Import database
          </Button>
        )
      }
    >
      <section className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-display font-semibold">Active databases</h2>
            <p className="text-sm text-[#777]">Dummy data for layout review</p>
          </div>
          <Button variant="outline" className="border-[#2a2a2a] text-white hover:bg-white/5">
            Export list
          </Button>
        </div>

        <div className="space-y-4">
          {databases.map((db) => (
            <div
              key={db.id}
              className="grid lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 border border-[#1f1f1f] rounded-xl p-4 bg-[#0c0c0c]"
            >
              <div>
                <div className="text-sm text-[#a0a0a0]">{db.engine}</div>
                <div className="text-white font-medium">{db.name}</div>
                <div className="text-xs text-[#777] mt-2">{db.environment}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-[#777]">Last sync</div>
                <div className="text-sm text-white mt-2">{db.last_sync}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-[#777]">Schedule</div>
                <div className="text-sm text-white mt-2">{db.schedule}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-[#777]">Status</div>
                <span
                  className={`inline-flex mt-2 text-xs px-2 py-1 rounded-full border ${
                    db.status === 'Healthy'
                      ? 'border-[#4ade80]/40 text-[#4ade80]'
                      : 'border-[#f59e0b]/40 text-[#f59e0b]'
                  }`}
                >
                  {db.status}
                </span>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-[#777]">Storage</div>
                <div className="text-sm text-white mt-2">{db.size_label}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-[#777]">Backup mode</div>
                <div className="text-sm text-white mt-2">
                  {db.backup_mode === 'daemonless' ? 'Daemonless (CLI)' : 'Daemon'}
                </div>
                <Button
                  variant="outline"
                  onClick={() => handleToggleBackupMode(db)}
                  disabled={updatingModeId === db.id}
                  className="mt-2 border-[#2a2a2a] text-white hover:bg-white/5 text-xs"
                >
                  {updatingModeId === db.id
                    ? 'Updating...'
                    : db.backup_mode === 'daemonless'
                      ? 'Switch to daemon'
                      : 'Switch to CLI'}
                </Button>
              </div>
              <div className="flex items-center lg:justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleFetchMetadata(db.id)}
                  className="border-[#2a2a2a] text-white hover:bg-white/5 text-sm"
                >
                  Metadata
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleMutateDatabase(db.id)}
                  disabled={mutatingDbId === db.id}
                  className="border-[#2a2a2a] text-white hover:bg-white/5 text-sm"
                >
                  {mutatingDbId === db.id ? 'Mutating...' : 'Mutate'}
                </Button>
              </div>
            </div>
          ))}
          {!isLoading && databases.length === 0 && (
            <div className="text-sm text-[#777]">No databases found.</div>
          )}
        </div>
      </section>
    </PlatformLayout>
  );
}
