import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

gsap.registerPlugin(ScrollTrigger);

const byobPlans = [
  {
    name: 'BYOB Developer',
    badge: 'Bring your own bucket',
    price: '€9',
    period: '/mo',
    description:
      'Use your own S3-compatible bucket and pay Lunchbox for the safety layer, restore UX, and revision history.',
    features: [
      '3 protected databases included',
      '30-day retention window',
      'Client-side encryption',
      'CLI restore and revision history',
    ],
    cta: 'Choose BYOB Developer',
    highlighted: false,
  },
  {
    name: 'BYOB Team',
    badge: 'Bring your own bucket',
    price: '€19',
    period: '/mo',
    description:
      'For small teams that want Lunchbox’s backup and restore layer on top of their own bucket.',
    features: [
      '15 protected databases included',
      '90-day retention window',
      'Client-side encryption + revision history',
      'Team restore workflows',
    ],
    cta: 'Choose BYOB Team',
    highlighted: true,
  },
  {
    name: 'BYOB Business',
    badge: 'Bring your own bucket',
    price: '€59',
    period: '/mo',
    description:
      'For larger teams that want to keep storage in-house while adding policy and operational controls.',
    features: [
      '100 protected databases included',
      '180-day retention window',
      'Team features and audit history',
      'Priority support',
    ],
    cta: 'Talk to us',
    highlighted: false,
  },
];

const managedPlans = [
  {
    name: 'Managed Starter',
    badge: 'Managed storage',
    price: '€15',
    period: '/mo',
    description:
      'Managed storage for small projects that want backups and restores without setting up buckets.',
    features: [
      '3 protected databases included',
      '100 GB protected backup data included',
      '30-day retention window',
      'Encrypted backups, history, and restore UX included',
    ],
    cta: 'Start Managed Starter',
    highlighted: false,
  },
  {
    name: 'Managed Team',
    badge: 'Managed storage',
    price: '€35',
    period: '/mo',
    description:
      'Managed storage for teams that want a proper safety net without paying managed database pricing.',
    features: [
      '10 protected databases included',
      '500 GB protected backup data included',
      '90-day retention window',
      'Encrypted backups, restore history, and revision browsing',
    ],
    cta: 'Start Managed Team',
    highlighted: true,
  },
  {
    name: 'Managed Business',
    badge: 'Managed storage',
    price: '€99',
    period: '/mo',
    description: 'For organisations that need more databases, longer history, and team support.',
    features: [
      '50 protected databases included',
      '3 TB protected backup data included',
      '180-day retention window',
      'Team features, audit history, and priority support',
    ],
    cta: 'Talk to us',
    highlighted: false,
  },
];

