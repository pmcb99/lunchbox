import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { 
  Search, 
  Menu, 
  X, 
  ChevronRight,
  Copy,
  Check,
  ExternalLink,
  Database,
  Terminal,
  Settings,
  Cloud,
  Code,
  Shield,
  Zap
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

gsap.registerPlugin(ScrollTrigger);

interface NavItem {
  title: string;
  href: string;
  icon?: React.ElementType;
  children?: NavItem[];
}

const navigation: NavItem[] = [
  {
    title: 'Getting Started',
    href: '#getting-started',
    icon: Zap,
    children: [
      { title: 'Quick Start', href: '#quick-start' },
      { title: 'Installation', href: '#installation' },
      { title: 'Configuration', href: '#configuration' },
    ],
  },
  {
    title: 'Core Concepts',
    href: '#core-concepts',
    icon: Database,
    children: [
      { title: 'Revisions', href: '#revisions' },
      { title: 'Head & Pointers', href: '#head-pointers' },
      { title: 'WAL-aware Sync', href: '#wal-aware' },
      { title: 'Content Deduplication', href: '#content-dedupe' },
    ],
  },
  {
    title: 'Sync Operations',
    href: '#sync-operations',
    icon: Cloud,
    children: [
      { title: 'SQLite', href: '#sqlite' },
      { title: 'PostgreSQL', href: '#postgresql' },
      { title: 'Dry Run', href: '#dry-run' },
    ],
  },
  {
    title: 'Restore Operations',
    href: '#restore-operations',
    icon: Terminal,
    children: [
      { title: 'List Revisions', href: '#list-revisions' },
      { title: 'Restore to File', href: '#restore-file' },
      { title: 'Restore to Postgres', href: '#restore-postgres' },
      { title: 'Point-in-time Recovery', href: '#pitr' },
    ],
  },
  {
    title: 'CI/CD Integration',
    href: '#cicd',
    icon: Code,
    children: [
      { title: 'GitHub Actions', href: '#github-actions' },
      { title: 'Pre-deploy Hooks', href: '#pre-deploy' },
    ],
  },
  {
    title: 'Self-Hosting',
    href: '#self-hosting',
    icon: Settings,
    children: [
      { title: 'Requirements', href: '#requirements' },
      { title: 'Docker Compose', href: '#docker-compose' },
      { title: 'Configuration', href: '#config-reference' },
      { title: 'Initial Setup', href: '#initial-setup' },
    ],
  },
  {
    title: 'API Reference',
    href: '#api-reference',
    icon: Shield,
    children: [
      { title: 'Authentication', href: '#auth' },
      { title: 'Sync (Upload)', href: '#api-sync' },
      { title: 'Restore (Download)', href: '#api-restore' },
      { title: 'List Revisions', href: '#api-list' },
      { title: 'Delete Revision', href: '#api-delete' },
    ],
  },
];

function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-6">
      <div className="absolute -inset-px bg-gradient-to-r from-[#ff6b35]/20 to-[#ff6b35]/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#2a2a2a] bg-[#111111]">
          <span className="text-xs text-[#666] uppercase">{language}</span>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md hover:bg-white/10 transition-colors duration-200"
          >
            {copied ? (
              <Check className="w-4 h-4 text-[#4ade80]" />
            ) : (
              <Copy className="w-4 h-4 text-[#666]" />
            )}
          </button>
        </div>
        <pre className="p-4 overflow-x-auto">
          <code className="text-sm font-mono text-[#a0a0a0]">
            {code.split('\n').map((line, i) => (
              <div key={i} className="leading-relaxed">
                {line.startsWith('#') ? (
                  <span className="text-[#666]">{line}</span>
                ) : line.startsWith('$') ? (
                  <>
                    <span className="text-[#ff6b35]">$</span>
                    <span className="text-white">{line.slice(1)}</span>
                  </>
                ) : (
                  <span className="text-[#a0a0a0]">{line}</span>
                )}
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}

function DocSection({ 
  id, 
  title, 
  children, 
  description 
}: { 
  id: string; 
  title: string; 
  children: React.ReactNode;
  description?: string;
}) {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        sectionRef.current,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={sectionRef} id={id} className="mb-16 scroll-mt-24">
      <h2 className="text-2xl lg:text-3xl font-display font-semibold text-white mb-3">
        {title}
      </h2>
      {description && (
        <p className="text-[#a0a0a0] text-lg mb-6 leading-relaxed">
          {description}
        </p>
      )}
      <div className="prose prose-invert prose-lg max-w-none">
        {children}
      </div>
      <Separator className="mt-12 bg-[#2a2a2a]" />
    </div>
  );
}

export function DocsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('');
  const mainRef = useRef<HTMLDivElement>(null);

  // Track active section on scroll
  useEffect(() => {
    const sections = document.querySelectorAll('[id]');
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -80% 0px' }
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  const filteredNav = navigation.map((item) => ({
    ...item,
    children: item.children?.filter((child) =>
      child.title.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((item) => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.children && item.children.length > 0)
  );

  return (
    <div className="min-h-screen bg-black pt-20">
      {/* Mobile Sidebar Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-50 w-12 h-12 bg-[#ff6b35] rounded-full flex items-center justify-center shadow-lg"
      >
        {sidebarOpen ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
      </button>

      <div className="max-w-[1600px] mx-auto">
        <div className="flex">
          {/* Sidebar */}
          <aside
            className={`fixed lg:sticky top-20 left-0 z-40 w-72 h-[calc(100vh-80px)] bg-black/95 lg:bg-black border-r border-[#2a2a2a] transform transition-transform duration-300 lg:transform-none ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            }`}
          >
            <ScrollArea className="h-full">
              <div className="p-6">
                {/* Search */}
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
                  <Input
                    type="text"
                    placeholder="Search documentation..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-[#111111] border-[#2a2a2a] text-white placeholder:text-[#666] focus:border-[#ff6b35]/50"
                  />
                </div>

                {/* Navigation */}
                <nav className="space-y-1">
                  {filteredNav.map((item) => (
                    <div key={item.href} className="mb-4">
                      <a
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                          activeSection === item.href.slice(1)
                            ? 'bg-[#ff6b35]/10 text-[#ff6b35]'
                            : 'text-[#a0a0a0] hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {item.icon && <item.icon className="w-4 h-4" />}
                        {item.title}
                      </a>
                      {item.children && item.children.length > 0 && (
                        <div className="ml-4 mt-1 space-y-1">
                          {item.children.map((child) => (
                            <a
                              key={child.href}
                              href={child.href}
                              onClick={() => setSidebarOpen(false)}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors duration-200 ${
                                activeSection === child.href.slice(1)
                                  ? 'text-[#ff6b35]'
                                  : 'text-[#666] hover:text-[#a0a0a0]'
                              }`}
                            >
                              <ChevronRight className="w-3 h-3" />
                              {child.title}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </nav>
              </div>
            </ScrollArea>
          </aside>

          {/* Main Content */}
          <main ref={mainRef} className="flex-1 min-w-0">
            <div className="max-w-4xl mx-auto px-6 py-12 lg:py-16">
              {/* Page Header */}
              <div className="mb-12">
                <div className="flex items-center gap-2 text-sm text-[#666] mb-4">
                  <span>Documentation</span>
                  <ChevronRight className="w-4 h-4" />
                  <span className="text-[#a0a0a0]">Getting Started</span>
                </div>
                <h1 className="text-4xl lg:text-5xl font-display font-semibold text-white mb-4">
                  Lunchbox Documentation
                </h1>
                <p className="text-xl text-[#a0a0a0] leading-relaxed">
                  Database version control for teams. Immutable, content-addressed backups with one-command sync and instant restore.
                </p>
              </div>

              {/* Quick Start */}
              <DocSection 
                id="quick-start" 
                title="Quick Start (30 seconds)"
                description="Get up and running with Lunchbox in under a minute."
              >
                <CodeBlock 
                  code={`# 1. Install
$ pipx install lunchbox

# 2. Configure (once)
$ echo "LUNCHBOX_API_KEY=lbk_live_xxx" > .env

# 3. Sync
$ lunchbox sync ./mydatabase.db`} 
                />
                <p className="text-[#a0a0a0] mt-4">
                  Done. Your database is now versioned at <code className="bg-[#1a1a1a] px-2 py-0.5 rounded text-sm">lunchbox.dev</code> → <strong>Databases</strong> → <strong>mydatabase.db</strong>.
                </p>
              </DocSection>

              {/* Installation */}
              <DocSection 
                id="installation" 
                title="Installation"
                description="Install Lunchbox on macOS, Linux, or Windows."
              >
                <h3 className="text-xl font-display font-medium text-white mb-4">macOS / Linux</h3>
                <CodeBlock 
                  code={`$ pipx install lunchbox
# or
$ pip install lunchbox`} 
                />
                
                <h3 className="text-xl font-display font-medium text-white mb-4 mt-8">Verify Installation</h3>
                <CodeBlock code={`$ lunchbox --version  # 0.8.x`} />
              </DocSection>

              {/* Configuration */}
              <DocSection 
                id="configuration" 
                title="Configuration"
                description="Lunchbox uses environment variables (auto-loaded from .env)."
              >
                <CodeBlock 
                  language="env"
                  code={`# Required
LUNCHBOX_API_KEY=lbk_live_xxxxxxxxxxxxxxxxx

# Optional
LUNCHBOX_URL=https://lunchbox.dev           # For self-hosted
LUNCHBOX_TIMEOUT_SECONDS=1200              # Large DBs
LUNCHBOX_COMPRESS_GZIP=true                # Network optimization
LUNCHBOX_TEMP_DIR=./.lunchbox/tmp          # Snapshot staging
LUNCHBOX_PARALLEL_UPLOADS=4                # Upload concurrency

# Postgres only
DATABASE_URL=postgresql://user:pass@host:5432/dbname
# or piecemeal:
PGHOST=127.0.0.1
PGPORT=5432
PGUSER=postgres
PGPASSWORD=secret
PGDATABASE=production`} 
                />

                <h3 className="text-xl font-display font-medium text-white mb-4 mt-8">Multiple Environments</h3>
                <CodeBlock 
                  code={`# Production
$ lunchbox sync --env .env.production

# Staging  
$ lunchbox sync --env .env.staging`} 
                />
              </DocSection>

              {/* Core Concepts */}
              <DocSection 
                id="core-concepts" 
                title="Core Concepts"
                description="Lunchbox treats databases like Git repositories."
              >
                <div className="grid sm:grid-cols-2 gap-6 mt-6">
                  <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
                    <h4 id="revisions" className="text-lg font-display font-medium text-white mb-2">
                      Revisions
                    </h4>
                    <p className="text-[#a0a0a0] text-sm">
                      Immutable snapshots (content-addressed by BLAKE3 hash)
                    </p>
                  </div>
                  <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
                    <h4 id="head-pointers" className="text-lg font-display font-medium text-white mb-2">
                      Head
                    </h4>
                    <p className="text-[#a0a0a0] text-sm">
                      Pointer to latest revision per database
                    </p>
                  </div>
                  <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
                    <h4 id="wal-aware" className="text-lg font-display font-medium text-white mb-2">
                      WAL-aware
                    </h4>
                    <p className="text-[#a0a0a0] text-sm">
                      SQLite incremental syncs via WAL shipping
                    </p>
                  </div>
                  <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
                    <h4 id="content-dedupe" className="text-lg font-display font-medium text-white mb-2">
                      Content Deduplication
                    </h4>
                    <p className="text-[#a0a0a0] text-sm">
                      Identical blocks shared across revisions server-side
                    </p>
                  </div>
                </div>
              </DocSection>

              {/* Sync Operations */}
              <DocSection 
                id="sync-operations" 
                title="Sync Operations"
                description="Backup your databases with a single command."
              >
                <h3 id="sqlite" className="text-xl font-display font-medium text-white mb-4">SQLite</h3>
                <CodeBlock 
                  code={`# Basic (auto-detects WAL mode)
$ lunchbox sync ./app.db

# With explicit name override
$ lunchbox sync ./data/app.db --name "production-app-v2"`} 
                />
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 mt-4">
                  <p className="text-sm text-[#a0a0a0]">
                    <strong className="text-white">WAL Handling:</strong> Automatically includes <code className="bg-black px-1.5 py-0.5 rounded">app.db-wal</code> and <code className="bg-black px-1.5 py-0.5 rounded">app.db-shm</code> if present. Takes atomic snapshot using SQLite Backup API (no locks on read).
                  </p>
                </div>

                <h3 id="postgresql" className="text-xl font-display font-medium text-white mb-4 mt-8">PostgreSQL</h3>
                <CodeBlock 
                  code={`# Requires DATABASE_URL in .env
$ lunchbox sync

# Specific schema only
$ lunchbox sync --schema public --schema analytics`} 
                />
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 mt-4">
                  <p className="text-sm text-[#a0a0a0]">
                    <strong className="text-white">Implementation:</strong> Uses <code className="bg-black px-1.5 py-0.5 rounded">pg_dump</code> (custom format) → streams to Lunchbox. Consistent snapshot via <code className="bg-black px-1.5 py-0.5 rounded">REPEATABLE READ</code> transaction.
                  </p>
                </div>

                <h3 id="dry-run" className="text-xl font-display font-medium text-white mb-4 mt-8">Dry Run</h3>
                <CodeBlock 
                  code={`$ lunchbox sync --dry-run  # Shows what would upload, no data sent`} 
                />
              </DocSection>

              {/* Restore Operations */}
              <DocSection 
                id="restore-operations" 
                title="Restore Operations"
                description="Restore is the inverse of sync—pull any revision to local disk or directly to a running Postgres instance."
              >
                <h3 id="list-revisions" className="text-xl font-display font-medium text-white mb-4">List Available Revisions</h3>
                <CodeBlock 
                  code={`# SQLite
$ lunchbox revisions ./app.db

# Postgres  
$ lunchbox revisions --db production-db`} 
                />
                <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4 mt-4 font-mono text-sm">
                  <div className="text-[#666] mb-2">REVISION    TIMESTAMP           SIZE      CHECKSUM</div>
                  <div className="text-[#a0a0a0]">rev_abc123  2026-02-02 10:00    45MB      b3a2f1...</div>
                  <div className="text-white">rev_def456  2026-02-02 09:00    44MB      c8d9e2...  (latest)</div>
                </div>

                <h3 id="restore-file" className="text-xl font-display font-medium text-white mb-4 mt-8">Restore to File (SQLite)</h3>
                <CodeBlock 
                  code={`# Latest
$ lunchbox restore ./app.db --output ./app-restored.db

# Specific revision
$ lunchbox restore ./app.db --rev rev_abc123 --output ./app-yesterday.db

# In-place (destructive—backs up current first)
$ lunchbox restore ./app.db --in-place --rev rev_abc123`} 
                />

                <h3 id="restore-postgres" className="text-xl font-display font-medium text-white mb-4 mt-8">Restore to Postgres</h3>
                <CodeBlock 
                  code={`# Restore to new database
$ lunchbox restore production-db --target-db postgresql://localhost/restored_db

# Restore in-place (drops & recreates)
$ lunchbox restore production-db --in-place --rev rev_abc123

# Restore to existing (merge schema—risky, warns)
$ lunchbox restore production-db --into-existing --schema-only`} 
                />

                <h3 id="pitr" className="text-xl font-display font-medium text-white mb-4 mt-8">Point-in-Time Recovery (Postgres)</h3>
                <p className="text-[#a0a0a0] mb-4">
                  When using continuous WAL archiving (enterprise feature):
                </p>
                <CodeBlock 
                  code={`$ lunchbox restore production-db --timestamp "2026-02-02 09:30:00"`} 
                />
              </DocSection>

              {/* CI/CD */}
              <DocSection 
                id="cicd" 
                title="CI/CD Integration"
                description="Integrate Lunchbox into your deployment pipeline."
              >
                <h3 id="github-actions" className="text-xl font-display font-medium text-white mb-4">GitHub Actions</h3>
                <CodeBlock 
                  language="yaml"
                  code={`- name: Backup DB before migration
  uses: lunchbox-dev/action@v1
  with:
    api-key: \${{ secrets.LUNCHBOX_API_KEY }}
    database: postgresql://localhost/app
    name: "pre-migration-\${{ github.sha }}"

- name: Run migrations
  run: alembic upgrade head

- name: Sync post-migration state
  run: lunchbox sync
  env:
    LUNCHBOX_API_KEY: \${{ secrets.LUNCHBOX_API_KEY }}`} 
                />

                <h3 id="pre-deploy" className="text-xl font-display font-medium text-white mb-4 mt-8">Pre-deploy Hooks</h3>
                <CodeBlock 
                  code={`#!/bin/bash
# deploy.sh
lunchbox sync --name "release-$(git describe --tags)"
# ... deploy code ...`} 
                />
              </DocSection>

              {/* Self-Hosting */}
              <DocSection 
                id="self-hosting" 
                title="Self-Hosting"
                description="Deploy your own Lunchbox instance for air-gapped or compliance requirements."
              >
                <h3 id="requirements" className="text-xl font-display font-medium text-white mb-4">Requirements</h3>
                <ul className="list-disc list-inside text-[#a0a0a0] space-y-2 mb-6">
                  <li>Docker 24+</li>
                  <li>S3-compatible storage (MinIO, AWS S3, GCS)</li>
                  <li>Postgres 15+ (for metadata)</li>
                  <li>Redis 7+ (for job queues)</li>
                </ul>

                <h3 id="docker-compose" className="text-xl font-display font-medium text-white mb-4">Docker Compose</h3>
                <CodeBlock 
                  language="yaml"
                  code={`version: '3.8'
services:
  lunchbox:
    image: lunchbox/lunchbox:v0.8.0
    ports:
      - "8080:8080"
    environment:
      DATABASE_URL: postgresql://lunchbox:secret@postgres:5432/lunchbox
      STORAGE_TYPE: s3
      S3_ENDPOINT: http://minio:9000
      S3_BUCKET: lunchbox-backups
      S3_ACCESS_KEY: minioadmin
      S3_SECRET_KEY: minioadmin
      JWT_SECRET: your-random-secret-here
      API_KEY_SALT: another-random-string
      ENABLE_GZIP: "true"
      MAX_UPLOAD_SIZE: 50GB
    depends_on:
      - postgres
      - redis
      - minio

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: lunchbox
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: lunchbox

  redis:
    image: redis:7-alpine

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin`} 
                />

                <h3 id="config-reference" className="text-xl font-display font-medium text-white mb-4 mt-8">Configuration Reference</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#2a2a2a]">
                        <th className="text-left py-3 px-4 text-white font-medium">Variable</th>
                        <th className="text-left py-3 px-4 text-white font-medium">Description</th>
                        <th className="text-left py-3 px-4 text-white font-medium">Default</th>
                      </tr>
                    </thead>
                    <tbody className="text-[#a0a0a0]">
                      <tr className="border-b border-[#2a2a2a]/50">
                        <td className="py-3 px-4 font-mono text-[#ff6b35]">PORT</td>
                        <td className="py-3 px-4">HTTP server port</td>
                        <td className="py-3 px-4 font-mono">8080</td>
                      </tr>
                      <tr className="border-b border-[#2a2a2a]/50">
                        <td className="py-3 px-4 font-mono text-[#ff6b35]">DATABASE_URL</td>
                        <td className="py-3 px-4">Postgres connection</td>
                        <td className="py-3 px-4">Required</td>
                      </tr>
                      <tr className="border-b border-[#2a2a2a]/50">
                        <td className="py-3 px-4 font-mono text-[#ff6b35]">STORAGE_TYPE</td>
                        <td className="py-3 px-4">s3, gcs, azure, local</td>
                        <td className="py-3 px-4 font-mono">local</td>
                      </tr>
                      <tr className="border-b border-[#2a2a2a]/50">
                        <td className="py-3 px-4 font-mono text-[#ff6b35]">MAX_REVISIONS_PER_DB</td>
                        <td className="py-3 px-4">Retention limit</td>
                        <td className="py-3 px-4 font-mono">0 (unlimited)</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-mono text-[#ff6b35]">ENCRYPTION_KEY</td>
                        <td className="py-3 px-4">AES-256 master key</td>
                        <td className="py-3 px-4">Generate random</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h3 id="initial-setup" className="text-xl font-display font-medium text-white mb-4 mt-8">Initial Setup</h3>
                <CodeBlock 
                  code={`# 1. Start infrastructure
$ docker-compose up -d postgres redis minio

# 2. Run migrations
$ docker-compose run --rm lunchbox migrate

# 3. Create admin user
$ docker-compose run --rm lunchbox create-user --admin admin@example.com

# 4. Start platform
$ docker-compose up -d lunchbox`} 
                />
                <p className="text-[#a0a0a0] mt-4">
                  Access at <code className="bg-[#1a1a1a] px-2 py-0.5 rounded text-sm">http://localhost:8080</code>. First login with the admin credentials created in step 3.
                </p>
              </DocSection>

              {/* API Reference */}
              <DocSection 
                id="api-reference" 
                title="API Reference"
                description="RESTful API for programmatic access."
              >
                <h3 id="auth" className="text-xl font-display font-medium text-white mb-4">Authentication</h3>
                <p className="text-[#a0a0a0] mb-4">
                  All requests require <code className="bg-[#1a1a1a] px-2 py-0.5 rounded text-sm">Authorization: Bearer lbk_live_xxx</code> header.
                </p>

                <h3 id="api-sync" className="text-xl font-display font-medium text-white mb-4 mt-8">Sync (Upload)</h3>
                <CodeBlock 
                  language="http"
                  code={`POST /api/v1/databases/{db_name}/revisions
Content-Type: multipart/form-data
Authorization: Bearer lbk_live_xxx

# SQLite: upload .db file + optional .db-wal
# Postgres: triggers server-side pg_dump`} 
                />

                <h3 id="api-restore" className="text-xl font-display font-medium text-white mb-4 mt-8">Restore (Download)</h3>
                <CodeBlock 
                  language="http"
                  code={`GET /api/v1/databases/{db_name}/revisions/{rev_id}/download
Authorization: Bearer lbk_live_xxx

# Returns: application/octet-stream`} 
                />

                <h3 id="api-list" className="text-xl font-display font-medium text-white mb-4 mt-8">List Revisions</h3>
                <CodeBlock 
                  language="http"
                  code={`GET /api/v1/databases/{db_name}/revisions
Authorization: Bearer lbk_live_xxx`} 
                />
                <CodeBlock 
                  language="json"
                  code={`{
  "database": "app.db",
  "head": "rev_def456",
  "revisions": [
    {
      "id": "rev_def456",
      "created_at": "2026-02-02T09:00:00Z",
      "size_bytes": 46137344,
      "checksum": "b3a2f1...",
      "metadata": {"source": "cli", "host": "server-01"}
    }
  ]
}`} 
                />

                <h3 id="api-delete" className="text-xl font-display font-medium text-white mb-4 mt-8">Delete Revision</h3>
                <CodeBlock 
                  language="http"
                  code={`DELETE /api/v1/databases/{db_name}/revisions/{rev_id}
Authorization: Bearer lbk_live_xxx

# Soft delete (archived for 30 days, then purged)`} 
                />
              </DocSection>

              {/* Footer */}
              <div className="mt-16 pt-8 border-t border-[#2a2a2a]">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-[#666] text-sm">
                    Need help? Join our{' '}
                    <a href="#" className="text-[#ff6b35] hover:underline">Discord</a>
                    {' '}or email{' '}
                    <a href="mailto:support@lunchbox.dev" className="text-[#ff6b35] hover:underline">support@lunchbox.dev</a>
                  </p>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[#a0a0a0] hover:text-white transition-colors duration-200"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Edit this page on GitHub
                  </a>
                </div>
              </div>
            </div>
          </main>

          {/* Right Sidebar - On This Page */}
          <aside className="hidden xl:block w-64 sticky top-24 h-[calc(100vh-96px)]">
            <ScrollArea className="h-full">
              <div className="p-6">
                <h4 className="text-sm font-medium text-[#666] mb-4 uppercase tracking-wider">
                  On This Page
                </h4>
                <nav className="space-y-2">
                  {navigation.flatMap(item => [
                    { title: item.title, href: item.href, level: 0 },
                    ...(item.children?.map(child => ({ ...child, level: 1 })) || [])
                  ]).map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      className={`block text-sm transition-colors duration-200 ${
                        activeSection === item.href.slice(1)
                          ? 'text-[#ff6b35]'
                          : 'text-[#666] hover:text-[#a0a0a0]'
                      } ${item.level === 1 ? 'pl-4' : ''}`}
                    >
                      {item.title}
                    </a>
                  ))}
                </nav>
              </div>
            </ScrollArea>
          </aside>
        </div>
      </div>
    </div>
  );
}
