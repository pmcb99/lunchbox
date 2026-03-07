import { useEffect, useState } from 'react';
import { Database as DbIcon, Table, ChevronRight, Loader2 } from 'lucide-react';
import { PlatformLayout } from '@/components/PlatformLayout';
import {
  getDatabases,
  listDatabaseTables,
  getTableData,
  type DatabaseRecord,
  type TableRecord,
  type TableDataResponse,
} from '@/lib/api';
import { DEFAULT_WORKSPACE_ID } from '@/lib/constants';
import { getActiveApiKey } from '@/lib/apiKey';
import { Button } from '@/components/ui/button';

export function DbViewerPage() {
  const [databases, setDatabases] = useState<DatabaseRecord[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<DatabaseRecord | null>(null);
  const [tables, setTables] = useState<TableRecord[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<TableDataResponse | null>(null);
  const [isLoadingDbs, setIsLoadingDbs] = useState(true);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState<string>('');
  const [offset, setOffset] = useState(0);

  const apiKey = getActiveApiKey();

  const pageSize = 50;

  useEffect(() => {
    const loadDatabases = async () => {
      try {
        const response = await getDatabases(DEFAULT_WORKSPACE_ID);
        setDatabases(response.data);
      } catch {
        setError('Failed to load databases');
      } finally {
        setIsLoadingDbs(false);
      }
    };
    loadDatabases();
  }, []);

  const handleSelectDatabase = async (db: DatabaseRecord) => {
    if (!apiKey) {
      setError('No active API key. Please create one first.');
      return;
    }
    if (db.engine !== 'SQLite') {
      setError('Table viewer only supports SQLite databases');
      return;
    }

    setSelectedDatabase(db);
    setSelectedTable(null);
    setTableData(null);
    setOffset(0);
    setIsLoadingTables(true);
    setError('');

    try {
      const response = await listDatabaseTables(db.id, apiKey);
      setTables(response.data.tables);
    } catch {
      setError('Failed to load tables');
    } finally {
      setIsLoadingTables(false);
    }
  };

  const handleSelectTable = async (tableName: string) => {
    if (!selectedDatabase || !apiKey) return;

    setSelectedTable(tableName);
    setOffset(0);
    setIsLoadingData(true);
    setError('');

    try {
      const response = await getTableData(selectedDatabase.id, tableName, apiKey, pageSize, 0);
      setTableData(response.data);
    } catch {
      setError('Failed to load table data');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleNextPage = async () => {
    if (!selectedDatabase || !selectedTable || !apiKey) return;

    const newOffset = offset + pageSize;
    setOffset(newOffset);
    setIsLoadingData(true);
    try {
      const response = await getTableData(
        selectedDatabase.id,
        selectedTable,
        apiKey,
        pageSize,
        newOffset,
      );
      setTableData(response.data);
    } catch {
      setError('Failed to load more data');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handlePrevPage = async () => {
    if (!selectedDatabase || !selectedTable || !apiKey) return;

    const newOffset = Math.max(0, offset - pageSize);
    setOffset(newOffset);
    setIsLoadingData(true);
    try {
      const response = await getTableData(
        selectedDatabase.id,
        selectedTable,
        apiKey,
        pageSize,
        newOffset,
      );
      setTableData(response.data);
    } catch {
      setError('Failed to load more data');
    } finally {
      setIsLoadingData(false);
    }
  };

  const sqliteDatabases = databases.filter((db) => db.engine === 'SQLite');

  return (
    <PlatformLayout
      eyebrow="DB Viewer"
      title="Database explorer"
      subtitle="Browse SQLite databases and their table contents."
      actions={
        selectedTable ? (
          <Button variant="outline" className="border-[#2a2a2a] text-white hover:bg-white/5">
            Export data
          </Button>
        ) : null
      }
    >
      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-[350px_1fr] gap-6">
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-6">
          <h2 className="text-lg font-display font-semibold mb-4">Databases</h2>
          {isLoadingDbs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-[#777] animate-spin" />
            </div>
          ) : sqliteDatabases.length === 0 ? (
            <div className="text-sm text-[#777]">No SQLite databases found.</div>
          ) : (
            <div className="space-y-2">
              {sqliteDatabases.map((db) => (
                <div
                  key={db.id}
                  onClick={() => handleSelectDatabase(db)}
                  className={`cursor-pointer rounded-lg p-3 border transition-all ${
                    selectedDatabase?.id === db.id
                      ? 'bg-[#ff6b35]/10 border-[#ff6b35]/30 text-[#ff6b35]'
                      : 'border-[#1f1f1f] hover:border-[#2a2a2a] hover:bg-white/5 text-[#a0a0a0]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <DbIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">{db.name}</span>
                  </div>
                  <div className="text-xs mt-1 text-[#777]">{db.size_label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-6">
          {selectedDatabase && (
            <>
              {isLoadingTables ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 text-[#777] animate-spin" />
                </div>
              ) : tables.length === 0 ? (
                <div className="text-sm text-[#777]">No tables found in database.</div>
              ) : (
                <>
                  {!selectedTable && (
                    <>
                      <h2 className="text-lg font-display font-semibold mb-4">
                        Tables in {selectedDatabase.name}
                      </h2>
                      <div className="space-y-2">
                        {tables.map((table) => (
                          <div
                            key={table.name}
                            onClick={() => handleSelectTable(table.name)}
                            className="cursor-pointer rounded-lg p-4 border border-[#1f1f1f] hover:border-[#2a2a2a] hover:bg-white/5 transition-all flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <Table className="w-4 h-4 text-[#ff6b35]" />
                              <div>
                                <div className="text-sm font-medium text-white">{table.name}</div>
                                <div className="text-xs text-[#777]">{table.row_count} rows</div>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-[#777]" />
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {selectedTable && tableData && (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h2 className="text-lg font-display font-semibold">{tableData.table_name}</h2>
                          <div className="text-sm text-[#777]">
                            {tableData.total_count} total rows • {tableData.columns.length} columns
                          </div>
                        </div>
                      </div>

                      <div className="overflow-x-auto border border-[#1f1f1f] rounded-xl">
                        <table className="w-full text-sm">
                          <thead className="bg-[#0c0c0c]">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.2em] text-[#777] border-r border-[#1f1f1f]">
                                #
                              </th>
                              {tableData.columns.map((col) => (
                                <th
                                  key={col.name}
                                  className="px-4 py-3 text-left text-xs uppercase tracking-[0.2em] text-[#777] border-r border-[#1f1f1f] whitespace-nowrap"
                                >
                                  {col.name}
                                  <div className="text-[10px] text-[#555] normal-case mt-1">{col.type}</div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {tableData.data.length === 0 ? (
                              <tr>
                                <td colSpan={tableData.columns.length + 1} className="px-4 py-8 text-center text-[#777]">
                                  No data in this table
                                </td>
                              </tr>
                            ) : (
                              tableData.data.map((row) => (
                                <tr key={row.row} className="border-t border-[#1f1f1f] hover:bg-white/5">
                                  <td className="px-4 py-3 text-[#777] border-r border-[#1f1f1f] font-mono text-xs">
                                    {offset + row.row}
                                  </td>
                                  {row.values.map((val, idx) => (
                                    <td key={idx} className="px-4 py-3 text-white border-r border-[#1f1f1f] whitespace-nowrap">
                                      {val === null ? (
                                        <span className="text-[#555] italic">NULL</span>
                                      ) : typeof val === 'object' ? (
                                        JSON.stringify(val)
                                      ) : (
                                        String(val)
                                      )}
                                    </td>
                                  ))}
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {tableData.total_count > pageSize && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#1f1f1f]">
                          <div className="text-sm text-[#777]">
                            Showing {offset + 1}-{Math.min(offset + pageSize, tableData.total_count)} of{' '}
                            {tableData.total_count}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={handlePrevPage}
                              disabled={offset === 0 || isLoadingData}
                              className="border-[#2a2a2a] text-white hover:bg-white/5"
                            >
                              Previous
                            </Button>
                            <Button
                              variant="outline"
                              onClick={handleNextPage}
                              disabled={offset + pageSize >= tableData.total_count || isLoadingData}
                              className="border-[#2a2a2a] text-white hover:bg-white/5"
                            >
                              {isLoadingData ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Next'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}

          {!selectedDatabase && (
            <div className="text-center py-12">
              <DbIcon className="w-12 h-12 text-[#333] mx-auto mb-4" />
              <div className="text-sm text-[#777]">Select a database to view its tables</div>
            </div>
          )}
        </div>
      </div>
    </PlatformLayout>
  );
}