export function PricingSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
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

      cardsRef.current.forEach((ref, index) => {
        if (!ref) return;
        gsap.fromTo(
          ref,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            delay: 0.1 + index * 0.08,
            ease: 'expo.out',
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top 60%',
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
      id="pricing"
      ref={sectionRef}
      className="relative py-24 lg:py-32 bg-black overflow-hidden"
    >
      <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div ref={headerRef} className="text-center mb-12 lg:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-semibold text-white mb-4">
            Secure database backup pricing
          </h2>
          <p className="text-lg text-[#a0a0a0] max-w-2xl mx-auto">
            Pay for protected databases and retention — not queries, vCPUs, or database hosting. All plans include encryption, revision history, and one-command restore.
          </p>
        </div>

        <div className="space-y-12">
          {/* BYOB */}
          <div>
            <h3 className="text-xl font-display font-semibold text-white mb-4">
              Bring your own bucket
            </h3>
            <div className="grid md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
              {byobPlans.map((plan, index) => (
                <div
                  key={plan.name}
                  ref={(el) => {
                    cardsRef.current[index] = el;
                  }}
                  className={`relative rounded-2xl p-6 lg:p-8 transition-all duration-500 group ${
                    plan.highlighted
                      ? 'bg-gradient-to-br from-[#1a1a1a] to-[#111111] border-2 border-[#ff6b35]/50 scale-[1.01]'
                      : 'bg-[#1a1a1a]/80 border border-[#2a2a2a] hover:border-[#ff6b35]/30'
                  }`}
                >
                  <div className="mb-3">
                    <span className="inline-flex items-center rounded-full border border-[#2a2a2a] bg-black/40 px-3 py-1 text-xs font-medium text-[#a0a0a0]">
                      {plan.badge}
                    </span>
                  </div>
                  <h4 className="text-lg font-display font-semibold text-white mb-2">
                    {plan.name}
                  </h4>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span
                      className={`text-3xl font-display font-bold ${
                        plan.highlighted ? 'text-[#ff6b35]' : 'text-white'
                      }`}
                    >
                      {plan.price}
                    </span>
                    <span className="text-[#a0a0a0]">{plan.period}</span>
                  </div>
                  <p className="text-[#a0a0a0] text-sm mb-6">
                    {plan.description}
                  </p>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center ${
                            plan.highlighted ? 'bg-[#ff6b35]/20' : 'bg-white/10'
                          }`}
                        >
                          <Check
                            className={`w-3 h-3 ${
                              plan.highlighted ? 'text-[#ff6b35]' : 'text-white'
                            }`}
                          />
                        </div>
                        <span className="text-sm text-[#a0a0a0]">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full py-4 rounded-xl font-medium transition-all duration-300 ${
                      plan.highlighted
                        ? 'bg-[#ff6b35] hover:bg-[#ff6b35]/90 text-white hover:scale-105 hover:shadow-lg hover:shadow-[#ff6b35]/25'
                        : 'bg-white/5 hover:bg-white/10 text-white border border-[#2a2a2a] hover:border-[#ff6b35]/30'
                    }`}
                  >
                    {plan.cta}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Managed storage */}
          <div>
            <h3 className="text-xl font-display font-semibold text-white mb-4">
              Managed storage
            </h3>
            <div className="grid md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
              {managedPlans.map((plan, index) => (
                <div
                  key={plan.name}
                  ref={(el) => {
                    cardsRef.current[index + byobPlans.length] = el;
                  }}
                  className={`relative rounded-2xl p-6 lg:p-8 transition-all duration-500 group ${
                    plan.highlighted
                      ? 'bg-gradient-to-br from-[#1a1a1a] to-[#111111] border-2 border-[#ff6b35]/50 scale-[1.01]'
                      : 'bg-[#1a1a1a]/80 border border-[#2a2a2a] hover:border-[#ff6b35]/30'
                  }`}
                >
                  <div className="mb-3">
                    <span className="inline-flex items-center rounded-full border border-[#2a2a2a] bg-black/40 px-3 py-1 text-xs font-medium text-[#a0a0a0]">
                      {plan.badge}
                    </span>
                  </div>
                  <h4 className="text-lg font-display font-semibold text-white mb-2">
                    {plan.name}
                  </h4>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span
                      className={`text-3xl font-display font-bold ${
                        plan.highlighted ? 'text-[#ff6b35]' : 'text-white'
                      }`}
                    >
                      {plan.price}
                    </span>
                    <span className="text-[#a0a0a0]">{plan.period}</span>
                  </div>
                  <p className="text-[#a0a0a0] text-sm mb-6">
                    {plan.description}
                  </p>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center ${
                            plan.highlighted ? 'bg-[#ff6b35]/20' : 'bg-white/10'
                          }`}
                        >
                          <Check
                            className={`w-3 h-3 ${
                              plan.highlighted ? 'text-[#ff6b35]' : 'text-white'
                            }`}
                          />
                        </div>
                        <span className="text-sm text-[#a0a0a0]">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full py-4 rounded-xl font-medium transition-all duration-300 ${
                      plan.highlighted
                        ? 'bg-[#ff6b35] hover:bg-[#ff6b35]/90 text-white hover:scale-105 hover:shadow-lg hover:shadow-[#ff6b35]/25'
                        : 'bg-white/5 hover:bg-white/10 text-white border border-[#2a2a2a] hover:border-[#ff6b35]/30'
                    }`}
                  >
                    {plan.cta}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-8 text-xs text-[#777] max-w-3xl text-center mx-auto">
          Storage and restore overages are billed fairly per GB. An S3-backed “maximum durability” upgrade is available for customers with stricter compliance or durability requirements.
        </p>
      </div>
    </section>
  );
}
