import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Star } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export function TestimonialsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const columnsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
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

      // Column animations with parallax
      columnsRef.current.forEach((ref, index) => {
        if (!ref) return;
        
        // Entrance animation
        gsap.fromTo(
          ref,
          { opacity: 0, y: 80 },
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            delay: 0.1 + index * 0.1,
            ease: 'expo.out',
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top 60%',
              toggleActions: 'play none none reverse',
            },
          }
        );

        // Parallax effect on scroll
        gsap.to(ref, {
          y: index === 1 ? -100 : index === 2 ? -75 : -50,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.5,
          },
        });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative py-24 lg:py-32 bg-black overflow-hidden"
    >
      {/* Background */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.01) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.01) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px',
        }}
      />

      <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div ref={headerRef} className="text-center mb-16 lg:mb-24">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-semibold text-white mb-4">
            Built for teams that self-host on purpose
          </h2>
          <p className="text-lg text-[#a0a0a0] max-w-2xl mx-auto">
            Lunchbox is for developers who want to keep control of their own database, but do not want to build and babysit backup, restore, retention, and history tooling themselves.
          </p>
        </div>

        {/* Audience explanation grid */}
        <div
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          style={{ perspective: '1000px' }}
        >
          <div
            ref={(el) => {
              columnsRef.current[0] = el;
            }}
            className="bg-[#1a1a1a]/80 border border-[#2a2a2a] rounded-xl p-6"
          >
            <p className="text-sm text-[#ff6b35] mb-2 uppercase tracking-[0.15em]">
              SaaS teams
            </p>
            <p className="text-sm text-[#a0a0a0] leading-relaxed">
              SaaS teams running SQLite or Postgres in production that want real backups and restores without moving to a managed database.
            </p>
          </div>
          <div
            ref={(el) => {
              columnsRef.current[1] = el;
            }}
            className="bg-[#1a1a1a]/80 border border-[#2a2a2a] rounded-xl p-6"
          >
            <p className="text-sm text-[#ff6b35] mb-2 uppercase tracking-[0.15em]">
              Internal tools
            </p>
            <p className="text-sm text-[#a0a0a0] leading-relaxed">
              Internal tools and side projects that still deserve proper backup, restore, and history guarantees.
            </p>
          </div>
          <div
            ref={(el) => {
              columnsRef.current[2] = el;
            }}
            className="bg-[#1a1a1a]/80 border border-[#2a2a2a] rounded-xl p-6"
          >
            <p className="text-sm text-[#ff6b35] mb-2 uppercase tracking-[0.15em]">
              Compliance-sensitive teams
            </p>
            <p className="text-sm text-[#a0a0a0] leading-relaxed">
              Teams that need encrypted, auditable history for self-hosted databases without building it all in-house.
            </p>
          </div>
          <div
            ref={(el) => {
              columnsRef.current[3] = el;
            }}
            className="bg-[#1a1a1a]/80 border border-[#2a2a2a] rounded-xl p-6"
          >
            <p className="text-sm text-[#ff6b35] mb-2 uppercase tracking-[0.15em]">
              BYOB or EU storage
            </p>
            <p className="text-sm text-[#a0a0a0] leading-relaxed">
              Companies that want bring-your-own-bucket or EU-hosted storage options and a clean API on top.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </section>
  );
}
