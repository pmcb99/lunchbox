# Agent rules and skills

## Rules
- **Deploy and VPS (Nginx/HTTPS)**: When deploying to a server or setting up Nginx and HTTPS, never throw work back at the user. Run the commands, apply the config, and complete the setup yourself. Only ask for help when you genuinely need it (e.g. a password, a decision only they can make) or when there is a showstopper; otherwise keep going.
- **Portal org scope in dev**: Until full auth/org routing is finalized, treat the header organisation dropdown (`Developer Scope`) as the proxy for login context. Portal routing and data loading should resolve against that selected organisation scope first.
- **Backend API reference**: Use `BACKEND_API.md` as the canonical map of portal/booking backend routes, expected functionality, and frontend endpoint usage before adding or changing API calls.

## Skills
- **deploy**: See [skills/deploy.md](skills/deploy.md). When the user asks to deploy (or push and deploy), log into the VPS, pull the latest changes, build the app, and restart. Run `./deploy-vps.sh` from the repo root to perform the VPS deploy.
- **VPS HTTPS**: See [docs/vps-https-setup.md](docs/vps-https-setup.md) for setting up Nginx + Let's Encrypt (Certbot) for a domain (e.g. booking.shovelstone.com) on the VPS.
- **Logging Best Practices**: See [skills/logging-best-practices.md](skills/logging-best-practices.md). Use before implementing logs in a medium to large scale production system. Follow structured logging, required fields, context propagation, and correct log levels when helping with logging, observability, or debugging.


# Claude Code Guidelines for Ralphy

## Code Change Philosophy

### Keep Changes Small and Focused
- **One logical change per commit** - Each commit should do exactly one thing
- If a task feels too large, break it into subtasks
- Prefer multiple small commits over one large commit
- Run feedback loops after each change, not at the end

**Quality over speed. Small steps compound into big progress.**

### Task Prioritization

When choosing the next task, prioritize in this order:

1. **Architectural decisions and core abstractions** - Get the foundation right
2. **Integration points between modules** - Ensure components connect properly
3. **Unknown unknowns and spike work** - De-risk early
4. **Standard features and implementation** - Build on solid foundations
5. **Polish, cleanup, and quick wins** - Save easy wins for later

**Fail fast on risky work. Save easy wins for later.**

## Code Quality Standards

### Write Concise Code
After writing any code file, ask yourself: *"Would a senior engineer say this is overcomplicated?"*

If yes, **simplify**.

### Avoid Over-Engineering
- Only make changes that are directly requested or clearly necessary
- Don't add features beyond what was asked
- Don't refactor code that doesn't need it
- A bug fix doesn't need surrounding code cleaned up
- A simple feature doesn't need extra configurability
- The best code is the code you don't write. The second best is the code that's obviously correct
- The best change is the change you didn't make
- Do not add low impact tests

### Clean Code Practices
- Don't fill files just for the sake of it
- Don't leave dead code - if it's unused, delete it completely
- Be organized, concise, and clean in your work
- No backwards-compatibility hacks for removed code
- No `// removed` comments or re-exports for deleted items

### Task Decomposition
- Use micro tasks - smaller the task, better the code
- Break complex work into discrete, testable units
- Each micro task should be completable in one focused session

## Legacy and Technical Debt

This codebase will outlive you. Every shortcut you take becomes someone else's burden. Every hack compounds into technical debt that slows the whole team down.

You are not just writing code. You are shaping the future of this project. The patterns you establish will be copied. The corners you cut will be cut again.

**Fight entropy. Leave the codebase better than you found it.**

## Project-Specific Rules

### Tech Stack
- App framework: Next.js (App Router)
- Runtime/tooling: Bun and Node.js
- Language: TypeScript (strict mode)
- Database: Postgres with Drizzle ORM
- Auth: Better Auth
- Styling/UI: Tailwind + component primitives in `app/components`

### Directory Structure
```
app/
├── app/            # Next.js routes (customer + portal + API)
├── components/     # Shared UI components
├── lib/            # Domain logic, db, portal helpers
├── data/           # Seed/reference JSON
├── scripts/        # Local scripts (seed, db helpers)
├── docs/           # Supporting docs
└── tests/          # Test helpers and suites
```

### Code Standards
- Follow existing file style (do not force tabs/spaces across unrelated files)
- Prefer LF line endings
- Keep imports organized and avoid unused code

### Boundaries - Never Modify
- `.ralphy/progress.txt`
- `.ralphy-worktrees`
- `.ralphy-sandboxes`
- `*.lock` files

### Testing
- Write tests for new features
- Run tests before committing: `bun run test`
- Ensure linting passes: `bun run lint`
- Ensure app still builds: `bun run build`

## Commit Guidelines

1. One logical change per commit
2. Write descriptive commit messages
3. Commit message format: `type: brief description`
   - `feat:` new feature
   - `fix:` bug fix
   - `refactor:` code restructuring
   - `docs:` documentation
   - `test:` test additions/changes
   - `chore:` maintenance tasks
