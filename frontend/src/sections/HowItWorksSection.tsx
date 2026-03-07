import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Check, Copy } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    number: '01',
    title: 'Install the CLI',
    description: 'One-line installation with pipx. No dependencies, no configuration files.',
    code: '$ pipx install lunchbox',
    output: [
      '  installed package lunchbox 0.8.0, installed using Python 3.12',
      '  These apps are now globally available',
      '    - lunchbox',
      'done! ✨ 🌟 ✨',
    ],
  },
  {
    number: '02',
    title: 'Sync your database',
    description: 'Single command sync. Automatic WAL detection for SQLite, streaming dumps for PostgreSQL.',
    code: '$ lunchbox sync ./mydatabase.db\n$ lunchbox sync --db postgresql://localhost/app',
    output: [
      '  Detected SQLite database (WAL mode enabled)',
      '  → Compressing... 45MB → 12MB',
      '  → Uploading... ████████████████████ 100%',
      '  ✓ Revision rev_abc123 created successfully',
      '  ✓ Available at: lunchbox.dev/databases/mydatabase.db',
    ],
    terminals: [
      {
        title: 'SQLite sync',
        command: ['$ lunchbox sync ./mydatabase.db'],
        output: [
          '  Detected SQLite database (WAL mode enabled)',
          '  → Compressing... 45MB → 12MB',
          '  → Uploading... ████████████████████ 100%',
          '  ✓ Revision rev_abc123 created successfully',
          '  ✓ Available at: lunchbox.dev/databases/mydatabase.db',
        ],
      },
      {
        title: 'Postgres sync',
        command: ['$ lunchbox sync --db postgresql://localhost/app'],
        output: [
          '  Detected PostgreSQL database (streaming dump)',
          '  → Exporting... 120MB',
          '  → Uploading... ████████████████████ 100%',
          '  ✓ Revision rev_def456 created successfully',
          '  ✓ Available at: lunchbox.dev/databases/app',
        ],
      },
    ],
  },
  {
    number: '03',
    title: 'Meet your needs',
    description: (
      <>
        Turn on{' '}
        <span className="text-[#fbbf24] drop-shadow-[0_0_12px_rgba(248,113,113,0.6)] animate-pulse">
          post-quantum encryption
        </span>{' '}
        or schedule backups with a single flag.
      </>
    ),
    code: '$ lunchbox sync ./mydatabase.db --pq-encryption\n$ lunchbox schedule "0 3 * * *" --db ./mydatabase.db',
    output: [
      '  Post-quantum encryption enabled',
      '  ✓ Policy stored for new revisions',
    ],
    terminals: [
      {
        title: 'SQLite',
        command: [
          '$ lunchbox sync ./mydatabase.db --pq-encryption',
          '$ lunchbox schedule "0 3 * * *" --db ./mydatabase.db',
        ],
        output: [
          '  Post-quantum encryption enabled',
          '  → Encrypting... 45MB → 45MB',
          '  → Uploading... ████████████████████ 100%',
          '  ✓ Revision rev_pq101 created successfully',
          '  Schedule saved (UTC)',
          '  Next run: 03:00',
          '  ✓ Backups will run nightly',
        ],
      },
      {
        title: 'Postgres',
        command: [
          '$ lunchbox sync --db postgresql://localhost/app --pq-encryption',
          '$ lunchbox schedule "0 3 * * *" --db postgresql://localhost/app',
        ],
        output: [
          '  Post-quantum encryption enabled',
          '  → Encrypting... 120MB → 120MB',
          '  → Uploading... ████████████████████ 100%',
          '  ✓ Revision rev_pq202 created successfully',
          '  Schedule saved (UTC)',
          '  Next run: 03:00',
          '  ✓ Backups will run nightly',
        ],
      },
    ],
  },
  {
    number: '04',
    title: 'Restore fast',
    description: 'Restore any revision to a file or directly to Postgres.',
    code: '$ lunchbox restore ./mydatabase.db --rev rev_abc123 --output ./db-restored.db\n$ lunchbox restore app --target-db postgresql://localhost/restored_db',
    output: [
      '  Downloading revision rev_abc123',
      '  ✓ Restored to ./db-restored.db',
    ],
    terminals: [
      {
        title: 'SQLite restore',
        command: ['$ lunchbox restore ./mydatabase.db --rev rev_abc123 --output ./db-restored.db'],
        output: [
          '  Downloading revision rev_abc123',
          '  → Decrypting... 45MB',
          '  ✓ Restored to ./db-restored.db',
        ],
      },
      {
        title: 'Postgres restore',
        command: ['$ lunchbox restore app --target-db postgresql://localhost/restored_db'],
        output: [
          '  Fetching latest revision for app',
          '  → Restoring... 120MB',
          '  ✓ Restored to postgresql://localhost/restored_db',
        ],
      },
    ],
  },
];

