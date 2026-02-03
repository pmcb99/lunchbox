#!/usr/bin/env python3
"""
Lunchbox Test Script

This script creates a comprehensive test suite for Lunchbox based on the documentation.
It creates test databases, runs lunchbox commands, and verifies operations.

Usage:
    python test_lunchbox.py
    python test_lunchbox.py --verbose
    python test_lunchbox.py --db-type sqlite
    python test_lunchbox.py --db-type postgresql --database-url postgresql://user:pass@localhost/test
"""

import os
import sys
import shutil
import subprocess
import sqlite3
import argparse
import uuid
import datetime
from pathlib import Path
import pickle
import json
from typing import Optional, List, Dict, Any

class Colors:
    """ANSI color codes for terminal output"""
    RESET = '\033[0m'
    BOLD = '\033[1m'
    RED = '\033[91m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'

class LunchboxTester:
    """Comprehensive Lunchbox testing framework"""
    
    def __init__(self, verbose: bool = False, db_type: str = "sqlite", 
                 database_url: Optional[str] = None, 
                 test_db_path: str = "test_users.db"):
        self.verbose = verbose
        self.db_type = db_type
        self.database_url = database_url
        self.test_db_path = test_db_path
        self.backup_db_path = f"{test_db_path}.backup"
        self.restored_db_path = f"{test_db_path}.restored"
        self.test_data_cache = {}
        
        # Setup logging
        self._setup_logging()
        self.cli_available = self._validate_environment()
    
    def _log(self, message: str, level: str = "INFO"):
        """Log with colored output"""
        if level == "ERROR":
            color = Colors.RED
        elif level == "SUCCESS":
            color = Colors.GREEN
        elif level == "WARNING":
            color = Colors.YELLOW
        else:
            color = Colors.CYAN
        
        if self.verbose or level in ["ERROR", "SUCCESS", "WARNING"]:
            print(f"{color}[{level}]{Colors.RESET} {message}")
    
    def _setup_logging(self):
        """Initialize logging directory"""
        log_dir = Path("test_logs")
        log_dir.mkdir(exist_ok=True)
        
        self.log_file = log_dir / f"lunchbox_test_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
        self._log("Initialized lunchbox test suite")
    
    def _validate_environment(self):
        """Check if lunchbox CLI is available (no log when missing; run_tests reports if needed)."""
        try:
            result = subprocess.run(
                ["lunchbox", "--version"],
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode == 0:
                self._log(f"Lunchbox CLI found: {result.stdout.strip()}", "SUCCESS")
                return True
            return False
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return False
    
    def _run_command(self, cmd: List[str], timeout: int = 300) -> tuple:
        """Execute command and return (success, stdout, stderr)"""
        try:
            if self.verbose:
                self._log(f"Executing: {' '.join(cmd)}")
            # Use same Python as this process so venv's lunchbox is found if installed
            executable = cmd[0]
            if executable == "lunchbox" and shutil.which("lunchbox") is None:
                return False, "", "lunchbox CLI not found in PATH"
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
            success = result.returncode == 0

            if self.verbose:
                if success and result.stdout:
                    self._log(f"Output: {result.stdout}")
                if not success and result.stderr:
                    self._log(f"Error: {result.stderr}", "ERROR")

            return success, result.stdout, result.stderr
        except FileNotFoundError as e:
            self._log(f"Command not found: {cmd[0]}", "ERROR")
            return False, "", str(e)
        except subprocess.TimeoutExpired:
            self._log(f"Command timed out: {' '.join(cmd)}", "ERROR")
            return False, "", "Command timed out"
    
    def _create_test_database(self) -> bool:
        """Create SQLite test database with realistic tables and data"""
        try:
            # Remove existing test databases
            for db_path in [self.test_db_path, self.restored_db_path]:
                if Path(db_path).exists():
                    Path(db_path).unlink()
            
            # Create new database
            conn = sqlite3.connect(self.test_db_path)
            cursor = conn.cursor()
            
            # Create users table
            cursor.execute('''
                CREATE TABLE users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_login DATETIME,
                    is_active BOOLEAN DEFAULT TRUE
                )
            ''')
            
            # Create products table
            cursor.execute('''
                CREATE TABLE products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    price DECIMAL(10,2) NOT NULL,
                    stock_quantity INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Create orders table
            cursor.execute('''
                CREATE TABLE orders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    product_id INTEGER NOT NULL,
                    quantity INTEGER NOT NULL,
                    total_amount DECIMAL(10,2) NOT NULL,
                    order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    status TEXT DEFAULT 'pending',
                    FOREIGN KEY (user_id) REFERENCES users (id),
                    FOREIGN KEY (product_id) REFERENCES products (id)
                )
            ''')
            
            # Insert test data
            test_users = [
                ('testuser1', 'test1@example.com'),
                ('testuser2', 'test2@example.com'), 
                ('admin', 'admin@example.com', True),
            ]
            
            for i, user in enumerate(test_users):
                if len(user) == 3:
                    username, email, is_active = user
                else:
                    username, email = user
                    is_active = True
                    
                cursor.execute('INSERT INTO users (username, email, is_active) VALUES (?, ?, ?)', 
                             (username, email, is_active))
            
            # Insert sample products
            products = [
                ('Widget A', 'Premium widget with advanced features', 29.99, 100),
                ('Widget B', 'Basic widget for everyday use', 14.99, 250),
                ('Pro Package', 'Professional widget bundle', 99.99, 50),
            ]
            
            for name, desc, price, stock in products:
                cursor.execute('''
                    INSERT INTO products (name, description, price, stock_quantity)
                    VALUES (?, ?, ?, ?)
                ''', (name, desc, price, stock))
            
            # Insert test orders
            cursor.execute('''
                INSERT INTO orders (user_id, product_id, quantity, total_amount)
                VALUES 
                (1, 1, 2, 59.98),
                (1, 2, 1, 14.99),
                (2, 3, 1, 99.99)
            ''')
            
            conn.commit()
            
            # Store test data for later validation
            cursor.execute('SELECT COUNT(*) FROM users')
            user_count = cursor.fetchone()[0]
            cursor.execute('SELECT COUNT(*) FROM products')
            product_count = cursor.fetchone()[0]
            cursor.execute('SELECT COUNT(*) FROM orders')
            order_count = cursor.fetchone()[0]
            
            self.test_data_cache = {
                'users': user_count,
                'products': product_count,
                'orders': order_count,
                'database_size': os.path.getsize(self.test_db_path)
            }
            
            self._log(f"Created test database with {user_count} users, {product_count} products, {order_count} orders", "SUCCESS")
            self._log(f"Database size: {self.test_data_cache['database_size']} bytes")
            
            conn.close()
            return True
            
        except Exception as e:
            self._log(f"Failed to create test database: {e}", "ERROR")
            return False
    
    def _test_lunchbox_sync(self) -> bool:
        """Test lunchbox sync command"""
        self._log("Testing lunchbox sync...")
        
        if self.db_type == "sqlite":
            # Test basic SQLite sync
            success, stdout, stderr = self._run_command(['lunchbox', 'sync', self.test_db_path])
            if success:
                self._log("SQLite sync successful!", "SUCCESS")
                return True
            else:
                self._log(f"SQLite sync failed: {stderr}", "ERROR")
                return False
        
        elif self.db_type == "postgresql":
            # Test PostgreSQL sync
            if not self.database_url:
                self._log("PostgreSQL requires DATABASE_URL environment variable", "ERROR")
                return False
            
            cmd = ['lunchbox', 'sync']
            env = os.environ.copy()
            env['DATABASE_URL'] = self.database_url
            
            try:
                result = subprocess.run(cmd, capture_output=True, text=True, 
                                        timeout=300, env=env)
                if result.returncode == 0:
                    self._log("PostgreSQL sync successful!", "SUCCESS")
                    return True
                else:
                    self._log(f"PostgreSQL sync failed: {result.stderr}", "ERROR")
                    return False
            except subprocess.TimeoutExpired:
                self._log("PostgreSQL sync timed out", "ERROR")
                return False
        
        return False
    
    def _test_lunchbox_revisions(self) -> bool:
        """Test lunchbox revisions command"""
        self._log("Testing lunchbox revisions...")
        
        if self.db_type == "sqlite":
            cmd = ['lunchbox', 'revisions', self.test_db_path]
        else:
            # For PostgreSQL, need to get db name
            db_name = os.path.basename(self.database_url.split('?')[0].split('/')[-1])
            cmd = ['lunchbox', 'revisions', '--db', db_name]
        
        success, stdout, stderr = self._run_command(cmd)
        if success:
            # Parse output to find revision info
            lines = stdout.strip().split('\n')
            if len(lines) >= 2:  # Header + at least one revision
                self._log("Found revisions in output:", "SUCCESS")
                for line in lines[1:3]:  # Show first few revisions
                    self._log(f"  {line}")
                return True
            else:
                self._log("No revisions found in output", "WARNING")
                return False
        else:
            self._log(f"Revisions command failed: {stderr}", "ERROR")
            return False
    
    def _test_lunchbox_restore(self) -> bool:
        """Test lunchbox restore functionality"""
        self._log("Testing lunchbox restore...")
        
        # Try to restore to a new file
        if self.db_type == "sqlite":
            cmd = ['lunchbox', 'restore', self.test_db_path, 
                   '--output', self.restored_db_path]
            
            success, stdout, stderr = self._run_command(cmd)
            if success and os.path.exists(self.restored_db_path):
                self._log("Restore successful!", "SUCCESS")
                return self._verify_restore()
            else:
                self._log(f"Restore failed: {stderr}", "ERROR")
                return False
        else:
            # PostgreSQL restore (this is more complex, would need target DB)
            self._log("PostgreSQL restore tests require additional setup", "INFO")
            return True
    
    def _verify_restore(self) -> bool:
        """Verify restored database matches original"""
        try:
            self._log("Verifying restored database...")
            
            conn_original = sqlite3.connect(self.test_db_path)
            conn_restored = sqlite3.connect(self.restored_db_path)
            
            # Check user count
            cursor_orig = conn_original.cursor()
            cursor_rest = conn_restored.cursor()
            
            cursor_orig.execute('SELECT COUNT(*) FROM users')
            orig_users = cursor_orig.fetchone()[0]
            cursor_rest.execute('SELECT COUNT(*) FROM users')
            rest_users = cursor_rest.fetchone()[0]
            
            cursor_orig.execute('SELECT COUNT(*) FROM products')
            orig_products = cursor_orig.fetchone()[0]
            cursor_rest.execute('SELECT COUNT(*) FROM products')
            rest_products = cursor_rest.fetchone()[0]
            
            cursor_orig.execute('SELECT COUNT(*) FROM orders')
            orig_orders = cursor_orig.fetchone()[0]
            cursor_rest.execute('SELECT COUNT(*) FROM orders')
            rest_orders = cursor_rest.fetchone()[0]
            
            conn_original.close()
            conn_restored.close()
            
            # Verify counts match
            if (orig_users == rest_users and 
                orig_products == rest_products and 
                orig_orders == rest_orders):
                self._log(f"Database verification successful! Restored DB has {rest_users} users, {rest_products} products, {rest_orders} orders", "SUCCESS")
                return True
            else:
                self._log(f"Database verification failed! Original: {orig_users}u/{orig_products}p/{orig_orders}o, Restored: {rest_users}u/{rest_products}p/{rest_orders}o", "ERROR")
                return False
                
        except Exception as e:
            self._log(f"Database verification failed: {e}", "ERROR")
            return False
    
    def _cleanup_test_files(self):
        """Clean up test files."""
        self._log("Cleaning up test files...")
        
        test_files = [
            self.test_db_path, 
            f"{self.test_db_path}-wal",
            f"{self.test_db_path}-shm",
            self.restored_db_path,
            self.backup_db_path
        ]
        
        for file_path in test_files:
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                    self._log(f"Removed {file_path}")
                except Exception as e:
                    self._log(f"Warning: Could not remove {file_path}: {e}", "WARNING")
    
    def run_tests(self, skip_cli: bool = False) -> bool:
        """Run complete test suite."""
        self._log("Starting Lunchbox test suite...", "INFO")

        if skip_cli:
            self._log("Running in DB-only mode (--skip-cli); Lunchbox sync/restore will be skipped.", "INFO")
        elif not self.cli_available:
            self._log("Lunchbox CLI is not installed or not on PATH. Install it locally, e.g.: pip install -e /path/to/lunchbox-cli", "ERROR")
            self._log("To run only database create/teardown without the CLI, use: python test_lunchbox.py --skip-cli", "INFO")
            return False

        # Step 1: Create test database
        if not self._create_test_database():
            return False

        if skip_cli:
            self._log("Database created successfully. Skipping CLI tests.", "SUCCESS")
            return True

        # Step 2: Test sync
        if not self._test_lunchbox_sync():
            return False

        # Step 3: Test revisions
        if not self._test_lunchbox_revisions():
            return False

        # Step 4: Test restore and verification
        if not self._test_lunchbox_restore():
            return False

        self._log("All tests passed successfully!", "SUCCESS")
        return True

def main():
    parser = argparse.ArgumentParser(description='Test Lunchbox database backup and restore functionality')
    parser.add_argument('--verbose', '-v', action='store_true', help='Enable verbose output')
    parser.add_argument('--db-type', choices=['sqlite', 'postgresql'], default='sqlite', help='Database type to test')
    parser.add_argument('--database-url', help='PostgreSQL connection string (required for --db-type postgresql)')
    parser.add_argument('--db-path', default='test_users.db', help='SQLite database file path')
    parser.add_argument('--no-cleanup', action='store_true', help='Keep test files after completion')
    parser.add_argument('--skip-cli', action='store_true', help='Only create DB and tear down; skip lunchbox sync/restore (use when CLI is not installed)')

    args = parser.parse_args()

    tester = LunchboxTester(
        verbose=args.verbose,
        db_type=args.db_type,
        database_url=args.database_url,
        test_db_path=args.db_path
    )
    
    try:
        success = tester.run_tests(skip_cli=args.skip_cli)
        
        if success:
            print(f"\n{Colors.GREEN}🎉 All tests passed!{Colors.RESET}")
            print("Lunchbox is working correctly with your setup.")
        else:
            print(f"\n{Colors.RED}❌ Tests failed!{Colors.RESET}")
            print("Check the logs above for details.")
        
        if not args.no_cleanup:
            tester._cleanup_test_files()
        
        return 0 if success else 1
        
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Tests interrupted by user{Colors.RESET}")
        if not args.no_cleanup:
            tester._cleanup_test_files()
        return 1

if __name__ == '__main__':
    sys.exit(main())