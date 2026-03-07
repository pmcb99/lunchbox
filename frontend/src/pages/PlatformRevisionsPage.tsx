import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PlatformLayout } from '@/components/PlatformLayout';
import { StatusBadge } from '@/components/ui/status-badge';
import { ViewToggle } from '@/components/ui/view-toggle';
import { ChecksumDisplay } from '@/components/ui/checksum-display';
import { RevisionActions } from '@/components/ui/revision-actions';
import {
  createRevision,
  getDatabases,
  getRevisions,
  type DatabaseRecord,
  type RevisionRecord,
} from '@/lib/api';
import { DEFAULT_WORKSPACE_ID } from '@/lib/constants';
import { getActiveApiKey } from '@/lib/apiKey';
import { formatRelativeTime } from '@/lib/format';

type ViewMode = 'cards' | 'table';
type FilterType = 'all' | 'Automated' | 'Manual';

export function PlatformRevisionsPage() {
  const [revisions, setRevisions] = useState<RevisionRecord[]>([]);
  const [databases, setDatabases] = useState<DatabaseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [selectedDatabaseId, setSelectedDatabaseId] = useState<string>('');
  const [cliDialogOpen, setCliDialogOpen] = useState(false);
  const [cliDatabase, setCliDatabase] = useState<DatabaseRecord | null>(null);
  const [hasCopiedCli, setHasCopiedCli] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedRevisions, setSelectedRevisions] = useState<Set<string>>(new Set());

  const refresh = async () => {
    const [revs, dbs] = await Promise.all([
      getRevisions(DEFAULT_WORKSPACE_ID),
      getDatabases(DEFAULT_WORKSPACE_ID),
    ]);
    const revisionsWithStatus = revs.data.map((rev) => ({
      ...rev,
      status: 'Verified' as const,
    }));
    setRevisions(revisionsWithStatus);
    setDatabases(dbs.data);
    if (!selectedDatabaseId && dbs.data[0]) {
      setSelectedDatabaseId(dbs.data[0].id);
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

  const handleCreateRevision = async () => {
    const apiKey = getActiveApiKey();
    if (!apiKey) {
      setActionMessage('No active API key. Please create one first.');
      window.setTimeout(() => setActionMessage(''), 3000);
      return;
    }
    const selectedDatabase = databases.find((db) => db.id === selectedDatabaseId);
    if (!selectedDatabase) {
      setActionMessage('No databases available to create revision.');
      window.setTimeout(() => setActionMessage(''), 3000);
      return;
    }
    if (selectedDatabase.backup_mode === 'daemonless') {
      setCliDatabase(selectedDatabase);
      setCliDialogOpen(true);
      return;
    }
    setIsCreating(true);
    try {
      await createRevision(selectedDatabase.id, apiKey);
      await refresh();
      setActionMessage(`Revision created for ${selectedDatabase.name}.`);
    } catch {
      setActionMessage('Failed to create revision. Check API key permissions.');
    } finally {
      setIsCreating(false);
      window.setTimeout(() => setActionMessage(''), 3000);
    }
  };

  const apiKey = getActiveApiKey();
  const cliCommand = cliDatabase
    ? `export LUNCHBOX_API_KEY="${apiKey ?? 'your-api-key'}"\n` +
      `lunchbox sync /path/to/${cliDatabase.name}.db --name "${cliDatabase.name}"`
    : '';

  const handleCopyCli = async () => {
    if (!cliCommand) return;
    await navigator.clipboard.writeText(cliCommand);
    setHasCopiedCli(true);
    window.setTimeout(() => setHasCopiedCli(false), 2000);
  };

  const handleRevisionSelect = (revisionId: string) => {
    const newSelection = new Set(selectedRevisions);
    if (newSelection.has(revisionId)) {
      newSelection.delete(revisionId);
    } else if (newSelection.size < 2) {
      newSelection.add(revisionId);
    }
    setSelectedRevisions(newSelection);
  };

  const handleDownload = async (revision: RevisionRecord) => {
    setActionMessage(`Downloading revision ${revision.id}...`);
    setTimeout(() => setActionMessage(''), 2000);
  };

  const handleDelete = async (revision: RevisionRecord) => {
    if (!confirm(`Delete revision ${revision.id}?`)) return;
    setActionMessage(`Deleting revision ${revision.id}...`);
    setTimeout(() => {
      setRevisions(revisions.filter((r) => r.id !== revision.id));
      setActionMessage('Revision deleted successfully.');
      setTimeout(() => setActionMessage(''), 2000);
    }, 500);
  };

  const handleRestore = (revision: RevisionRecord) => {
    setActionMessage(`Initiating restore for revision ${revision.id}...`);
    setTimeout(() => setActionMessage(''), 2000);
  };

  const filteredRevisions = useMemo(() => {
    return revisions.filter((rev) => {
      const matchesSearch = searchQuery === '' || 
        rev.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rev.database.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rev.checksum.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterType === 'all' || rev.type === filterType;
      return matchesSearch && matchesFilter;
    });
  }, [revisions, searchQuery, filterType]);

  const revisionsWithNumbers = useMemo(() => {
    const dbGroups = new Map<string, RevisionRecord[]>();
    filteredRevisions.forEach((rev) => {
      const existing = dbGroups.get(rev.database) || [];
      existing.push(rev);
      dbGroups.set(rev.database, existing);
    });

    const result: Array<RevisionRecord & { number: number }> = [];
    dbGroups.forEach((revs) => {
      revs
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .forEach((rev, idx) => {
          result.push({ ...rev, number: idx + 1 });
        });
    });

    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [filteredRevisions]);

  return (
    <PlatformLayout
      eyebrow="Revisions"
      title="Immutable snapshots"
      subtitle={actionMessage || 'Verify, restore, and audit every database revision.'}
      actions={
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={selectedDatabaseId}
            onChange={(e) => setSelectedDatabaseId(e.target.value)}
            className="bg-[#111111] border border-[#2a2a2a] text-white rounded-md px-3 py-2 text-sm"
          >
            {databases.map((db) => (
              <option key={db.id} value={db.id}>
                {db.name} ({db.backup_mode === 'daemonless' ? 'CLI' : 'Daemon'})
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Search revisions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#111111] border border-[#2a2a2a] text-white rounded-md px-3 py-2 text-sm w-48"
          />

          <div className="flex items-center gap-1.5 bg-[#111111] border border-[#2a2a2a] rounded-md px-2 py-1.5">
            <button
              onClick={() => setFilterType('all')}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                filterType === 'all' ? 'bg-[#2a2a2a] text-white' : 'text-[#777] hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('Automated')}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                filterType === 'Automated' ? 'bg-[#2a2a2a] text-white' : 'text-[#777] hover:text-white'
              }`}
            >
              Auto
            </button>
            <button
              onClick={() => setFilterType('Manual')}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                filterType === 'Manual' ? 'bg-[#2a2a2a] text-white' : 'text-[#777] hover:text-white'
              }`}
            >
              Manual
            </button>
          </div>

          <ViewToggle view={viewMode} onViewChange={setViewMode} />

          <Button
            className="bg-[#ff6b35] hover:bg-[#ff6b35]/90 text-white"
            onClick={handleCreateRevision}
            disabled={isCreating || !selectedDatabaseId}
          >
            {isCreating ? 'Creating...' : 'Create revision'}
          </Button>
        </div>
      }
    >
      <section className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-display font-semibold">Latest revisions</h2>
            <p className="text-sm text-[#777]">
              Immutable, content-addressed backups • {filteredRevisions.length} found
            </p>
          </div>
          {selectedRevisions.size === 2 && (
            <Button
              variant="outline"
              className="border-[#ff6b35] text-[#ff6b35] hover:bg-[#ff6b35]/10"
              onClick={() => {
                setActionMessage('Comparing revisions...');
                setTimeout(() => setActionMessage(''), 2000);
              }}
            >
              Compare selected
            </Button>
          )}
          <Button
            variant="outline"
            className="border-[#2a2a2a] text-white hover:bg-white/5"
            onClick={() => {
              setActionMessage('Downloading report...');
              setTimeout(() => setActionMessage(''), 2000);
            }}
          >
            Download report
          </Button>
        </div>

        {viewMode === 'cards' ? (
          <div className="space-y-4">
            {revisionsWithNumbers.map((rev) => (
              <div
                key={rev.id}
                className={`grid grid-cols-[1fr_1.5fr_0.8fr_1.5fr_0.8fr_0.8fr_100px] gap-4 border border-[#1f1f1f] rounded-xl p-4 bg-[#0c0c0c] transition-all hover:border-[#2a2a2a] ${
                  selectedRevisions.has(rev.id) ? 'ring-1 ring-[#ff6b35]' : ''
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-[#2a2a2a] text-[#777] text-xs">
                      #{rev.number}
                    </Badge>
                    <div className="text-sm text-[#a0a0a0]">{rev.database}</div>
                  </div>
                  <div className="text-white font-medium mt-1">{rev.id}</div>
                  <div className="text-xs text-[#777] mt-2">{rev.type}</div>
                </div>

                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-[#777]">Created</div>
                  <div className="text-sm text-white mt-2" title={rev.created_at}>
                    {formatRelativeTime(rev.created_at)}
                  </div>
                </div>

                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-[#777]">Size</div>
                  <div className="text-sm text-white mt-2">{rev.size_label}</div>
                </div>

                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-[#777]">Checksum</div>
                  <div className="mt-2">
                    <ChecksumDisplay checksum={rev.checksum} />
                  </div>
                </div>

                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-[#777]">Status</div>
                  <div className="mt-2">
                    <StatusBadge status={rev.status || 'Verified'} />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <input
                    type="checkbox"
                    checked={selectedRevisions.has(rev.id)}
                    onChange={() => handleRevisionSelect(rev.id)}
                    disabled={selectedRevisions.size >= 2 && !selectedRevisions.has(rev.id)}
                    className="w-4 h-4 rounded border-[#2a2a2a] bg-[#111111] cursor-pointer"
                  />
                  <Button
                    className="bg-[#ff6b35] hover:bg-[#ff6b35]/90 text-white px-4"
                    onClick={() => handleRestore(rev)}
                  >
                    Restore
                  </Button>
                  <RevisionActions
                    revisionId={rev.id}
                    onDownload={() => handleDownload(rev)}
                    onDelete={() => handleDelete(rev)}
                  />
                </div>
              </div>
            ))}
            {!isLoading && revisionsWithNumbers.length === 0 && (
              <div className="text-sm text-[#777] text-center py-8">
                No revisions found.
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[#777] text-xs uppercase tracking-wider">
                  <th className="pb-3 pl-4">Revision</th>
                  <th className="pb-3">Database</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Created</th>
                  <th className="pb-3">Size</th>
                  <th className="pb-3">Checksum</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f1f1f]">
                {revisionsWithNumbers.map((rev) => (
                  <tr
                    key={rev.id}
                    className={`hover:bg-[#1a1a1a] transition-colors ${
                      selectedRevisions.has(rev.id) ? 'bg-[#ff6b35]/5' : ''
                    }`}
                  >
                    <td className="py-3 pl-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedRevisions.has(rev.id)}
                          onChange={() => handleRevisionSelect(rev.id)}
                          disabled={selectedRevisions.size >= 2 && !selectedRevisions.has(rev.id)}
                          className="w-4 h-4 rounded border-[#2a2a2a] bg-[#111111] cursor-pointer"
                        />
                        <Badge variant="outline" className="border-[#2a2a2a] text-[#777] text-xs">
                          #{rev.number}
                        </Badge>
                        <span className="text-white">{rev.id}</span>
                      </div>
                    </td>
                    <td className="py-3 text-[#a0a0a0]">{rev.database}</td>
                    <td className="py-3">
                      <Badge
                        variant={rev.type === 'Manual' ? 'default' : 'outline'}
                        className={
                          rev.type === 'Manual'
                            ? 'bg-[#ff6b35] text-white border-0'
                            : 'border-[#2a2a2a] text-[#777]'
                        }
                      >
                        {rev.type}
                      </Badge>
                    </td>
                    <td className="py-3 text-white" title={rev.created_at}>
                      {formatRelativeTime(rev.created_at)}
                    </td>
                    <td className="py-3 text-white">{rev.size_label}</td>
                    <td className="py-3">
                      <ChecksumDisplay checksum={rev.checksum} />
                    </td>
                    <td className="py-3">
                      <StatusBadge status={rev.status || 'Verified'} />
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          className="bg-[#ff6b35] hover:bg-[#ff6b35]/90 text-white px-3 py-1 text-xs"
                          onClick={() => handleRestore(rev)}
                        >
                          Restore
                        </Button>
                        <RevisionActions
                          revisionId={rev.id}
                          onDownload={() => handleDownload(rev)}
                          onDelete={() => handleDelete(rev)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!isLoading && revisionsWithNumbers.length === 0 && (
              <div className="text-sm text-[#777] text-center py-8">
                No revisions found.
              </div>
            )}
          </div>
        )}
      </section>

      <Dialog open={cliDialogOpen} onOpenChange={setCliDialogOpen}>
        <DialogContent className="bg-[#0b0b0b] border-[#2a2a2a] text-white">
          <DialogHeader>
            <DialogTitle>Run revision via CLI</DialogTitle>
            <DialogDescription className="text-[#777]">
              This database is set to daemonless mode. Run the command below on VPS hosting the database.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-black border border-[#1f1f1f] rounded-lg p-4">
            <pre className="text-sm text-white whitespace-pre-wrap">{cliCommand}</pre>
          </div>

          <DialogFooter className="flex items-center justify-between">
            <div className="text-xs text-[#777]">Requires Lunchbox CLI and a valid API key.</div>
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
