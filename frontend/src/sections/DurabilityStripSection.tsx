import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function DurabilityStripSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useGSAP(() => {
    cardsRef.current.forEach((ref, index) => {
      if (!ref) return;
      gsap.fromTo(
        ref,
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          delay: 0.1 + index * 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    });
  }, { scope: sectionRef });

  return (
    <section
      ref={sectionRef}
      className="relative py-10 sm:py-12 bg-black"
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-4">
          <div
            ref={(el) => { cardsRef.current[0] = el; }}
            className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-6"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-[#777] mb-3">
              Maximum durability
            </p>
            <p className="text-white text-lg font-medium">
              Targets <span className="text-[#ff6b35]">99.999999999% durability</span> + <span className="text-[#ff6b35]">99.99% availability</span>.
            </p>
          </div>
          <div
            ref={(el) => { cardsRef.current[1] = el; }}
            className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-6"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-[#777] mb-3">
              Best value (EU)
            </p>
            <p className="text-white text-lg font-medium">
              Ceph-backed object storage, EU locations; provider commits to <span className="text-[#ff6b35]">99.9% annual average network availability</span> at data centres.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
