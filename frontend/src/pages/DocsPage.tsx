import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Search,
  Menu,
  X,
  ChevronRight,
  Copy,
  Check,
  Settings,
  RefreshCw,
  Shield,
  Zap,
  Server,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface NavItem {
  title: string;
  href: string;
  icon?: React.ElementType;
  children?: NavItem[];
}

const navigation: NavItem[] = [
  {
    title: 'Quick start',
    href: '#quick-start',
    icon: Zap,
    children: [
      { title: 'Installation', href: '#installation' },
      { title: 'Commands', href: '#commands' },
    ],
  },
  {
    title: 'Security',
    href: '#security',
    icon: Shield,
    children: [
      { title: 'Transport security', href: '#transport-security' },
      { title: 'Payload encryption', href: '#payload-encryption' },
      { title: 'Integrity and secrets', href: '#integrity-secrets' },
    ],
  },
  {
    title: 'Architecture',
    href: '#architecture',
    icon: Server,
    children: [
      { title: 'CLI', href: '#cli-responsibilities' },
      { title: 'Server', href: '#server-responsibilities' },
      { title: 'Local state', href: '#state-model' },
    ],
  },
  {
    title: 'Sync flow',
    href: '#sync-flow',
    icon: RefreshCw,
    children: [
      { title: 'Registration', href: '#registration' },
      { title: 'Snapshot backup', href: '#snapshot-backup' },
      { title: 'Continuous sync', href: '#continuous-sync' },
      { title: 'Restore', href: '#restore-flow' },
    ],
  },
  {
    title: 'Reference',
    href: '#reference',
    icon: Settings,
    children: [
      { title: 'v1 scope', href: '#v1-scope' },
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
  description,
}: {
  id: string;
  title: string;
  children: ReactNode;
  description?: string;
}) {
  const sectionRef = useRef<HTMLDivElement>(null);

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

  const handleAnchorClick = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.includes('#')) return;

    const [, hash] = href.split('#');
    const targetId = hash || '';

    if (!targetId) return;

    const element = document.getElementById(targetId);
    if (element) {
      event.preventDefault();
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (window.location.hash !== `#${targetId}`) {
        history.replaceState(null, '', `#${targetId}`);
      }
      setSidebarOpen(false);
    }
  };

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

  const filteredNav = navigation
    .map((item) => ({
      ...item,
      children: item.children?.filter((child) =>
        child.title.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter(
      (item) =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.children && item.children.length > 0)
    );

  return (
    <div className="min-h-screen bg-black pt-20">
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-50 w-12 h-12 bg-[#ff6b35] rounded-full flex items-center justify-center shadow-lg"
      >
        {sidebarOpen ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
      </button>

      <div className="max-w-[1600px] mx-auto">
        <div className="flex">
          <aside
            className={`fixed lg:sticky top-20 left-0 z-40 w-72 h-[calc(100vh-80px)] bg-black/95 lg:bg-black border-r border-[#2a2a2a] transform transition-transform duration-300 lg:transform-none ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            }`}
          >
            <ScrollArea className="h-full">
              <div className="p-6">
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

                <nav className="space-y-1">
                  {filteredNav.map((item) => (
                    <div key={item.href} className="mb-4">
                      <a
                        href={item.href}
                        onClick={(event) => handleAnchorClick(event, item.href)}
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
                              onClick={(event) => handleAnchorClick(event, child.href)}
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

          <main ref={mainRef} className="flex-1 min-w-0">
            <div className="max-w-4xl mx-auto px-6 py-12 lg:py-16">
              <div className="mb-12">
                <div className="flex items-center gap-2 text-sm text-[#666] mb-4">
                  <span>Documentation</span>
                  <ChevronRight className="w-4 h-4" />
                  <span className="text-[#a0a0a0]">v1.0</span>
                </div>
                <h1 className="text-4xl lg:text-5xl font-display font-semibold text-white mb-4">
                  Lunchbox Documentation
                </h1>
                <p className="text-xl text-[#a0a0a0] leading-relaxed">
                  Lunchbox is a CLI tool for backing up SQLite databases — encrypted, resumable, and
                  restorable with a single command.
                </p>
                <CodeBlock code={`$ lunchbox sync ~/mydb.sqlite`} />
              </div>

              <DocSection
                id="quick-start"
                title="Quick start"
                description="Get a SQLite database backed up and syncing in under a minute."
              >
                <h3 id="installation" className="text-xl font-display font-medium text-white mb-4">Installation</h3>
                <p className="text-[#a0a0a0] mb-2">Using the install script (macOS / Linux):</p>
                <CodeBlock
                  code={`$ curl -sSL https://raw.githubusercontent.com/pmcb99/lunchbox/main/install.sh | bash`}
                />
                <p className="text-[#a0a0a0] mb-2">Homebrew:</p>
                <CodeBlock
                  code={`$ brew install lunchbox`}
                />
                <p className="text-[#a0a0a0] mb-2">
                  Or download a binary directly from the{' '}
                  <a
                    href="https://github.com/pmcb99/lunchbox/releases"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#ff6b35] hover:underline"
                  >
                    releases page
                  </a>
                  .
                </p>

                <h3 id="commands" className="text-xl font-display font-medium text-white mb-4 mt-8">Commands</h3>
                <CodeBlock
                  code={`# Authenticate with your API key
$ lunchbox login --api-key lb_live_xxx

# Register a database and start syncing
$ lunchbox sync ~/mydb.sqlite

# Take a one-shot backup
$ lunchbox backup ~/mydb.sqlite

# Restore a database to a local file
$ lunchbox restore <db-id> --output ~/restored.sqlite

# Check sync status
$ lunchbox status ~/mydb.sqlite

# List all registered databases
$ lunchbox list

# Stop syncing a database
$ lunchbox unlink ~/mydb.sqlite`}
                />
              </DocSection>

              <DocSection
                id="security"
                title="Security"
                description="Lunchbox encrypts your data before it leaves your machine, with hybrid post-quantum key exchange protecting long-lived backups."
              >
                <h3 id="transport-security" className="text-xl font-display font-medium text-white mb-4">Transport security</h3>
                <p className="text-[#a0a0a0] mb-6">
                  All connections use TLS 1.3. Post-quantum hybrid key exchange is negotiated
                  automatically where the Go TLS stack supports it — no configuration required.
                </p>

                <h3 id="payload-encryption" className="text-xl font-display font-medium text-white mb-4">Payload encryption</h3>
                <p className="text-[#a0a0a0] mb-4">
                  Snapshots and incremental chunks are compressed and encrypted client-side before
                  upload. Session keys are established using a hybrid post-quantum key exchange{' '}
                  <span className="text-[#ff6b35] font-semibold">X25519+Kyber768</span>, so even if
                  classical public-key algorithms are broken in future, previously captured
                  ciphertext remains protected. The server receives and stores only ciphertext — it
                  never has access to your plaintext data or encryption keys.
                </p>
                <CodeBlock
                  code={`# Authenticate once — credentials are stored locally with restricted permissions
$ lunchbox login --api-key lb_live_xxx

# All data is encrypted before it leaves your machine
$ lunchbox sync ~/mydb.sqlite`}
                />

                <h3 id="integrity-secrets" className="text-xl font-display font-medium text-white mb-4">Integrity and secrets</h3>
                <p className="text-[#a0a0a0] mb-4">
                  Every snapshot and chunk carries a content hash, key ID, nonce, generation ID,
                  and sequence number. Chunk lineage is validated on the server at ingest — out-of-order
                  or tampered uploads are rejected. Credentials, device identity, and encryption
                  material are stored locally with restrictive file permissions.
                </p>
              </DocSection>

              <DocSection
                id="architecture"
                title="Architecture"
                description="Lunchbox separates local database work from backup coordination so developers can keep control of their data while using a managed or self-hosted backup service."
              >
                <h3 id="cli-responsibilities" className="text-xl font-display font-medium text-white mb-4">CLI responsibilities</h3>
                <div className="grid sm:grid-cols-2 gap-6 mt-6">
                  <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
                    <h4 className="text-lg font-display font-medium text-white mb-2">Inspection</h4>
                    <p className="text-[#a0a0a0] text-sm">
                      SQLite validation, path handling, and WAL-mode checks happen on the client before sync continues.
                    </p>
                  </div>
                  <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
                    <h4 className="text-lg font-display font-medium text-white mb-2">Replication</h4>
                    <p className="text-[#a0a0a0] text-sm">
                      The CLI creates consistent snapshots, captures incrementals, persists local resumable state, and uploads encrypted payloads.
                    </p>
                  </div>
                </div>

                <h3 id="server-responsibilities" className="text-xl font-display font-medium text-white mb-4 mt-8">Server responsibilities</h3>
                <div className="grid sm:grid-cols-2 gap-6 mt-6">
                  <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
                    <h4 className="text-lg font-display font-medium text-white mb-2">Catalog and ingest</h4>
                    <p className="text-[#a0a0a0] text-sm">
                      The server owns auth, database registration, metadata in Postgres, object storage orchestration, chunk lineage validation, and audit events.
                    </p>
                  </div>
                  <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
                    <h4 className="text-lg font-display font-medium text-white mb-2">Restore planning</h4>
                    <p className="text-[#a0a0a0] text-sm">
                      Restore manifests, retention metadata, and restore-point planning belong to the server so the platform and CLI can reason over the same history.
                    </p>
                  </div>
                </div>

                <h3 id="state-model" className="text-xl font-display font-medium text-white mb-4 mt-8">State model</h3>
                <CodeBlock
                  language="json"
                  code={`{
  "db_id": "db_123",
  "path": "/Users/paul/mydb.sqlite",
  "generation": "gen_abc",
  "last_uploaded_seq": 10293,
  "last_snapshot_id": "snap_789",
  "encryption_key_id": "key_1",
  "device_id": "dev_123"
}`}
                />
              </DocSection>

              <DocSection
                id="sync-flow"
                title="Sync flow"
                description="A sync validates your database locally, establishes a consistent baseline snapshot, then keeps subsequent changes protected in the background."
              >
                <h3 id="registration" className="text-xl font-display font-medium text-white mb-4">Registration</h3>
                <p className="text-[#a0a0a0] mb-6">
                  On first sync, Lunchbox validates the SQLite file, enables WAL mode if needed,
                  and registers the database with the server. This happens automatically — you
                  only need to run <code className="bg-[#1a1a1a] px-2 py-0.5 rounded text-sm">lunchbox sync</code>.
                </p>

                <h3 id="snapshot-backup" className="text-xl font-display font-medium text-white mb-4">Snapshot backup</h3>
                <p className="text-[#a0a0a0] mb-4">
                  Lunchbox takes a consistent snapshot of the database, compresses and encrypts it
                  client-side, and uploads it to your configured object storage. Each restore is
                  automatically validated against the original data.
                </p>
                <CodeBlock
                  code={`# One-shot snapshot backup
$ lunchbox backup ~/mydb.sqlite

# Restore to a local file
$ lunchbox restore db_123 --output ~/restored.sqlite`}
                />

                <h3 id="continuous-sync" className="text-xl font-display font-medium text-white mb-4 mt-8">Continuous sync</h3>
                <p className="text-[#a0a0a0] mb-6">
                  Continuous sync tracks WAL changes, uploads ordered encrypted chunks, and
                  persists local state so sync resumes automatically after interruption or restart.
                  No data is lost between sessions.
                </p>

                <h3 id="restore-flow" className="text-xl font-display font-medium text-white mb-4">Restore</h3>
                <p className="text-[#a0a0a0] mb-4">
                  Restore writes to a local SQLite file and refuses to overwrite an existing file
                  by default. Pass <code className="bg-[#1a1a1a] px-2 py-0.5 rounded text-sm">--force</code> to
                  overwrite. The restored file is byte-for-byte consistent with the backed-up state.
                </p>
              </DocSection>

              <DocSection
                id="reference"
                title="Reference"
                description="What Lunchbox v1 covers and what's planned for later."
              >
                <h3 id="v1-scope" className="text-xl font-display font-medium text-white mb-4">v1 scope</h3>
                <div className="grid sm:grid-cols-2 gap-6 mt-6">
                  <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
                    <h4 className="text-lg font-display font-medium text-white mb-2">Included in v1</h4>
                    <p className="text-[#a0a0a0] text-sm">
                      Go CLI, Go server, API key auth, SQLite registration and validation, one-shot backup, continuous sync, restore, resumable sync state, client-side encryption, S3-compatible blob storage, retention metadata, and observability.
                    </p>
                  </div>
                  <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
                    <h4 className="text-lg font-display font-medium text-white mb-2">Coming later</h4>
                    <p className="text-[#a0a0a0] text-sm">
                      Postgres support, full team and org management, billing, customer-managed encryption keys, high-availability replicas, and a dashboard UI.
                    </p>
                  </div>
                </div>
              </DocSection>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
