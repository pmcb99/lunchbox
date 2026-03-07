import { useEffect, useMemo, useState } from 'react';
import { HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PlatformLayout } from '@/components/PlatformLayout';
import {
  createKey,
  createRevision,
  getDatabases,
  getKeys,
  getRevisions,
  type DatabaseRecord,
  type KeyRecord,
  type RevisionRecord,
} from '@/lib/api';
import { DEFAULT_WORKSPACE_ID } from '@/lib/constants';
import { getActiveApiKey, setActiveApiKey } from '@/lib/apiKey';

const storageNumber = (label: string) => Number.parseFloat(label.replace(/[^0-9.]/g, ''));

export function PlatformPage() {
  const [databases, setDatabases] = useState<DatabaseRecord[]>([]);
  const [revisions, setRevisions] = useState<RevisionRecord[]>([]);
  const [keys, setKeys] = useState<KeyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');
  const [creatingBackupId, setCreatingBackupId] = useState<string | null>(null);
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [cliDialogOpen, setCliDialogOpen] = useState(false);
  const [cliDatabase, setCliDatabase] = useState<DatabaseRecord | null>(null);
  const [hasCopiedCli, setHasCopiedCli] = useState(false);

  const totalStorage = useMemo(() => {
    const total = databases.reduce((sum, db) => sum + storageNumber(db.size_label), 0);
    return total ? `${total.toFixed(total % 1 === 0 ? 0 : 1)} GB` : '0 GB';
  }, [databases]);

  const primaryKey = keys[0];
  const activeApiKey = getActiveApiKey();

  const refreshData = async () => {
    const [dbs, revs, keyList] = await Promise.all([
      getDatabases(DEFAULT_WORKSPACE_ID),
      getRevisions(DEFAULT_WORKSPACE_ID),
      getKeys(DEFAULT_WORKSPACE_ID),
    ]);
    setDatabases(dbs.data);
    setRevisions(revs.data);
    setKeys(keyList.data);
  };

  useEffect(() => {
    const load = async () => {
      try {
        await refreshData();
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const handleCreateBackup = async (db: DatabaseRecord) => {
    const apiKey = getActiveApiKey();
    if (!apiKey) {
      setActionMessage('No active API key. Please create one first.');
      window.setTimeout(() => setActionMessage(''), 3000);
      return;
    }

    if (db.backup_mode === 'daemonless') {
      setCliDatabase(db);
      setCliDialogOpen(true);
      return;
    }

    setCreatingBackupId(db.id);
    try {
      await createRevision(db.id, apiKey);
      await refreshData();
      setActionMessage(`Backup created for ${db.name}.`);
    } catch {
      setActionMessage('Failed to create backup. Check API key permissions.');
    } finally {
      setCreatingBackupId(null);
      window.setTimeout(() => setActionMessage(''), 3000);
    }
  };

  const cliCommand = cliDatabase
    ? `export LUNCHBOX_API_KEY="${activeApiKey ?? 'your-api-key'}"\n` +
      `lunchbox sync /path/to/${cliDatabase.name}.db --name "${cliDatabase.name}"`
    : '';

  const handleCopyCli = async () => {
    if (!cliCommand) return;
    await navigator.clipboard.writeText(cliCommand);
    setHasCopiedCli(true);
    window.setTimeout(() => setHasCopiedCli(false), 2000);
  };

  const handleGenerateKey = async () => {
    setIsCreatingKey(true);
    try {
      const response = await createKey(DEFAULT_WORKSPACE_ID, 'Generated from overview');
      setActiveApiKey(response.data.value);
      await refreshData();
      setActionMessage('New API key generated.');
    } catch {
      setActionMessage('Failed to generate API key.');
    } finally {
      setIsCreatingKey(false);
      window.setTimeout(() => setActionMessage(''), 3000);
    }
  };

  return (
    <PlatformLayout
      eyebrow="Platform overview"
      title="Backups at a glance"
      subtitle={actionMessage || 'Review backup health and storage footprint.'}
    >
      <section className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-[#777]">Managed storage</div>
              <div className="text-2xl font-display font-semibold mt-2">
                {isLoading ? 'Loading...' : totalStorage}
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#ff6b35]/10 border border-[#ff6b35]/30 flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-[#ff6b35]" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#111111] border border-[#2a2a2a] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-display font-semibold">Databases</h2>
              <p className="text-sm text-[#777]">Active backups and schedules</p>
            </div>
            <Button variant="outline" className="border-[#2a2a2a] text-white hover:bg-white/5">
              View all
            </Button>
          </div>

          <div className="space-y-4">
            {databases.map((db) => (
              <div
                key={db.name}
                className="flex flex-col gap-4 border border-[#1f1f1f] rounded-xl p-4 bg-[#0c0c0c]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-[#a0a0a0]">{db.engine}</div>
                    <div className="text-lg font-medium text-white">{db.name}</div>
                    <div className="text-xs text-[#777] mt-1">
                      {db.backup_mode === 'daemonless' ? 'Daemonless (CLI)' : 'Daemon'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      className="border-[#2a2a2a] text-white hover:bg-white/5 text-xs"
                      onClick={() => handleCreateBackup(db)}
                      disabled={creatingBackupId === db.id}
                    >
                      {creatingBackupId === db.id ? 'Creating...' : 'Create backup'}
                    </Button>
                    <span
                      className={`text-xs px-2 py-1 rounded-full border ${
                        db.status === 'Healthy'
                          ? 'border-[#4ade80]/40 text-[#4ade80]'
                          : 'border-[#f59e0b]/40 text-[#f59e0b]'
                      }`}
                    >
                      {db.status}
                    </span>
                  </div>
                </div>
                <div className="grid sm:grid-cols-4 gap-3 text-sm text-[#a0a0a0]">
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-[#777]">Last sync</div>
                    <div className="text-white">{db.last_sync}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-[#777]">Schedule</div>
                    <div className="text-white">{db.schedule}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-[#777]">Retention</div>
                    <div className="text-white">{db.retention}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-[#777]">Storage</div>
                    <div className="text-white">{db.size_label}</div>
                  </div>
                </div>
                <div className="grid sm:grid-cols-3 gap-3 text-sm text-[#a0a0a0]">
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-[#777]">Revisions</div>
                    <div className="text-white">{db.revisions_label}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-[#777]">Restores</div>
                    <div className="text-white">{db.restores_label}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-[#777]">Encryption</div>
                    <div className="text-white">{db.encryption}</div>
                  </div>
                </div>
              </div>
            ))}
            {!isLoading && databases.length === 0 && (
              <div className="text-sm text-[#777]">No databases found.</div>
            )}
          </div>
        </div>

        <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-6">
          <h2 className="text-lg font-display font-semibold mb-2">Access</h2>
          <p className="text-sm text-[#777] mb-6">API keys and compliance settings</p>

          <div className="space-y-4">
            <div className="bg-[#0c0c0c] border border-[#1f1f1f] rounded-xl p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[#777]">Primary API key</div>
              <div className="text-white font-mono mt-2">
                {primaryKey ? primaryKey.value : 'No keys yet'}
              </div>
              <div className="text-xs text-[#777] mt-2">
                {primaryKey ? `Created ${primaryKey.created_at}` : 'Create your first key'}
              </div>
            </div>

            <div className="bg-[#0c0c0c] border border-[#1f1f1f] rounded-xl p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[#777]">Compliance</div>
              <div className="mt-2 text-sm text-[#a0a0a0]">
                SOC 2 ready workflows and retention safeguards are enabled.
              </div>
            </div>

            <Button
              className="w-full bg-[#ff6b35] hover:bg-[#ff6b35]/90 text-white"
              onClick={handleGenerateKey}
              disabled={isCreatingKey}
            >
              {isCreatingKey ? 'Generating key...' : 'Generate new key'}
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-display font-semibold">Recent revisions</h2>
            <p className="text-sm text-[#777]">Latest immutable snapshots across databases</p>
          </div>
          <Button variant="outline" className="border-[#2a2a2a] text-white hover:bg-white/5">
            View history
          </Button>
        </div>

        <div className="space-y-4">
          {revisions.map((rev) => (
            <div
              key={rev.id}
              className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border border-[#1f1f1f] rounded-xl p-4 bg-[#0c0c0c]"
            >
              <div>
                <div className="text-sm text-[#a0a0a0]">{rev.database}</div>
                <div className="text-white font-medium">{rev.id}</div>
              </div>
              <div className="text-sm text-[#a0a0a0]">{rev.created_at}</div>
              <div className="text-sm text-[#a0a0a0]">{rev.size_label}</div>
              <div className="text-sm text-[#a0a0a0] font-mono">{rev.checksum}</div>
              <Button variant="outline" className="border-[#2a2a2a] text-white hover:bg-white/5">
                Restore
              </Button>
            </div>
          ))}
          {!isLoading && revisions.length === 0 && (
            <div className="text-sm text-[#777]">No revisions yet.</div>
          )}
        </div>
      </section>

      <Dialog open={cliDialogOpen} onOpenChange={setCliDialogOpen}>
        <DialogContent className="bg-[#0b0b0b] border-[#2a2a2a] text-white">
          <DialogHeader>
            <DialogTitle>Run backup via CLI</DialogTitle>
            <DialogDescription className="text-[#777]">
              This database is set to daemonless mode. Run the command below on the VPS hosting the database.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-black border border-[#1f1f1f] rounded-lg p-4">
            <pre className="text-sm text-white whitespace-pre-wrap">{cliCommand}</pre>
          </div>

          <DialogFooter className="flex items-center justify-between">
            <div className="text-xs text-[#777]">Requires the Lunchbox CLI and a valid API key.</div>
            <Button
              variant="outline"
              onClick={handleCopyCli}
              className="border-[#2a2a2a] text-white hover:bg-white/5"
            >
              {hasCopiedCli ? 'Copied' : 'Copy command'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PlatformLayout>
  );
}
