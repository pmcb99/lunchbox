package app

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"lunchbox/backend-go/internal/config"

	_ "modernc.org/sqlite"
)

type Server struct {
	cfg    config.Config
	db     *sql.DB
	router http.Handler
	server *http.Server
}

type httpError struct {
	Status int
	Detail string
}

func (e httpError) Error() string {
	return e.Detail
}

type envelope[T any] struct {
	Data T          `json:"data"`
	Meta envelopeMD `json:"meta"`
}

type envelopeMD struct {
	RequestID string `json:"requestId"`
}

type signupRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type createKeyRequest struct {
	Name *string `json:"name"`
}

type createRevisionRequest struct {
	Type *string `json:"type"`
}

type createDatabaseRequest struct {
	Name           string  `json:"name"`
	Engine         string  `json:"engine"`
	Environment    string  `json:"environment"`
	Schedule       string  `json:"schedule"`
	Retention      string  `json:"retention"`
	Status         string  `json:"status"`
	SizeLabel      string  `json:"size_label"`
	SizeGB         float64 `json:"size_gb"`
	RevisionsLabel string  `json:"revisions_label"`
	RestoresLabel  string  `json:"restores_label"`
	Encryption     string  `json:"encryption"`
	LastSync       string  `json:"last_sync"`
	BackupMode     string  `json:"backup_mode"`
}

type importDatabaseRequest struct {
	Name         string  `json:"name"`
	TargetSizeMB float64 `json:"target_size_mb"`
	BackupMode   string  `json:"backup_mode"`
	Engine       string  `json:"engine"`
	Environment  string  `json:"environment"`
	Schedule     string  `json:"schedule"`
	Retention    string  `json:"retention"`
	Encryption   string  `json:"encryption"`
}

type mutateDatabaseRequest struct {
	AdditionalSizeMB float64 `json:"additional_size_mb"`
}

type updateDatabaseRequest struct {
	BackupMode *string `json:"backup_mode"`
}

type dbMetadata struct {
	DatabaseID     string `json:"database_id"`
	RevisionID     string `json:"revision_id,omitempty"`
	Path           string `json:"path,omitempty"`
	SizeBytes      int64  `json:"size_bytes"`
	SizeLabel      string `json:"size_label"`
	Checksum       string `json:"checksum"`
	LastSync       string `json:"last_sync"`
	RevisionsLabel string `json:"revisions_label,omitempty"`
}

func NewServer(cfg config.Config) (*Server, error) {
	if err := os.MkdirAll(cfg.DataDir, 0o755); err != nil {
		return nil, err
	}

	db, err := sql.Open("sqlite", cfg.DBPath)
	if err != nil {
		return nil, err
	}

	s := &Server{
		cfg: cfg,
		db:  db,
	}
	if err := s.ensureTablesExist(); err != nil {
		return nil, err
	}

	s.router = s.routes()
	s.server = &http.Server{
		Addr:    cfg.Addr,
		Handler: s.withCORS(s.withEnsureTables(s.router)),
	}

	return s, nil
}

func (s *Server) ListenAndServe() error {
	return s.server.ListenAndServe()
}

func (s *Server) Close() error {
	if s.server != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = s.server.Shutdown(ctx)
	}
	if s.db != nil {
		return s.db.Close()
	}
	return nil
}

func (s *Server) routes() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/v1/health", s.handleHealth)
	mux.HandleFunc("POST /api/v1/auth/signup", s.handleSignup)
	mux.HandleFunc("POST /api/v1/auth/login", s.handleLogin)
	mux.HandleFunc("GET /api/v1/workspaces", s.handleListWorkspaces)
	mux.HandleFunc("GET /api/v1/workspaces/{workspaceID}", s.handleGetWorkspace)
	mux.HandleFunc("GET /api/v1/workspaces/{workspaceID}/databases", s.handleListDatabases)
	mux.HandleFunc("POST /api/v1/workspaces/{workspaceID}/databases", s.handleCreateDatabase)
	mux.HandleFunc("POST /api/v1/workspaces/{workspaceID}/databases/import", s.handleImportDatabase)
	mux.HandleFunc("POST /api/v1/workspaces/{workspaceID}/databases/sync", s.handleSyncDatabase)
	mux.HandleFunc("GET /api/v1/workspaces/{workspaceID}/revisions", s.handleListRevisions)
	mux.HandleFunc("GET /api/v1/workspaces/{workspaceID}/schedules", s.handleListSchedules)
	mux.HandleFunc("GET /api/v1/workspaces/{workspaceID}/keys", s.handleListKeys)
	mux.HandleFunc("POST /api/v1/workspaces/{workspaceID}/keys", s.handleCreateKey)
	mux.HandleFunc("DELETE /api/v1/workspaces/{workspaceID}/keys/{keyID}", s.handleDeleteKey)
	mux.HandleFunc("PATCH /api/v1/databases/{databaseID}", s.handleUpdateDatabase)
	mux.HandleFunc("POST /api/v1/databases/{databaseID}/mutate", s.handleMutateDatabase)
	mux.HandleFunc("GET /api/v1/databases/{databaseID}/metadata", s.handleGetDatabaseMetadata)
	mux.HandleFunc("GET /api/v1/databases/{databaseID}/revisions", s.handleListDatabaseRevisions)
	mux.HandleFunc("POST /api/v1/databases/{databaseID}/revisions", s.handleCreateRevision)
	mux.HandleFunc("GET /api/v1/databases/{databaseID}/revisions/{revisionID}/download", s.handleDownloadRevision)
	mux.HandleFunc("GET /api/v1/databases/{databaseID}/tables", s.handleListDatabaseTables)
	mux.HandleFunc("GET /api/v1/databases/{databaseID}/tables/{tableName}", s.handleGetTableData)

	return mux
}

func (s *Server) withEnsureTables(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := s.ensureTablesExist(); err != nil {
			log.Printf("ensure tables: %v", err)
			s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: err.Error()})
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if s.isAllowedOrigin(origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Allow-Methods", "*")
			w.Header().Set("Access-Control-Allow-Headers", "*")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) isAllowedOrigin(origin string) bool {
	for _, allowedOrigin := range s.cfg.AllowedOrigins {
		if origin == allowedOrigin {
			return true
		}
	}
	return false
}

func (s *Server) writeJSON(w http.ResponseWriter, r *http.Request, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(envelope[any]{
		Data: data,
		Meta: envelopeMD{RequestID: requestID()},
	})
}

