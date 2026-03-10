package main

import (
	"fmt"
	"os"
)

const version = "dev"

const usage = `lunchbox - SQLite backup and sync

Usage:
  lunchbox <command> [arguments]

Commands:
  login    Authenticate with an API key
  sync     Register a database and start syncing
  backup   Take a one-shot snapshot backup
  restore  Restore a database to a local file
  status   Show sync status for a database
  list     List all registered databases
  unlink   Stop syncing a database
  version  Print the version

Run 'lunchbox <command> --help' for command-specific help.
`

func main() {
	if len(os.Args) < 2 {
		fmt.Fprint(os.Stderr, usage)
		os.Exit(1)
	}

	switch os.Args[1] {
	case "version", "--version", "-v":
		fmt.Printf("lunchbox %s\n", version)
	case "--help", "-h", "help":
		fmt.Print(usage)
	default:
		fmt.Fprintf(os.Stderr, "lunchbox: unknown command %q\n\nRun 'lunchbox --help' for usage.\n", os.Args[1])
		os.Exit(1)
	}
}
