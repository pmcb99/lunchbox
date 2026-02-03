import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Check, Copy } from 'lucide-react';

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
    title: 'Configure once',
    description: 'Set your API key and you\'re done. Environment-based configuration keeps secrets safe.',
    code: '$ echo "LUNCHBOX_API_KEY=lbk_live_xxx" > .env',
    output: [
      '  Configuration saved to .env',
      '  Ready to sync! 🚀',
    ],
  },
  {
    number: '03',
    title: 'Sync your database',
    description: 'Single command sync. Automatic WAL detection for SQLite, streaming dumps for PostgreSQL.',
    code: '$ lunchbox sync ./mydatabase.db',
    output: [
      '  Detected SQLite database (WAL mode enabled)',
      '  → Compressing... 45MB → 12MB',
      '  → Uploading... ████████████████████ 100%',
      '  ✓ Revision rev_abc123 created successfully',
      '  ✓ Available at: lunchbox.dev/databases/mydatabase.db',
    ],
  },
];

export function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (code: string, index: number) => {
    navigator.clipboard.writeText(code.replace('$ ', ''));
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
            Three simple steps to version control your databases
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-16 lg:space-y-24">
          {steps.map((step, index) => (
            <div
              key={step.number}
              ref={(el) => { stepsRef.current[index] = el; }}
              className={`grid lg:grid-cols-2 gap-8 lg:gap-16 items-center ${
                index % 2 === 1 ? 'lg:flex-row-reverse' : ''
              }`}
            >
              {/* Content */}
              <div className={`${index % 2 === 1 ? 'lg:order-2' : ''}`}>
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
                  
                  <div className="p-4 font-mono text-sm">
                    <code className="text-[#a0a0a0]">
                      <span className="text-[#ff6b35]">$</span>{' '}
                      <span className="text-white">{step.code.replace('$ ', '')}</span>
                    </code>
                  </div>
                </div>
              </div>

              {/* Terminal Visual */}
              <div className={`${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                <div 
                  className="relative bg-[#0a0a0a] border border-[#2a2a2a] rounded-2xl overflow-hidden shadow-2xl"
                  style={{
                    transform: `perspective(1000px) rotateY(${index % 2 === 0 ? '-5' : '5'}deg) rotateX(2deg)`,
                    boxShadow: '0 50px 100px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,107,53,0.1)',
                  }}
                >
                  {/* Terminal Header */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2a2a2a] bg-[#111111]">
                    <div className="w-3 h-3 rounded-full bg-[#ef4444]" />
                    <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                    <div className="w-3 h-3 rounded-full bg-[#4ade80]" />
                    <span className="ml-4 text-xs text-[#666]">terminal — lunchbox</span>
                  </div>
                  
                  {/* Terminal Content */}
                  <div className="p-6 font-mono text-sm space-y-2">
                    <div className="text-[#a0a0a0]">
                      <span className="text-[#4ade80]">➜</span>{' '}
                      <span className="text-[#60a5fa]">~/projects/myapp</span>{' '}
                      <span className="text-white">{step.code.replace('$ ', '')}</span>
                    </div>
                    {step.output.map((line, i) => (
                      <div 
                        key={i} 
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
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