func (s *Server) writeHTTPError(w http.ResponseWriter, r *http.Request, err error) {
	httpErr := httpError{Status: http.StatusInternalServerError, Detail: err.Error()}
	var typed httpError
	if errors.As(err, &typed) {
		httpErr = typed
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(httpErr.Status)
	_ = json.NewEncoder(w).Encode(map[string]string{"detail": httpErr.Detail})
}

func decodeJSON[T any](r *http.Request, dst *T) error {
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(dst); err != nil {
		return err
	}
	return nil
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	s.writeJSON(w, r, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleSignup(w http.ResponseWriter, r *http.Request) {
	var payload signupRequest
	if err := decodeJSON(r, &payload); err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusBadRequest, Detail: err.Error()})
		return
	}

	userID := "user_" + tokenHex(3)
	createdAt := time.Now().UTC().Format("2006-01-02")
	token := "jwt_" + tokenHex(16)

	if _, err := s.db.Exec(
		"INSERT INTO users (id, email, password, created_at) VALUES (?, ?, ?, ?)",
		userID, payload.Email, payload.Password, createdAt,
	); err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: err.Error()})
		return
	}

	s.writeJSON(w, r, http.StatusOK, map[string]string{"id": userID, "email": payload.Email, "token": token})
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var payload loginRequest
	if err := decodeJSON(r, &payload); err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusBadRequest, Detail: err.Error()})
		return
	}

	token := "jwt_" + tokenHex(16)
	row := s.db.QueryRow("SELECT id, email FROM users WHERE email = ?", payload.Email)

	var userID string
	var email string
	err := row.Scan(&userID, &email)
	if err == nil {
		s.writeJSON(w, r, http.StatusOK, map[string]string{"id": userID, "email": email, "token": token})
		return
	}
	if !errors.Is(err, sql.ErrNoRows) {
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: err.Error()})
		return
	}

	userID = "user_" + tokenHex(3)
	createdAt := time.Now().UTC().Format("2006-01-02")
	if _, err := s.db.Exec(
		"INSERT INTO users (id, email, password, created_at) VALUES (?, ?, ?, ?)",
		userID, payload.Email, payload.Password, createdAt,
	); err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: err.Error()})
		return
	}

	s.writeJSON(w, r, http.StatusOK, map[string]string{"id": userID, "email": payload.Email, "token": token})
}

func (s *Server) handleListWorkspaces(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query("SELECT id, name FROM workspaces")
	if err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: err.Error()})
		return
	}
	defer rows.Close()

	result := make([]map[string]any, 0)
	for rows.Next() {
		var id, name string
		if err := rows.Scan(&id, &name); err != nil {
			s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: err.Error()})
			return
		}
		result = append(result, map[string]any{"id": id, "name": name})
	}

	s.writeJSON(w, r, http.StatusOK, result)
}

func (s *Server) handleGetWorkspace(w http.ResponseWriter, r *http.Request) {
	workspaceID := r.PathValue("workspaceID")
	row := s.db.QueryRow("SELECT id, name FROM workspaces WHERE id = ?", workspaceID)

	var id, name string
	if err := row.Scan(&id, &name); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			s.writeHTTPError(w, r, httpError{Status: http.StatusNotFound, Detail: "Workspace not found"})
			return
		}
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: err.Error()})
		return
	}

	s.writeJSON(w, r, http.StatusOK, map[string]any{"id": id, "name": name})
}

func (s *Server) handleListDatabases(w http.ResponseWriter, r *http.Request) {
	workspaceID := r.PathValue("workspaceID")
	rows, err := s.db.Query(`
		SELECT id, name, engine, environment, schedule, retention, status, size_label,
		       revisions_label, restores_label, encryption, last_sync, backup_mode
		FROM databases
		WHERE workspace_id = ?
		ORDER BY name
	`, workspaceID)
	if err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: err.Error()})
		return
	}
	defer rows.Close()

	result, err := scanRows(rows)
	if err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: err.Error()})
		return
	}

	s.writeJSON(w, r, http.StatusOK, result)
}

func (s *Server) handleCreateDatabase(w http.ResponseWriter, r *http.Request) {
	workspaceID := r.PathValue("workspaceID")
	var payload createDatabaseRequest
	if err := decodeJSON(r, &payload); err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusBadRequest, Detail: err.Error()})
		return
	}
	applyCreateDefaults(&payload)

	if err := s.requireAPIKey(workspaceID, r.Header.Get("X-API-Key")); err != nil {
		s.writeHTTPError(w, r, err)
		return
	}
	if !s.workspaceExists(workspaceID) {
		s.writeHTTPError(w, r, httpError{Status: http.StatusNotFound, Detail: "Workspace not found"})
		return
	}

	databaseID := "db_" + tokenHex(3)
	_, err := s.db.Exec(`
		INSERT INTO databases (
			id, workspace_id, name, engine, environment, schedule, retention, status,
			size_label, size_gb, revisions_label, restores_label, encryption, last_sync, backup_mode
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, databaseID, workspaceID, payload.Name, payload.Engine, payload.Environment, payload.Schedule,
		payload.Retention, payload.Status, payload.SizeLabel, payload.SizeGB, payload.RevisionsLabel,
		payload.RestoresLabel, payload.Encryption, payload.LastSync, payload.BackupMode)
	if err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: err.Error()})
		return
	}

	s.writeJSON(w, r, http.StatusOK, map[string]any{
		"id":              databaseID,
		"name":            payload.Name,
		"engine":          payload.Engine,
		"environment":     payload.Environment,
		"schedule":        payload.Schedule,
		"retention":       payload.Retention,
		"status":          payload.Status,
		"size_label":      payload.SizeLabel,
		"revisions_label": payload.RevisionsLabel,
		"restores_label":  payload.RestoresLabel,
		"encryption":      payload.Encryption,
		"last_sync":       payload.LastSync,
		"backup_mode":     payload.BackupMode,
	})
}

func (s *Server) handleImportDatabase(w http.ResponseWriter, r *http.Request) {
	workspaceID := r.PathValue("workspaceID")
	var payload importDatabaseRequest
	if err := decodeJSON(r, &payload); err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusBadRequest, Detail: err.Error()})
		return
	}
	applyImportDefaults(&payload)

	if err := s.requireAPIKey(workspaceID, r.Header.Get("X-API-Key")); err != nil {
		s.writeHTTPError(w, r, err)
		return
	}
	if payload.TargetSizeMB <= 0 {
		s.writeHTTPError(w, r, httpError{Status: http.StatusBadRequest, Detail: "target_size_mb must be positive"})
		return
	}
	if !s.workspaceExists(workspaceID) {
		s.writeHTTPError(w, r, httpError{Status: http.StatusNotFound, Detail: "Workspace not found"})
		return
	}

	databaseID := "db_" + tokenHex(3)
	_, err := s.db.Exec(`
		INSERT INTO databases (
			id, workspace_id, name, engine, environment, schedule, retention, status,
			size_label, size_gb, revisions_label, restores_label, encryption, last_sync, backup_mode
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, databaseID, workspaceID, payload.Name, payload.Engine, payload.Environment, payload.Schedule,
		payload.Retention, "Healthy", "0 B", 0.0, "0 / day", "0 this week", payload.Encryption, "Never", payload.BackupMode)
	if err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: err.Error()})
		return
	}

	targetSizeBytes := int64(payload.TargetSizeMB * 1024 * 1024)
	if err := ensureSQLitePayload(s.customerDBPath(databaseID), targetSizeBytes); err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: err.Error()})
		return
	}

	metadata, err := s.applyDatabaseMetadata(databaseID, "Automated")
	if err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: err.Error()})
		return
	}

	s.writeJSON(w, r, http.StatusOK, map[string]any{
		"id":              databaseID,
		"workspace_id":    workspaceID,
		"name":            payload.Name,
		"engine":          payload.Engine,
		"environment":     payload.Environment,
		"schedule":        payload.Schedule,
		"retention":       payload.Retention,
		"status":          "Healthy",
		"size_label":      metadata.SizeLabel,
		"size_bytes":      metadata.SizeBytes,
		"revisions_label": metadata.RevisionsLabel,
		"restores_label":  "0 this week",
		"encryption":      payload.Encryption,
		"last_sync":       metadata.LastSync,
		"backup_mode":     payload.BackupMode,
	})
}

