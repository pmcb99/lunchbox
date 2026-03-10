package app

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"lunchbox/backend-go/internal/config"

	_ "modernc.org/sqlite"
)

func TestHealthEnvelope(t *testing.T) {
	server := newTestServer(t)
	defer server.Close()

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)
	server.router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}

	var body map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &body); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}

	meta := body["meta"].(map[string]any)
	if meta["requestId"] == "" {
		t.Fatalf("expected requestId in envelope")
	}
}

func TestMetadataRequiresAPIKey(t *testing.T) {
	server := newTestServer(t)
	defer server.Close()

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/databases/db_missing/metadata", nil)
	server.router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for missing database, got %d", recorder.Code)
	}

	apiKey := createAPIKey(t, server)
	databaseID := syncSQLiteDatabase(t, server, apiKey)

	recorder = httptest.NewRecorder()
	request = httptest.NewRequest(http.MethodGet, "/api/v1/databases/"+databaseID+"/metadata", nil)
	server.router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d body=%s", recorder.Code, recorder.Body.String())
	}
}

func TestSyncRevisionDownloadAndTableViewer(t *testing.T) {
	server := newTestServer(t)
	defer server.Close()

	apiKey := createAPIKey(t, server)
	databaseID := syncSQLiteDatabase(t, server, apiKey)

	revisionsRecorder := httptest.NewRecorder()
	revisionsRequest := httptest.NewRequest(http.MethodGet, "/api/v1/databases/"+databaseID+"/revisions", nil)
	server.router.ServeHTTP(revisionsRecorder, revisionsRequest)
	if revisionsRecorder.Code != http.StatusOK {
		t.Fatalf("expected revisions 200, got %d body=%s", revisionsRecorder.Code, revisionsRecorder.Body.String())
	}

	var revisionsBody struct {
		Data []map[string]any `json:"data"`
	}
	if err := json.Unmarshal(revisionsRecorder.Body.Bytes(), &revisionsBody); err != nil {
		t.Fatalf("decode revisions: %v", err)
	}
	if len(revisionsBody.Data) == 0 {
		t.Fatalf("expected at least one revision")
	}

	revisionID := revisionsBody.Data[0]["id"].(string)

	downloadRecorder := httptest.NewRecorder()
	downloadRequest := httptest.NewRequest(http.MethodGet, "/api/v1/databases/"+databaseID+"/revisions/"+revisionID+"/download", nil)
	downloadRequest.Header.Set("X-API-Key", apiKey)
	server.router.ServeHTTP(downloadRecorder, downloadRequest)
	if downloadRecorder.Code != http.StatusOK {
		t.Fatalf("expected download 200, got %d body=%s", downloadRecorder.Code, downloadRecorder.Body.String())
	}
	if len(downloadRecorder.Body.Bytes()) == 0 {
		t.Fatalf("expected download bytes")
	}

	tablesRecorder := httptest.NewRecorder()
	tablesRequest := httptest.NewRequest(http.MethodGet, "/api/v1/databases/"+databaseID+"/tables", nil)
	tablesRequest.Header.Set("X-API-Key", apiKey)
	server.router.ServeHTTP(tablesRecorder, tablesRequest)
	if tablesRecorder.Code != http.StatusOK {
		t.Fatalf("expected tables 200, got %d body=%s", tablesRecorder.Code, tablesRecorder.Body.String())
	}

	tableDataRecorder := httptest.NewRecorder()
	tableDataRequest := httptest.NewRequest(http.MethodGet, "/api/v1/databases/"+databaseID+"/tables/items?limit=999", nil)
	tableDataRequest.Header.Set("X-API-Key", apiKey)
	server.router.ServeHTTP(tableDataRecorder, tableDataRequest)
	if tableDataRecorder.Code != http.StatusOK {
		t.Fatalf("expected table data 200, got %d body=%s", tableDataRecorder.Code, tableDataRecorder.Body.String())
	}

	var tableDataBody struct {
		Data struct {
			Limit int `json:"limit"`
			Data  []struct {
				Values []any `json:"values"`
			} `json:"data"`
		} `json:"data"`
	}
	if err := json.Unmarshal(tableDataRecorder.Body.Bytes(), &tableDataBody); err != nil {
		t.Fatalf("decode table data: %v", err)
	}
	if tableDataBody.Data.Limit != 500 {
		t.Fatalf("expected capped limit 500, got %d", tableDataBody.Data.Limit)
	}
	if len(tableDataBody.Data.Data) != 2 {
		t.Fatalf("expected 2 rows, got %d", len(tableDataBody.Data.Data))
	}
}

func newTestServer(t *testing.T) *Server {
	t.Helper()

	root := t.TempDir()
	dataDir := filepath.Join(root, "data")
	cfg := config.Config{
		Addr:     "127.0.0.1:0",
		DataDir:  dataDir,
		DBPath:   filepath.Join(dataDir, "lunchbox.db"),
		SkipSeed: true,
		AllowedOrigins: []string{
			"http://localhost:5173",
			"http://127.0.0.1:5173",
		},
	}

	server, err := NewServer(cfg)
	if err != nil {
		t.Fatalf("new server: %v", err)
	}
	return server
}