export function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const activeTerminalRef = useRef<'sqlite' | 'pg'>('sqlite');
  const carouselApisRef = useRef<Record<string, import('@/components/ui/carousel').CarouselApi | null>>({});

  const handleCopy = (code: string, index: number) => {
    const stripped = code
      .split('\n')
      .map((line) => (line.startsWith('$ ') ? line.slice(2) : line))
      .join('\n');
    navigator.clipboard.writeText(stripped);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Header animation
      gsap.fromTo(
        headerRef.current,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: headerRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      // Steps animation
      stepsRef.current.forEach((ref, index) => {
        if (!ref) return;
        gsap.fromTo(
          ref,
          { opacity: 0, x: index % 2 === 0 ? -50 : 50 },
          {
            opacity: 1,
            x: 0,
            duration: 0.8,
            delay: index * 0.2,
            ease: 'expo.out',
            scrollTrigger: {
              trigger: ref,
              start: 'top 75%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      activeTerminalRef.current = activeTerminalRef.current === 'sqlite' ? 'pg' : 'sqlite';
      const targetIndex = activeTerminalRef.current === 'sqlite' ? 0 : 1;
      Object.values(carouselApisRef.current).forEach((api) => {
        api?.scrollTo(targetIndex);
      });
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="relative py-24 lg:py-32 bg-black overflow-hidden"
    >
      {/* Background Gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(255,107,53,0.15) 0%, transparent 70%)',
          }}
        />
      </div>

      <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div ref={headerRef} className="text-center mb-16 lg:mb-24">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-semibold text-white mb-4">
            Get started in <span className="text-[#ff6b35]">30 seconds</span>
          </h2>
          <p className="text-lg text-[#a0a0a0] max-w-2xl mx-auto">
            Four simple steps to version control your databases
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-16 lg:space-y-24">
          {steps.map((step, index) => {
            const codeLines = step.code.split('\n');
            const terminals = step.terminals ?? [];
            const hasTerminals = terminals.length > 0;
            const isSingleColumn = step.number === '01' && !hasTerminals;
            const terminalAlignClass = step.number === '02' || step.number === '03' || step.number === '04'
              ? 'h-full flex items-end'
              : 'h-full';

            return (
              <div
                key={step.number}
                ref={(el) => { stepsRef.current[index] = el; }}
                className={`grid gap-8 lg:gap-16 items-stretch ${
                  isSingleColumn ? 'lg:grid-cols-1' : 'lg:grid-cols-2'
                }`}
              >
                {/* Content */}
                <div className="order-1 h-full flex flex-col">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-5xl lg:text-6xl font-display font-bold text-[#ff6b35]/20">
                      {step.number}
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-r from-[#2a2a2a] to-transparent" />
                  </div>
                  
                  <h3 className="text-2xl lg:text-3xl font-display font-semibold text-white mb-4">
                    {step.title}
                  </h3>
                  
                  <p className="text-[#a0a0a0] text-lg leading-relaxed mb-6">
                    {step.description}
                  </p>

                  {/* Code Block */}
                  <div className="relative bg-[#111111] border border-[#2a2a2a] rounded-xl overflow-hidden group">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a] bg-[#1a1a1a]">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#ef4444]" />
                        <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                        <div className="w-3 h-3 rounded-full bg-[#4ade80]" />
                      </div>
                      <button
                        onClick={() => handleCopy(step.code, index)}
                        className="p-1.5 rounded-md hover:bg-white/10 transition-colors duration-200"
                      >
                        {copiedIndex === index ? (
                          <Check className="w-4 h-4 text-[#4ade80]" />
                        ) : (
                          <Copy className="w-4 h-4 text-[#a0a0a0]" />
                        )}
                      </button>
                    </div>
                    
                    <div className="p-4 font-mono text-sm space-y-1">
                      <code className="text-[#a0a0a0]">
                        {codeLines.map((line, lineIndex) => (
                          <div key={`${step.number}-code-${lineIndex}`}>
                            <span className="text-[#ff6b35]">$</span>{' '}
                            <span className="text-white">{line.startsWith('$ ') ? line.slice(2) : line}</span>
                          </div>
                        ))}
                      </code>
                    </div>
                  </div>
                </div>

                {/* Terminal Visual */}
                {hasTerminals && (
                  <div className={`order-2 ${terminalAlignClass}`}>
                    <Carousel
                      setApi={(api) => {
                        carouselApisRef.current[step.number] = api;
                        const targetIndex = activeTerminalRef.current === 'sqlite' ? 0 : 1;
                        api?.scrollTo(targetIndex);
                      }}
                      opts={{ loop: true }}
                      className="w-full"
                    >
                      <CarouselContent>
                        {terminals.map((terminal, terminalIndex) => (
                          <CarouselItem key={`${step.number}-terminal-${terminalIndex}`}>
                            <div
                              className="relative h-full flex flex-col bg-[#0a0a0a] border border-[#2a2a2a] rounded-2xl overflow-hidden shadow-2xl"
                              style={{
                                transform: 'perspective(1000px) rotateY(-4deg) rotateX(2deg)',
                                boxShadow: '0 50px 100px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,107,53,0.1)',
                              }}
                            >
                              {/* Terminal Header */}
                              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2a2a2a] bg-[#111111]">
                                <div className="w-3 h-3 rounded-full bg-[#ef4444]" />
                                <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                                <div className="w-3 h-3 rounded-full bg-[#4ade80]" />
                                <span className="ml-4 text-xs text-[#666]">terminal — lunchbox</span>
                                <span className="ml-auto text-xs text-[#666]">{terminal.title}</span>
                              </div>
                              
                              {/* Terminal Content */}
                              <div className="flex-1 p-6 font-mono text-sm space-y-2">
                                {(Array.isArray(terminal.command) ? terminal.command : [terminal.command]).map((command, commandIndex) => (
                                  <div key={`${step.number}-terminal-${terminalIndex}-command-${commandIndex}`} className="text-[#a0a0a0]">
                                    <span className="text-[#4ade80]">➜</span>{' '}
                                    <span className="text-[#60a5fa]">~/projects/myapp</span>{' '}
                                    <span className="text-white">{command.replace('$ ', '')}</span>
                                  </div>
                                ))}
                                {terminal.output.map((line, i) => (
                                  <div 
                                    key={`${step.number}-terminal-${terminalIndex}-line-${i}`} 
                                    className={`${
                                      line.startsWith('  ✓') ? 'text-[#4ade80]' : 
                                      line.startsWith('  →') ? 'text-[#60a5fa]' :
                                      'text-[#a0a0a0]'
                                    }`}
                                  >
                                    {line}
                                  </div>
                                ))}
                                <div className="text-[#a0a0a0]">
                                  <span className="text-[#4ade80]">➜</span>{' '}
                                  <span className="text-[#60a5fa]">~/projects/myapp</span>{' '}
                                  <span className="inline-block w-2 h-4 bg-[#ff6b35] animate-pulse ml-1" />
                                </div>
                              </div>

                              {/* Glow Effect */}
                              <div className="absolute -inset-px bg-gradient-to-br from-[#ff6b35]/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                            </div>
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                    </Carousel>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