func (s *Server) handleSyncDatabase(w http.ResponseWriter, r *http.Request) {
	workspaceID := r.PathValue("workspaceID")
	if err := s.requireAPIKey(workspaceID, r.Header.Get("X-API-Key")); err != nil {
		s.writeHTTPError(w, r, err)
		return
	}

	databaseName := r.Header.Get("X-Database-Name")
	if databaseName == "" {
		s.writeHTTPError(w, r, httpError{Status: http.StatusBadRequest, Detail: "X-Database-Name header is required"})
		return
	}

	backupMode := r.Header.Get("X-Backup-Mode")
	if backupMode == "" {
		backupMode = "daemonless"
	}
	if backupMode != "daemon" && backupMode != "daemonless" {
		s.writeHTTPError(w, r, httpError{Status: http.StatusBadRequest, Detail: "X-Backup-Mode must be daemon or daemonless"})
		return
	}

	payload, err := io.ReadAll(r.Body)
	if err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: err.Error()})
		return
	}
	if len(payload) == 0 {
		s.writeHTTPError(w, r, httpError{Status: http.StatusBadRequest, Detail: "Request body is empty"})
		return
	}

	if !s.workspaceExists(workspaceID) {
		s.writeHTTPError(w, r, httpError{Status: http.StatusNotFound, Detail: "Workspace not found"})
		return
	}

	databaseID, err := s.findDatabaseIDByName(workspaceID, databaseName)
	if err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: err.Error()})
		return
	}
	if databaseID == "" {
		databaseID = "db_" + tokenHex(3)
		_, err = s.db.Exec(`
			INSERT INTO databases (
				id, workspace_id, name, engine, environment, schedule, retention, status,
				size_label, size_gb, revisions_label, restores_label, encryption, last_sync, backup_mode
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`, databaseID, workspaceID, databaseName, "SQLite", "Production", "0 3 * * *", "30 days", "Healthy",
			"0 B", 0.0, "0 / day", "0 this week", "Standard", "Never", backupMode)
	} else {
		_, err = s.db.Exec("UPDATE databases SET backup_mode = ?, engine = ? WHERE id = ?", backupMode, "SQLite", databaseID)
	}
	if err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: err.Error()})
		return
	}

	if err := os.WriteFile(s.customerDBPath(databaseID), payload, 0o644); err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: err.Error()})
		return
	}
	metadata, err := s.applyDatabaseMetadata(databaseID, "Sync")
	if err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: err.Error()})
		return
	}

	s.writeJSON(w, r, http.StatusOK, map[string]any{
		"database_id": databaseID,
		"name":        databaseName,
		"revision_id": metadata.RevisionID,
		"size_bytes":  metadata.SizeBytes,
		"size_label":  metadata.SizeLabel,
		"checksum":    metadata.Checksum,
		"backup_mode": backupMode,
	})
}

func (s *Server) handleUpdateDatabase(w http.ResponseWriter, r *http.Request) {
	databaseID := r.PathValue("databaseID")
	var payload updateDatabaseRequest
	if err := decodeJSON(r, &payload); err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusBadRequest, Detail: err.Error()})
		return
	}
	if payload.BackupMode == nil || (*payload.BackupMode != "daemon" && *payload.BackupMode != "daemonless") {
		s.writeHTTPError(w, r, httpError{Status: http.StatusBadRequest, Detail: "backup_mode must be daemon or daemonless"})
		return
	}

	workspaceID, err := s.databaseWorkspace(databaseID)
	if err != nil {
		s.writeHTTPError(w, r, err.(httpError))
		return
	}
	if err := s.requireAPIKey(workspaceID, r.Header.Get("X-API-Key")); err != nil {
		s.writeHTTPError(w, r, err)
		return
	}

	if _, err := s.db.Exec("UPDATE databases SET backup_mode = ? WHERE id = ?", *payload.BackupMode, databaseID); err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: err.Error()})
		return
	}
	s.writeJSON(w, r, http.StatusOK, map[string]any{"id": databaseID, "backup_mode": *payload.BackupMode})
}

func (s *Server) handleMutateDatabase(w http.ResponseWriter, r *http.Request) {
	databaseID := r.PathValue("databaseID")
	var payload mutateDatabaseRequest
	if err := decodeJSON(r, &payload); err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusBadRequest, Detail: err.Error()})
		return
	}
	if payload.AdditionalSizeMB <= 0 {
		s.writeHTTPError(w, r, httpError{Status: http.StatusBadRequest, Detail: "additional_size_mb must be positive"})
		return
	}

	workspaceID, err := s.databaseWorkspace(databaseID)
	if err != nil {
		s.writeHTTPError(w, r, err.(httpError))
		return
	}
	if err := s.requireAPIKey(workspaceID, r.Header.Get("X-API-Key")); err != nil {
		s.writeHTTPError(w, r, err)
		return
	}

	targetBytes := int64(payload.AdditionalSizeMB * 1024 * 1024)
	if err := appendSQLitePayload(s.customerDBPath(databaseID), targetBytes); err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: err.Error()})
		return
	}
	metadata, err := s.applyDatabaseMetadata(databaseID, "Automated")
	if err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: err.Error()})
		return
	}

	s.writeJSON(w, r, http.StatusOK, metadata)
}