func createAPIKey(t *testing.T, server *Server) string {
	t.Helper()

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/v1/workspaces/ws_001/keys", bytes.NewBufferString(`{"name":"test key"}`))
	request.Header.Set("Content-Type", "application/json")
	server.router.ServeHTTP(recorder, request)
	if recorder.Code != http.StatusOK {
		t.Fatalf("create key status=%d body=%s", recorder.Code, recorder.Body.String())
	}

	var body struct {
		Data struct {
			Value string `json:"value"`
		} `json:"data"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode key: %v", err)
	}
	return body.Data.Value
}

func syncSQLiteDatabase(t *testing.T, server *Server, apiKey string) string {
	t.Helper()

	dbPath := filepath.Join(t.TempDir(), "source.db")
	sqliteDB, err := sql.Open("sqlite", dbPath)
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer sqliteDB.Close()

	if _, err := sqliteDB.Exec("CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT)"); err != nil {
		t.Fatalf("create table: %v", err)
	}
	if _, err := sqliteDB.Exec("INSERT INTO items (name) VALUES ('first'), ('second')"); err != nil {
		t.Fatalf("insert rows: %v", err)
	}

	payload, err := os.ReadFile(dbPath)
	if err != nil {
		t.Fatalf("read sqlite payload: %v", err)
	}

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/v1/workspaces/ws_001/databases/sync", bytes.NewReader(payload))
	request.Header.Set("X-API-Key", apiKey)
	request.Header.Set("X-Database-Name", "items.db")
	request.Header.Set("X-Backup-Mode", "daemonless")
	request.Header.Set("Content-Type", "application/octet-stream")
	server.router.ServeHTTP(recorder, request)
	if recorder.Code != http.StatusOK {
		t.Fatalf("sync status=%d body=%s", recorder.Code, recorder.Body.String())
	}

	var body struct {
		Data struct {
			DatabaseID string `json:"database_id"`
		} `json:"data"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode sync response: %v", err)
	}
	return body.Data.DatabaseID
}

func TestFileChecksumAndFormatSize(t *testing.T) {
	path := filepath.Join(t.TempDir(), "payload.bin")
	if err := os.WriteFile(path, []byte("hello"), 0o644); err != nil {
		t.Fatalf("write payload: %v", err)
	}

	checksum, err := fileChecksum(path)
	if err != nil {
		t.Fatalf("checksum: %v", err)
	}
	if checksum == "" {
		t.Fatalf("expected checksum")
	}
	if got := formatSize(5); got != "5 B" {
		t.Fatalf("expected 5 B, got %s", got)
	}
}

func TestDownloadReturnsSQLiteBytes(t *testing.T) {
	server := newTestServer(t)
	defer server.Close()

	apiKey := createAPIKey(t, server)
	databaseID := syncSQLiteDatabase(t, server, apiKey)

	revisionsRecorder := httptest.NewRecorder()
	revisionsRequest := httptest.NewRequest(http.MethodGet, "/api/v1/databases/"+databaseID+"/revisions", nil)
	server.router.ServeHTTP(revisionsRecorder, revisionsRequest)

	var revisionsBody struct {
		Data []map[string]any `json:"data"`
	}
	if err := json.Unmarshal(revisionsRecorder.Body.Bytes(), &revisionsBody); err != nil {
		t.Fatalf("decode revisions: %v", err)
	}

	revisionID := revisionsBody.Data[0]["id"].(string)
	downloadRecorder := httptest.NewRecorder()
	downloadRequest := httptest.NewRequest(http.MethodGet, "/api/v1/databases/"+databaseID+"/revisions/"+revisionID+"/download", nil)
	downloadRequest.Header.Set("X-API-Key", apiKey)
	server.router.ServeHTTP(downloadRecorder, downloadRequest)

	if _, err := io.ReadAll(downloadRecorder.Result().Body); err != nil {
		t.Fatalf("read download body: %v", err)
	}
	if contentType := downloadRecorder.Header().Get("Content-Type"); contentType != "application/octet-stream" {
		t.Fatalf("expected octet-stream, got %s", contentType)
	}
}

func TestCORSAllows127Origin(t *testing.T) {
	server := newTestServer(t)
	defer server.Close()

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodOptions, "/api/v1/auth/signup", nil)
	request.Header.Set("Origin", "http://127.0.0.1:5173")
	request.Header.Set("Access-Control-Request-Method", http.MethodPost)
	request.Header.Set("Access-Control-Request-Headers", "content-type")

	server.server.Handler.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", recorder.Code)
	}
	if got := recorder.Header().Get("Access-Control-Allow-Origin"); got != "http://127.0.0.1:5173" {
		t.Fatalf("expected CORS allow origin header, got %q", got)
	}
}
