const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function requestJson<T>(path: string, options?: RequestInit & { apiKey?: string }): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> | undefined) ?? {},
  };

  if (options?.apiKey) {
    headers['X-API-Key'] = options.apiKey;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export interface ApiEnvelope<T> {
  data: T;
  meta: { requestId: string };
}

export interface DatabaseRecord {
  id: string;
  name: string;
  engine: string;
  environment: string;
  schedule: string;
  retention: string;
  status: string;
  size_label: string;
  revisions_label: string;
  restores_label: string;
  encryption: string;
  last_sync: string;
  backup_mode?: 'daemon' | 'daemonless';
}

export interface RevisionRecord {
  id: string;
  database_id: string;
  database: string;
  created_at: string;
  size_label: string;
  checksum: string;
  type: string;
  status?: 'Verified' | 'Pending' | 'Error';
}

export interface ScheduleRecord {
  id: string;
  name: string;
  cadence: string;
  next_run: string;
  status: string;
  database_id: string;
  database: string;
}

export interface KeyRecord {
  id: string;
  name: string;
  value: string;
  created_at: string;
  last_used: string;
  status: string;
}

export function getDatabases(workspaceId: string) {
  return requestJson<ApiEnvelope<DatabaseRecord[]>>(`/api/v1/workspaces/${workspaceId}/databases`);
}

export function getRevisions(workspaceId: string) {
  return requestJson<ApiEnvelope<RevisionRecord[]>>(`/api/v1/workspaces/${workspaceId}/revisions`);
}

export function getSchedules(workspaceId: string) {
  return requestJson<ApiEnvelope<ScheduleRecord[]>>(`/api/v1/workspaces/${workspaceId}/schedules`);
}

export function getKeys(workspaceId: string) {
  return requestJson<ApiEnvelope<KeyRecord[]>>(`/api/v1/workspaces/${workspaceId}/keys`);
}

export function createKey(workspaceId: string, name?: string) {
  return requestJson<ApiEnvelope<KeyRecord>>(`/api/v1/workspaces/${workspaceId}/keys`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function createRevision(databaseId: string, apiKey: string) {
  return requestJson<ApiEnvelope<RevisionRecord>>(`/api/v1/databases/${databaseId}/revisions`, {
    method: 'POST',
    apiKey,
    body: JSON.stringify({ type: 'Manual' }),
  });
}

export interface SignupRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  id: string;
  email: string;
  token: string;
}

export function signup(payload: SignupRequest) {
  return requestJson<ApiEnvelope<AuthResponse>>('/api/v1/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function login(payload: LoginRequest) {
  return requestJson<ApiEnvelope<AuthResponse>>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface ImportDatabaseRequest {
  name: string;
  target_size_mb: number;
  backup_mode: 'daemon' | 'daemonless';
}

export interface ImportDatabaseResponse {
  id: string;
  workspace_id: string;
  name: string;
  engine: string;
  environment: string;
  size_label: string;
  size_bytes: number;
  checksum: string;
  backup_mode: 'daemon' | 'daemonless';
}

export function importDatabase(workspaceId: string, payload: ImportDatabaseRequest, apiKey: string) {
  return requestJson<ApiEnvelope<ImportDatabaseResponse>>(`/api/v1/workspaces/${workspaceId}/databases/import`, {
    method: 'POST',
    apiKey,
    body: JSON.stringify(payload),
  });
}

export interface DatabaseMetadata {
  database_id: string;
  size_bytes: number;
  size_label: string;
  checksum: string;
  last_sync: string;
}

export function getDatabaseMetadata(databaseId: string, apiKey: string) {
  return requestJson<ApiEnvelope<DatabaseMetadata>>(`/api/v1/databases/${databaseId}/metadata`, {
    apiKey,
  });
}

export interface MutateDatabaseRequest {
  additional_size_mb: number;
}

export function mutateDatabase(databaseId: string, payload: MutateDatabaseRequest, apiKey: string) {
  return requestJson<ApiEnvelope<DatabaseMetadata>>(`/api/v1/databases/${databaseId}/mutate`, {
    method: 'POST',
    apiKey,
    body: JSON.stringify(payload),
  });
}

export function updateDatabaseBackupMode(
  databaseId: string,
  backup_mode: 'daemon' | 'daemonless',
  apiKey: string,
) {
  return requestJson<ApiEnvelope<{ id: string; backup_mode: 'daemon' | 'daemonless' }>>(
    `/api/v1/databases/${databaseId}`,
    {
      method: 'PATCH',
      apiKey,
      body: JSON.stringify({ backup_mode }),
    },
  );
}

export function deleteKey(workspaceId: string, keyId: string, apiKey: string) {
  return requestJson<ApiEnvelope<{ id: string; status: string }>>(`/api/v1/workspaces/${workspaceId}/keys/${keyId}`, {
    method: 'DELETE',
    apiKey,
  });
}

export interface TableRecord {
  name: string;
  row_count: number;
}

export interface TablesResponse {
  tables: TableRecord[];
  database_id: string;
}

export function listDatabaseTables(databaseId: string, apiKey: string) {
  return requestJson<ApiEnvelope<TablesResponse>>(`/api/v1/databases/${databaseId}/tables`, {
    apiKey,
  });
}

export interface ColumnRecord {
  name: string;
  type: string;
}

export interface TableDataResponse {
  table_name: string;
  columns: ColumnRecord[];
  data: { row: number; values: any[] }[];
  total_count: number;
  limit: number;
  offset: number;
}

export function getTableData(
  databaseId: string,
  tableName: string,
  apiKey: string,
  limit: number = 100,
  offset: number = 0,
) {
  return requestJson<ApiEnvelope<TableDataResponse>>(
    `/api/v1/databases/${databaseId}/tables/${encodeURIComponent(tableName)}?limit=${limit}&offset=${offset}`,
    { apiKey },
  );
}