func (s *Server) handleGetDatabaseMetadata(w http.ResponseWriter, r *http.Request) {
	databaseID := r.PathValue("databaseID")
	workspaceID, lastSync, err := s.databaseWorkspaceAndLastSync(databaseID)
	if err != nil {
		s.writeHTTPError(w, r, err.(httpError))
		return
	}
	if err := s.requireAPIKey(workspaceID, r.Header.Get("X-API-Key")); err != nil {
		s.writeHTTPError(w, r, err)
		return
	}

	dbPath := s.customerDBPath(databaseID)
	sizeBytes := fileSizeBytes(dbPath)
	checksum, err := fileChecksum(dbPath)
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: err.Error()})
		return
	}

	s.writeJSON(w, r, http.StatusOK, map[string]any{
		"database_id": databaseID,
		"size_bytes":  sizeBytes,
		"size_label":  formatSize(sizeBytes),
		"checksum":    checksum,
		"last_sync":   lastSync,
	})
}

func (s *Server) handleListRevisions(w http.ResponseWriter, r *http.Request) {
	workspaceID := r.PathValue("workspaceID")
	rows, err := s.db.Query(`
		SELECT revisions.id, revisions.database_id, revisions.created_at, revisions.size_label,
		       revisions.checksum, revisions.type, databases.name AS database
		FROM revisions
		JOIN databases ON databases.id = revisions.database_id
		WHERE databases.workspace_id = ?
		ORDER BY revisions.rowid DESC
	`, workspaceID)
	if err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: err.Error()})
		return
	}
	defer rows.Close()

	result, err := scanRows(rows)
	if err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: err.Error()})
		return
	}
	s.writeJSON(w, r, http.StatusOK, result)
}

func (s *Server) handleListSchedules(w http.ResponseWriter, r *http.Request) {
	workspaceID := r.PathValue("workspaceID")
	rows, err := s.db.Query(`
		SELECT schedules.id, schedules.name, schedules.cadence, schedules.next_run,
		       schedules.status, schedules.database_id, databases.name AS database
		FROM schedules
		JOIN databases ON databases.id = schedules.database_id
		WHERE schedules.workspace_id = ?
		ORDER BY schedules.name
	`, workspaceID)
	if err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: err.Error()})
		return
	}
	defer rows.Close()

	result, err := scanRows(rows)
	if err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: err.Error()})
		return
	}
	s.writeJSON(w, r, http.StatusOK, result)
}

func (s *Server) handleListKeys(w http.ResponseWriter, r *http.Request) {
	workspaceID := r.PathValue("workspaceID")
	rows, err := s.db.Query(`
		SELECT id, name, value, created_at, last_used, status
		FROM keys
		WHERE workspace_id = ?
		ORDER BY created_at DESC
	`, workspaceID)
	if err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: err.Error()})
		return
	}
	defer rows.Close()

	result, err := scanRows(rows)
	if err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: err.Error()})
		return
	}
	s.writeJSON(w, r, http.StatusOK, result)
}

