import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { 
  RefreshCw, 
  Shield, 
  Clock, 
  Users, 
  GitBranch
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const features = [
  {
    icon: Shield,
    title: 'Immutable Revisions',
    description: 'Content-addressed by BLAKE3 hash. Every revision is verifiable and tamper-evident.',
  },
  {
    icon: Clock,
    title: 'Instant Restore',
    description: 'Restore any revision fast. Point-in-time recovery for Postgres with WAL archiving.',
  },
  {
    icon: Users,
    title: 'Team Visibility',
    description: 'Share databases across the team with roles, audit history, and safe restores.',
  },
  {
    icon: GitBranch,
    title: 'CI/CD Native',
    description: 'GitHub Actions integration. Backup before migrations, sync after deploys.',
  },
];

export function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const centralCardRef = useRef<HTMLDivElement>(null);
  const satelliteRefs = useRef<(HTMLDivElement | null)[]>([]);
  const orbitPathRef = useRef<SVGSVGElement>(null);

  // GSAP animations - useGSAP handles React 18 StrictMode properly
  useGSAP(() => {
    // Header animation
    gsap.fromTo(
      headerRef.current,
      { opacity: 0, y: 40 },
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

    // Central card animation
    gsap.fromTo(
      centralCardRef.current,
      { opacity: 0, rotateY: -90 },
      {
        opacity: 1,
        rotateY: 0,
        duration: 0.8,
        delay: 0.2,
        ease: 'expo.out',
        scrollTrigger: {
          trigger: centralCardRef.current,
          start: 'top 80%',
          toggleActions: 'play none none reverse',
        },
      }
    );

    // Orbital path fade-in animation (circles don't support getTotalLength)
    if (orbitPathRef.current) {
      gsap.fromTo(
        orbitPathRef.current,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.8,
          delay: 0.4,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 60%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    }

    // Satellite cards animation
    satelliteRefs.current.forEach((ref, index) => {
      if (!ref) return;
      gsap.fromTo(
        ref,
        { opacity: 0, x: -50, scale: 0.9 },
        {
          opacity: 1,
          x: 0,
          scale: 1,
          duration: 0.6,
          delay: 0.6 + index * 0.15,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 60%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      // Floating animation
      gsap.to(ref, {
        y: index % 2 === 0 ? -8 : 8,
        duration: 3 + index * 0.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    });
  }, { scope: sectionRef });

  return (
    <section
      id="features"
      ref={sectionRef}
      className="relative py-24 lg:py-32 bg-black overflow-hidden"
    >
      {/* Background Grid */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />

      <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div ref={headerRef} className="text-center mb-16 lg:mb-24">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-semibold text-white mb-4">
            Built for <span className="text-[#ff6b35]">developers</span>
          </h2>
          <p className="text-lg text-[#a0a0a0] max-w-2xl mx-auto">
            A clean API on top of durable object storage, without the setup pain
          </p>
        </div>

        {/* Features Grid Layout */}
        <div className="relative">
          {/* Orbital SVG Path */}
          <svg
            ref={orbitPathRef}
            className="absolute inset-0 w-full h-full pointer-events-none hidden lg:block"
            style={{ zIndex: 0 }}
          >
            <circle
              cx="50%"
              cy="50%"
              r="35%"
              fill="none"
              stroke="rgba(255,107,53,0.1)"
              strokeWidth="1"
              strokeDasharray="10 10"
            />
          </svg>

          <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            {/* Central Feature Card */}
            <div className="lg:col-span-5 lg:col-start-1">
              <div
                ref={centralCardRef}
                className="relative bg-gradient-to-br from-[#1a1a1a] to-[#111111] border border-[#2a2a2a] rounded-2xl p-8 lg:p-10 hover:border-[#ff6b35]/50 transition-all duration-500 group"
                style={{ 
                  perspective: '800px',
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* Glow Effect */}
                <div className="absolute -inset-px bg-gradient-to-br from-[#ff6b35]/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
                
                <div className="relative">
                  <div className="w-14 h-14 rounded-xl bg-[#ff6b35]/10 border border-[#ff6b35]/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <RefreshCw className="w-7 h-7 text-[#ff6b35]" />
                  </div>
                  
                  <h3 className="text-2xl lg:text-3xl font-display font-semibold text-white mb-4">
                    One-Command Sync
                  </h3>
                  
                  <p className="text-[#a0a0a0] mb-8 leading-relaxed">
                    Sync your database with a single command. We handle deduplication, compression, encryption, and the object store behind the scenes.
                  </p>

                  {/* Code Block */}
                  <div className="bg-black/50 border border-[#2a2a2a] rounded-xl p-4 font-mono text-sm overflow-x-auto">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 rounded-full bg-[#ef4444]" />
                      <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                      <div className="w-3 h-3 rounded-full bg-[#4ade80]" />
                    </div>
                    <code className="text-[#a0a0a0]">
                      <span className="text-[#ff6b35]">$</span>{' '}
                      <span className="text-white">lunchbox sync</span>{' '}
                      <span className="text-[#4ade80]">./mydatabase.db</span>
                    </code>
                  </div>
                </div>
              </div>
            </div>

            {/* Satellite Feature Cards */}
            <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4 lg:gap-6">
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  ref={(el) => { satelliteRefs.current[index] = el; }}
                  className="relative bg-[#1a1a1a]/80 border border-[#2a2a2a] rounded-xl p-6 hover:border-[#ff6b35]/30 hover:bg-[#1a1a1a] transition-all duration-300 group"
                  style={{ transform: `translateZ(${index * 10}px)` }}
                >
                  <div className="w-10 h-10 rounded-lg bg-[#ff6b35]/10 border border-[#ff6b35]/20 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-[#ff6b35]/20 transition-all duration-300">
                    <feature.icon className="w-5 h-5 text-[#ff6b35]" />
                  </div>
                  
                  <h4 className="text-lg font-display font-medium text-white mb-2">
                    {feature.title}
                  </h4>
                  
                  <p className="text-sm text-[#a0a0a0] leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
