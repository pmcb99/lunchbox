import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function ManagedBackendSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useGSAP(() => {
    gsap.fromTo(
      headerRef.current,
      { opacity: 0, y: 24 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 80%',
          toggleActions: 'play none none reverse',
        },
      }
    );

    cardsRef.current.forEach((ref, index) => {
      if (!ref) return;
      gsap.fromTo(
        ref,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          delay: 0.1 + index * 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 75%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    });
  }, { scope: sectionRef });

  return (
    <section
      ref={sectionRef}
      className="relative py-20 lg:py-28 bg-black"
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div ref={headerRef} className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-semibold text-white mb-4">
            Backup storage, <span className="text-[#ff6b35]">not a new database</span>
          </h2>
          <p className="text-lg text-[#a0a0a0] max-w-2xl mx-auto">
            Lunchbox stores encrypted backups and revisions in durable object storage, either managed by us or in your own bucket. Your production database stays exactly where it is.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div
            ref={(el) => { cardsRef.current[0] = el; }}
            className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-8 hover:border-[#ff6b35]/40 transition-colors duration-300"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-[#777] mb-3">
              Managed storage
            </p>
            <h3 className="text-2xl font-display font-semibold text-white mb-3">
              Managed storage
            </h3>
            <p className="text-[#a0a0a0] mb-6">
              We run the storage layer for you, so you do not have to think about buckets, lifecycle rules, or retention setup.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#a0a0a0]">Best for lowest data-loss risk</span>
              <Button
                asChild
                variant="outline"
                className="border-[#2a2a2a] text-white hover:bg-white/5"
              >
                <a href="/pricing">
                  View pricing <ArrowRight className="ml-2 w-4 h-4" />
                </a>
              </Button>
            </div>
          </div>

          <div
            ref={(el) => { cardsRef.current[1] = el; }}
            className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-8 hover:border-[#ff6b35]/40 transition-colors duration-300"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-[#777] mb-3">
              Bring your own bucket
            </p>
            <h3 className="text-2xl font-display font-semibold text-white mb-3">
              Bring your own bucket
            </h3>
            <p className="text-[#a0a0a0] mb-6">
              Use your own S3-compatible storage and pay Lunchbox for the backup, restore, security, and history layer.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#a0a0a0]">Best for cost-sensitive teams</span>
              <Button
                asChild
                variant="outline"
                className="border-[#2a2a2a] text-white hover:bg-white/5"
              >
                <a href="/pricing">
                  View pricing <ArrowRight className="ml-2 w-4 h-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