func (s *Server) handleCreateKey(w http.ResponseWriter, r *http.Request) {
	workspaceID := r.PathValue("workspaceID")
	var payload createKeyRequest
	if err := decodeJSON(r, &payload); err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusBadRequest, Detail: err.Error()})
		return
	}
	if !s.workspaceExists(workspaceID) {
		s.writeHTTPError(w, r, httpError{Status: http.StatusNotFound, Detail: "Workspace not found"})
		return
	}

	keyID := "key_" + tokenHex(3)
	keyValue := "lbk_live_" + tokenHex(10)
	name := "Generated API key"
	if payload.Name != nil && *payload.Name != "" {
		name = *payload.Name
	}
	createdAt := time.Now().UTC().Format("2006-01-02")
	if _, err := s.db.Exec(`
		INSERT INTO keys (id, workspace_id, name, value, created_at, last_used, status)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, keyID, workspaceID, name, keyValue, createdAt, "Never", "Active"); err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: err.Error()})
		return
	}

	s.writeJSON(w, r, http.StatusOK, map[string]any{
		"id":         keyID,
		"name":       name,
		"value":      keyValue,
		"created_at": createdAt,
		"last_used":  "Never",
		"status":     "Active",
	})
}

func (s *Server) handleDeleteKey(w http.ResponseWriter, r *http.Request) {
	workspaceID := r.PathValue("workspaceID")
	keyID := r.PathValue("keyID")
	if err := s.requireAPIKey(workspaceID, r.Header.Get("X-API-Key")); err != nil {
		s.writeHTTPError(w, r, err)
		return
	}

	var existing string
	err := s.db.QueryRow("SELECT id FROM keys WHERE id = ? AND workspace_id = ?", keyID, workspaceID).Scan(&existing)
	if errors.Is(err, sql.ErrNoRows) {
		s.writeHTTPError(w, r, httpError{Status: http.StatusNotFound, Detail: "Key not found"})
		return
	}
	if err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: err.Error()})
		return
	}

	if _, err := s.db.Exec("UPDATE keys SET status = ? WHERE id = ?", "Revoked", keyID); err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: err.Error()})
		return
	}

	s.writeJSON(w, r, http.StatusOK, map[string]any{"id": keyID, "status": "Revoked"})
}

func (s *Server) handleListDatabaseRevisions(w http.ResponseWriter, r *http.Request) {
	databaseID := r.PathValue("databaseID")
	rows, err := s.db.Query(`
		SELECT id, created_at, size_label, checksum, type
		FROM revisions
		WHERE database_id = ?
		ORDER BY rowid DESC
	`, databaseID)
	if err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: err.Error()})
		return
	}
	defer rows.Close()

	result, err := scanRows(rows)
	if err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: err.Error()})
		return
	}
	s.writeJSON(w, r, http.StatusOK, result)
}

func (s *Server) handleCreateRevision(w http.ResponseWriter, r *http.Request) {
	databaseID := r.PathValue("databaseID")
	var payload createRevisionRequest
	if r.ContentLength != 0 {
		if err := decodeJSON(r, &payload); err != nil {
			s.writeHTTPError(w, r, httpError{Status: http.StatusBadRequest, Detail: err.Error()})
			return
		}
	}

	workspaceID, err := s.databaseWorkspace(databaseID)
	if err != nil {
		s.writeHTTPError(w, r, err.(httpError))
		return
	}
	if err := s.requireAPIKey(workspaceID, r.Header.Get("X-API-Key")); err != nil {
		s.writeHTTPError(w, r, err)
		return
	}

	revisionType := "Manual"
	if payload.Type != nil && *payload.Type != "" {
		revisionType = *payload.Type
	}

	dbPath := s.customerDBPath(databaseID)
	if _, err := os.Stat(dbPath); err == nil {
		metadata, err := s.applyDatabaseMetadata(databaseID, revisionType)
		if err != nil {
			s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: err.Error()})
			return
		}
		s.writeJSON(w, r, http.StatusOK, map[string]any{
			"id":          metadata.RevisionID,
			"database_id": databaseID,
			"created_at":  metadata.LastSync,
			"size_label":  metadata.SizeLabel,
			"checksum":    metadata.Checksum,
			"type":        revisionType,
		})
		return
	}

	revisionID := "rev_" + tokenHex(3)
	createdAt := nowLabel()
	sizeLabel := "2.4 GB"
	checksum := tokenHex(3) + "..." + tokenHex(2)
	if _, err := s.db.Exec(`
		INSERT INTO revisions (id, database_id, created_at, size_label, checksum, type)
		VALUES (?, ?, ?, ?, ?, ?)
	`, revisionID, databaseID, createdAt, sizeLabel, checksum, revisionType); err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: err.Error()})
		return
	}
	if _, err := s.db.Exec("UPDATE databases SET last_sync = ? WHERE id = ?", "Just now", databaseID); err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: err.Error()})
		return
	}

	s.writeJSON(w, r, http.StatusOK, map[string]any{
		"id":          revisionID,
		"database_id": databaseID,
		"created_at":  createdAt,
		"size_label":  sizeLabel,
		"checksum":    checksum,
		"type":        revisionType,
	})
}

func (s *Server) handleDownloadRevision(w http.ResponseWriter, r *http.Request) {
	databaseID := r.PathValue("databaseID")
	revisionID := r.PathValue("revisionID")

	workspaceID, err := s.databaseWorkspace(databaseID)
	if err != nil {
		s.writeHTTPError(w, r, err.(httpError))
		return
	}
	if err := s.requireAPIKey(workspaceID, r.Header.Get("X-API-Key")); err != nil {
		s.writeHTTPError(w, r, err)
		return
	}

	var existing string
	err = s.db.QueryRow("SELECT id FROM revisions WHERE id = ? AND database_id = ?", revisionID, databaseID).Scan(&existing)
	if errors.Is(err, sql.ErrNoRows) {
		s.writeHTTPError(w, r, httpError{Status: http.StatusNotFound, Detail: "Revision not found"})
		return
	}
	if err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: err.Error()})
		return
	}

	snapshot := s.revisionFilePath(revisionID)
	if _, err := os.Stat(snapshot); err != nil {
		if errors.Is(err, os.ErrNotExist) {
			s.writeHTTPError(w, r, httpError{Status: http.StatusNotFound, Detail: "Revision snapshot not found"})
			return
		}
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: err.Error()})
		return
	}

	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", databaseID+"-"+revisionID+".db"))
	http.ServeFile(w, r, snapshot)
}

func (s *Server) handleListDatabaseTables(w http.ResponseWriter, r *http.Request) {
	databaseID := r.PathValue("databaseID")
	workspaceID, engine, err := s.databaseWorkspaceAndEngine(databaseID)
	if err != nil {
		s.writeHTTPError(w, r, err.(httpError))
		return
	}
	if err := s.requireAPIKey(workspaceID, r.Header.Get("X-API-Key")); err != nil {
		s.writeHTTPError(w, r, err)
		return
	}
	if engine != "SQLite" {
		s.writeHTTPError(w, r, httpError{Status: http.StatusBadRequest, Detail: "Table viewer only supports SQLite databases"})
		return
	}

	dbPath := s.customerDBPath(databaseID)
	if _, err := os.Stat(dbPath); err != nil {
		if errors.Is(err, os.ErrNotExist) {
			s.writeHTTPError(w, r, httpError{Status: http.StatusNotFound, Detail: "Database file not found"})
			return
		}
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: err.Error()})
		return
	}

	sqliteDB, err := sql.Open("sqlite", dbPath)
	if err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: err.Error()})
		return
	}
	defer sqliteDB.Close()

	rows, err := sqliteDB.Query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
	if err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: "Database error: " + err.Error()})
		return
	}
	defer rows.Close()

	tables := make([]map[string]any, 0)
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: "Database error: " + err.Error()})
			return
		}
		var rowCount int64
		if err := sqliteDB.QueryRow(fmt.Sprintf(`SELECT COUNT(*) FROM "%s"`, strings.ReplaceAll(name, `"`, `""`))).Scan(&rowCount); err != nil {
			s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: "Database error: " + err.Error()})
			return
		}
		tables = append(tables, map[string]any{"name": name, "row_count": rowCount})
	}

	s.writeJSON(w, r, http.StatusOK, map[string]any{"tables": tables, "database_id": databaseID})
}

func (s *Server) handleGetTableData(w http.ResponseWriter, r *http.Request) {
	databaseID := r.PathValue("databaseID")
	tableName := r.PathValue("tableName")
	workspaceID, engine, err := s.databaseWorkspaceAndEngine(databaseID)
	if err != nil {
		s.writeHTTPError(w, r, err.(httpError))
		return
	}
	if err := s.requireAPIKey(workspaceID, r.Header.Get("X-API-Key")); err != nil {
		s.writeHTTPError(w, r, err)
		return
	}
	if engine != "SQLite" {
		s.writeHTTPError(w, r, httpError{Status: http.StatusBadRequest, Detail: "Table viewer only supports SQLite databases"})
		return
	}

	limit := 100
	offset := 0
	if raw := r.URL.Query().Get("limit"); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil {
			limit = parsed
		}
	}
	if raw := r.URL.Query().Get("offset"); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil {
			offset = parsed
		}
	}
	if limit > 500 {
		limit = 500
	}

	dbPath := s.customerDBPath(databaseID)
	if _, err := os.Stat(dbPath); err != nil {
		if errors.Is(err, os.ErrNotExist) {
			s.writeHTTPError(w, r, httpError{Status: http.StatusNotFound, Detail: "Database file not found"})
			return
		}
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: err.Error()})
		return
	}

	sqliteDB, err := sql.Open("sqlite", dbPath)
	if err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: err.Error()})
		return
	}
	defer sqliteDB.Close()

	var name string
	if err := sqliteDB.QueryRow(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, tableName).Scan(&name); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			s.writeHTTPError(w, r, httpError{Status: http.StatusNotFound, Detail: "Table not found"})
			return
		}
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: "Database error: " + err.Error()})
		return
	}

	columnRows, err := sqliteDB.Query(fmt.Sprintf(`PRAGMA table_info("%s")`, strings.ReplaceAll(tableName, `"`, `""`)))
	if err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: "Database error: " + err.Error()})
		return
	}
	defer columnRows.Close()

	columns := make([]map[string]any, 0)
	for columnRows.Next() {
		var cid int
		var colName, colType string
		var notNull, pk int
		var defaultValue any
		if err := columnRows.Scan(&cid, &colName, &colType, &notNull, &defaultValue, &pk); err != nil {
			s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: "Database error: " + err.Error()})
			return
		}
		columns = append(columns, map[string]any{"name": colName, "type": colType})
	}

	dataRows, err := sqliteDB.Query(fmt.Sprintf(`SELECT * FROM "%s" LIMIT ? OFFSET ?`, strings.ReplaceAll(tableName, `"`, `""`)), limit, offset)
	if err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: "Database error: " + err.Error()})
		return
	}
	defer dataRows.Close()

	resultRows := make([]map[string]any, 0)
	index := 1
	for dataRows.Next() {
		values, err := scanRowValues(dataRows)
		if err != nil {
			s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: "Database error: " + err.Error()})
			return
		}
		resultRows = append(resultRows, map[string]any{"row": index, "values": values})
		index++
	}

	var totalCount int64
	if err := sqliteDB.QueryRow(fmt.Sprintf(`SELECT COUNT(*) FROM "%s"`, strings.ReplaceAll(tableName, `"`, `""`))).Scan(&totalCount); err != nil {
		s.writeHTTPError(w, r, httpError{Status: http.StatusInternalServerError, Detail: "Database error: " + err.Error()})
		return
	}

	s.writeJSON(w, r, http.StatusOK, map[string]any{
		"table_name":  tableName,
		"columns":     columns,
		"data":        resultRows,
		"total_count": totalCount,
		"limit":       limit,
		"offset":      offset,
	})
}

func (s *Server) ensureTablesExist() error {
	if err := s.initDB(); err != nil {
		return err
	}

	var exists int
	err := s.db.QueryRow("SELECT 1 FROM users LIMIT 1").Scan(&exists)
	if err == nil || errors.Is(err, sql.ErrNoRows) {
		return nil
	}
	return s.initDB()
}

func (s *Server) initDB() error {
	if err := os.MkdirAll(filepath.Dir(s.cfg.DBPath), 0o755); err != nil {
		return err
	}
	if _, err := s.db.Exec(`
		CREATE TABLE IF NOT EXISTS workspaces (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS databases (
			id TEXT PRIMARY KEY,
			workspace_id TEXT NOT NULL,
			name TEXT NOT NULL,
			engine TEXT NOT NULL,
			environment TEXT NOT NULL,
			schedule TEXT NOT NULL,
			retention TEXT NOT NULL,
			status TEXT NOT NULL,
			size_label TEXT NOT NULL,
			size_gb REAL NOT NULL,
			revisions_label TEXT NOT NULL,
			restores_label TEXT NOT NULL,
			encryption TEXT NOT NULL,
			last_sync TEXT NOT NULL,
			backup_mode TEXT NOT NULL DEFAULT 'daemon'
		);
		CREATE TABLE IF NOT EXISTS revisions (
			id TEXT PRIMARY KEY,
			database_id TEXT NOT NULL,
			created_at TEXT NOT NULL,
			size_label TEXT NOT NULL,
			checksum TEXT NOT NULL,
			type TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS schedules (
			id TEXT PRIMARY KEY,
			workspace_id TEXT NOT NULL,
			database_id TEXT NOT NULL,
			name TEXT NOT NULL,
			cadence TEXT NOT NULL,
			next_run TEXT NOT NULL,
			status TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS keys (
			id TEXT PRIMARY KEY,
			workspace_id TEXT NOT NULL,
			name TEXT NOT NULL,
			value TEXT NOT NULL,
			created_at TEXT NOT NULL,
			last_used TEXT NOT NULL,
			status TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS users (
			id TEXT PRIMARY KEY,
			email TEXT NOT NULL,
			password TEXT NOT NULL,
			created_at TEXT NOT NULL
		);
	`); err != nil {
		return err
	}

	var backupModeColumn int
	if err := s.db.QueryRow(`
		SELECT COUNT(*) FROM pragma_table_info('databases') WHERE name = 'backup_mode'
	`).Scan(&backupModeColumn); err != nil {
		return err
	}
	if backupModeColumn == 0 {
		if _, err := s.db.Exec("ALTER TABLE databases ADD COLUMN backup_mode TEXT NOT NULL DEFAULT 'daemon'"); err != nil {
			return err
		}
	}

	var workspaceCount int
	if err := s.db.QueryRow("SELECT COUNT(*) FROM workspaces").Scan(&workspaceCount); err != nil {
		return err
	}
	if workspaceCount > 0 {
		return nil
	}

	if s.cfg.SkipSeed {
		return s.seedWorkspacesOnly()
	}
	return s.seedData()
}

func (s *Server) seedWorkspacesOnly() error {
	_, err := s.db.Exec("INSERT INTO workspaces (id, name) VALUES (?, ?)", "ws_001", "Shovelstone Labs")
	return err
}

func (s *Server) seedData() error {
	if err := s.seedWorkspacesOnly(); err != nil {
		return err
	}

	_, err := s.db.Exec(`
		INSERT INTO databases (
			id, workspace_id, name, engine, environment, schedule, retention, status,
			size_label, size_gb, revisions_label, restores_label, encryption, last_sync, backup_mode
		) VALUES
		('db_analytics', 'ws_001', 'customer-analytics', 'PostgreSQL', 'Production', '0 3 * * *', '30 days', 'Healthy', '182 GB', 182.0, '128 / day', '2 this week', 'Post-quantum', '2m ago', 'daemon'),
		('db_billing', 'ws_001', 'billing-ledger', 'PostgreSQL', 'Production', '0 */6 * * *', '90 days', 'Healthy', '64 GB', 64.0, '42 / day', '1 this week', 'Post-quantum', '14m ago', 'daemon'),
		('db_edge', 'ws_001', 'edge-cache', 'SQLite', 'Staging', '0 * * * *', '14 days', 'Warning', '8.1 GB', 8.1, '18 / day', '3 this week', 'Standard', '1h ago', 'daemonless');

		INSERT INTO revisions (id, database_id, created_at, size_label, checksum, type) VALUES
		('rev_42ad2', 'db_analytics', 'Today 09:30 UTC', '3.2 GB', 'b3a2f1...8d2', 'Automated'),
		('rev_3bc19', 'db_billing', 'Today 09:00 UTC', '1.1 GB', 'c8d9e2...1a4', 'Manual'),
		('rev_a1c07', 'db_edge', 'Today 08:00 UTC', '420 MB', '9fd02a...bb1', 'Automated');

		INSERT INTO schedules (id, workspace_id, database_id, name, cadence, next_run, status) VALUES
		('sch_nightly', 'ws_001', 'db_analytics', 'Nightly production', '0 3 * * *', 'Tomorrow 03:00 UTC', 'Active'),
		('sch_billing', 'ws_001', 'db_billing', 'Billing ledger', '0 */6 * * *', 'Today 18:00 UTC', 'Active'),
		('sch_edge', 'ws_001', 'db_edge', 'Edge cache hourly', '0 * * * *', 'Today 11:00 UTC', 'Paused');

		INSERT INTO keys (id, workspace_id, name, value, created_at, last_used, status) VALUES
		('key_primary', 'ws_001', 'Primary API key', 'lbk_live_2d7f3e9f1f7b4b45', '2026-01-18', 'Today 09:31 UTC', 'Active'),
		('key_cicd', 'ws_001', 'CI/CD token', 'lbk_live_6a2cbe0ff5bfae51', '2026-01-10', 'Today 07:20 UTC', 'Active'),
		('key_old', 'ws_001', 'Deprecated key', 'lbk_live_a0cf8d0ba0994d1e', '2025-12-11', '2026-02-20 UTC', 'Revoked');
	`)
	return err
}

func (s *Server) requireAPIKey(workspaceID string, apiKey string) error {
	if apiKey == "" {
		return httpError{Status: http.StatusUnauthorized, Detail: "API key required"}
	}

	var id string
	err := s.db.QueryRow(`
		SELECT id
		FROM keys
		WHERE workspace_id = ? AND value = ? AND status = 'Active'
	`, workspaceID, apiKey).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return httpError{Status: http.StatusUnauthorized, Detail: "Invalid API key"}
	}
	if err != nil {
		return httpError{Status: http.StatusInternalServerError, Detail: err.Error()}
	}
	return nil
}

func (s *Server) workspaceExists(workspaceID string) bool {
	var count int
	if err := s.db.QueryRow("SELECT COUNT(*) FROM workspaces WHERE id = ?", workspaceID).Scan(&count); err != nil {
		return false
	}
	return count > 0
}

func (s *Server) findDatabaseIDByName(workspaceID string, name string) (string, error) {
	var id string
	err := s.db.QueryRow("SELECT id FROM databases WHERE workspace_id = ? AND name = ?", workspaceID, name).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return "", nil
	}
	return id, err
}

func (s *Server) databaseWorkspace(databaseID string) (string, error) {
	var workspaceID string
	err := s.db.QueryRow("SELECT workspace_id FROM databases WHERE id = ?", databaseID).Scan(&workspaceID)
	if errors.Is(err, sql.ErrNoRows) {
		return "", httpError{Status: http.StatusNotFound, Detail: "Database not found"}
	}
	if err != nil {
		return "", httpError{Status: http.StatusInternalServerError, Detail: err.Error()}
	}
	return workspaceID, nil
}

func (s *Server) databaseWorkspaceAndLastSync(databaseID string) (string, string, error) {
	var workspaceID, lastSync string
	err := s.db.QueryRow("SELECT workspace_id, last_sync FROM databases WHERE id = ?", databaseID).Scan(&workspaceID, &lastSync)
	if errors.Is(err, sql.ErrNoRows) {
		return "", "", httpError{Status: http.StatusNotFound, Detail: "Database not found"}
	}
	if err != nil {
		return "", "", httpError{Status: http.StatusInternalServerError, Detail: err.Error()}
	}
	return workspaceID, lastSync, nil
}

func (s *Server) databaseWorkspaceAndEngine(databaseID string) (string, string, error) {
	var workspaceID, engine string
	err := s.db.QueryRow("SELECT workspace_id, engine FROM databases WHERE id = ?", databaseID).Scan(&workspaceID, &engine)
	if errors.Is(err, sql.ErrNoRows) {
		return "", "", httpError{Status: http.StatusNotFound, Detail: "Database not found"}
	}
	if err != nil {
		return "", "", httpError{Status: http.StatusInternalServerError, Detail: err.Error()}
	}
	return workspaceID, engine, nil
}

func (s *Server) applyDatabaseMetadata(databaseID string, revisionType string) (dbMetadata, error) {
	dbPath := s.customerDBPath(databaseID)
	sizeBytes := fileSizeBytes(dbPath)
	checksum, err := fileChecksum(dbPath)
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		return dbMetadata{}, err
	}

	sizeLabel := formatSize(sizeBytes)
	sizeGB := 0.0
	if sizeBytes > 0 {
		sizeGB = float64(sizeBytes) / float64(1024*1024*1024)
	}
	lastSync := nowLabel()
	revisionID := "rev_" + tokenHex(3)

	tx, err := s.db.Begin()
	if err != nil {
		return dbMetadata{}, err
	}
	defer tx.Rollback()

	if _, err := tx.Exec("UPDATE databases SET size_label = ?, size_gb = ?, last_sync = ? WHERE id = ?", sizeLabel, sizeGB, lastSync, databaseID); err != nil {
		return dbMetadata{}, err
	}
	if _, err := tx.Exec(`
		INSERT INTO revisions (id, database_id, created_at, size_label, checksum, type)
		VALUES (?, ?, ?, ?, ?, ?)
	`, revisionID, databaseID, lastSync, sizeLabel, checksum, revisionType); err != nil {
		return dbMetadata{}, err
	}

	var count int
	if err := tx.QueryRow("SELECT COUNT(*) FROM revisions WHERE database_id = ?", databaseID).Scan(&count); err != nil {
		return dbMetadata{}, err
	}
	revisionsLabel := fmt.Sprintf("%d / day", count)
	if _, err := tx.Exec("UPDATE databases SET revisions_label = ? WHERE id = ?", revisionsLabel, databaseID); err != nil {
		return dbMetadata{}, err
	}
	if err := tx.Commit(); err != nil {
		return dbMetadata{}, err
	}

	if sizeBytes > 0 {
		payload, err := os.ReadFile(dbPath)
		if err != nil {
			return dbMetadata{}, err
		}
		if err := os.WriteFile(s.revisionFilePath(revisionID), payload, 0o644); err != nil {
			return dbMetadata{}, err
		}
	}

	return dbMetadata{
		DatabaseID:     databaseID,
		RevisionID:     revisionID,
		Path:           dbPath,
		SizeBytes:      sizeBytes,
		SizeLabel:      sizeLabel,
		Checksum:       checksum,
		LastSync:       lastSync,
		RevisionsLabel: revisionsLabel,
	}, nil
}

func (s *Server) customerDBPath(databaseID string) string {
	path := filepath.Join(s.cfg.DataDir, "customer_dbs")
	_ = os.MkdirAll(path, 0o755)
	return filepath.Join(path, databaseID+".db")
}

func (s *Server) revisionFilePath(revisionID string) string {
	path := filepath.Join(s.cfg.DataDir, "revisions")
	_ = os.MkdirAll(path, 0o755)
	return filepath.Join(path, revisionID+".db")
}

func applyCreateDefaults(payload *createDatabaseRequest) {
	if payload.Engine == "" {
		payload.Engine = "PostgreSQL"
	}
	if payload.Environment == "" {
		payload.Environment = "Production"
	}
	if payload.Schedule == "" {
		payload.Schedule = "0 3 * * *"
	}
	if payload.Retention == "" {
		payload.Retention = "30 days"
	}
	if payload.Status == "" {
		payload.Status = "Healthy"
	}
	if payload.SizeLabel == "" {
		payload.SizeLabel = "12 GB"
	}
	if payload.SizeGB == 0 {
		payload.SizeGB = 12.0
	}
	if payload.RevisionsLabel == "" {
		payload.RevisionsLabel = "0 / day"
	}
	if payload.RestoresLabel == "" {
		payload.RestoresLabel = "0 this week"
	}
	if payload.Encryption == "" {
		payload.Encryption = "Standard"
	}
	if payload.LastSync == "" {
		payload.LastSync = "Just now"
	}
	if payload.BackupMode == "" {
		payload.BackupMode = "daemon"
	}
}

func applyImportDefaults(payload *importDatabaseRequest) {
	if payload.TargetSizeMB == 0 {
		payload.TargetSizeMB = 2.0
	}
	if payload.BackupMode == "" {
		payload.BackupMode = "daemon"
	}
	if payload.Engine == "" {
		payload.Engine = "SQLite"
	}
	if payload.Environment == "" {
		payload.Environment = "Production"
	}
	if payload.Schedule == "" {
		payload.Schedule = "0 3 * * *"
	}
	if payload.Retention == "" {
		payload.Retention = "30 days"
	}
	if payload.Encryption == "" {
		payload.Encryption = "Standard"
	}
}

func requestID() string {
	return "req_" + tokenHex(4)
}

func tokenHex(byteLen int) string {
	buf := make([]byte, byteLen)
	if _, err := rand.Read(buf); err != nil {
		panic(err)
	}
	return hex.EncodeToString(buf)
}

func nowLabel() string {
	return time.Now().UTC().Format("2006-01-02 15:04 UTC")
}

func formatSize(sizeBytes int64) string {
	switch {
	case sizeBytes >= 1024*1024*1024:
		return fmt.Sprintf("%.1f GB", float64(sizeBytes)/float64(1024*1024*1024))
	case sizeBytes >= 1024*1024:
		return fmt.Sprintf("%.1f MB", float64(sizeBytes)/float64(1024*1024))
	case sizeBytes >= 1024:
		return fmt.Sprintf("%.1f KB", float64(sizeBytes)/1024.0)
	default:
		return fmt.Sprintf("%d B", sizeBytes)
	}
}

func fileChecksum(path string) (string, error) {
	file, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer file.Close()

	digest := sha256.New()
	if _, err := io.Copy(digest, file); err != nil {
		return "", err
	}
	return hex.EncodeToString(digest.Sum(nil)), nil
}

func fileSizeBytes(path string) int64 {
	info, err := os.Stat(path)
	if err != nil {
		return 0
	}
	return info.Size()
}

func ensureSQLitePayload(path string, targetSizeBytes int64) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return err
	}
	defer db.Close()

	if _, err := db.Exec("CREATE TABLE IF NOT EXISTS payload (id INTEGER PRIMARY KEY, data TEXT)"); err != nil {
		return err
	}

	payload := strings.Repeat("x", 1024)
	for fileSizeBytes(path) < targetSizeBytes {
		tx, err := db.Begin()
		if err != nil {
			return err
		}
		stmt, err := tx.Prepare("INSERT INTO payload (data) VALUES (?)")
		if err != nil {
			tx.Rollback()
			return err
		}
		for i := 0; i < 200; i++ {
			if _, err := stmt.Exec(payload); err != nil {
				stmt.Close()
				tx.Rollback()
				return err
			}
		}
		stmt.Close()
		if err := tx.Commit(); err != nil {
			return err
		}
	}
	return nil
}

func appendSQLitePayload(path string, additionalBytes int64) error {
	return ensureSQLitePayload(path, fileSizeBytes(path)+additionalBytes)
}

func scanRows(rows *sql.Rows) ([]map[string]any, error) {
	columns, err := rows.Columns()
	if err != nil {
		return nil, err
	}

	result := make([]map[string]any, 0)
	for rows.Next() {
		dest := make([]any, len(columns))
		scans := make([]any, len(columns))
		for i := range dest {
			scans[i] = &dest[i]
		}
		if err := rows.Scan(scans...); err != nil {
			return nil, err
		}

		entry := make(map[string]any, len(columns))
		for i, column := range columns {
			entry[column] = normalizeSQLValue(dest[i])
		}
		result = append(result, entry)
	}

	return result, rows.Err()
}

func scanRowValues(rows *sql.Rows) ([]any, error) {
	columns, err := rows.Columns()
	if err != nil {
		return nil, err
	}
	values := make([]any, len(columns))
	scans := make([]any, len(columns))
	for i := range values {
		scans[i] = &values[i]
	}
	if err := rows.Scan(scans...); err != nil {
		return nil, err
	}
	result := make([]any, len(values))
	for i, value := range values {
		result[i] = normalizeSQLValue(value)
	}
	return result, nil
}

func normalizeSQLValue(value any) any {
	switch typed := value.(type) {
	case []byte:
		return string(typed)
	case float64:
		if math.Mod(typed, 1) == 0 {
			return int64(typed)
		}
		return typed
	default:
		return typed
	}
}
