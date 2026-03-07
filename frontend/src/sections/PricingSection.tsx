import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

gsap.registerPlugin(ScrollTrigger);

const byobPlans = [
  {
    name: 'BYOB Starter',
    price: '€1.99',
    period: '/mo',
    description: 'Use your own bucket with a simple control plane.',
    features: [
      'Small limits for single DBs',
      'Client-side encryption',
      'Versioned snapshots + retention',
      'One-command restore',
    ],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'BYOB Team',
    price: '€5.99',
    period: '/mo',
    description: 'Team limits with audit history and policies.',
    features: [
      'Larger limits for teams',
      'Audit log + retention policies',
      'Webhooks + integrations',
      'Bring any S3-compatible bucket',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
  },
];

const managedPlans = {
  s3: [
    {
      name: 'Managed Max Durability 1 TB',
      price: '€29.99',
      period: '/mo',
      description: 'Lowest data-loss risk with multi-zone redundancy.',
      features: [
        '1 TB managed storage',
        'Encrypted, versioned backups',
        'Retention rules + PIT restore',
        'One-command restore',
      ],
      cta: 'Start Free Trial',
      highlighted: true,
    },
    {
      name: 'Managed Max Durability 5 TB',
      price: '€129.99',
      period: '/mo',
      description: 'Scale storage with the same durability targets.',
      features: [
        '5 TB managed storage',
        'Encrypted, versioned backups',
        'Retention rules + PIT restore',
        'One-command restore',
      ],
      cta: 'Contact Us',
      highlighted: false,
    },
  ],
  hetzner: [
    {
      name: 'Managed Best Value 1 TB',
      price: '€7.99',
      period: '/mo',
      description: 'Cost-efficient managed storage in the EU.',
      features: [
        '1 TB storage + 1 TB egress',
        'S3-compatible, Ceph-backed',
        'Server-side encryption + object lock',
        'One-command restore',
      ],
      cta: 'Start Free Trial',
      highlighted: true,
    },
    {
      name: 'Managed Best Value 5 TB',
      price: '€39.99',
      period: '/mo',
      description: 'Larger storage with predictable EU pricing.',
      features: [
        '5 TB storage + 1 TB egress',
        'S3-compatible, Ceph-backed',
        'Server-side encryption + object lock',
        'One-command restore',
      ],
      cta: 'Contact Us',
      highlighted: false,
    },
  ],
};

export function PricingSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [managedBackend, setManagedBackend] = useState<'s3' | 'hetzner'>('s3');

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

  const currentManagedPlans = managedPlans[managedBackend];

  return (
    <section
      id="pricing"
      ref={sectionRef}
      className="relative py-24 lg:py-32 bg-black overflow-hidden"
    >
      <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div ref={headerRef} className="text-center mb-12 lg:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-semibold text-white mb-4">
            Pricing that respects your backend
          </h2>
          <p className="text-lg text-[#a0a0a0] max-w-2xl mx-auto">
            All managed plans include encryption, versioned backups, retention rules, and one-command restore. The choice is <span className="text-white">durability vs price</span>, not features.
          </p>
        </div>

        <Tabs defaultValue="managed" className="w-full">
          <div className="flex flex-col items-center gap-6 mb-10">
            <TabsList className="bg-[#111111] border border-[#2a2a2a]">
              <TabsTrigger value="managed" className="text-white">Managed</TabsTrigger>
              <TabsTrigger value="byob" className="text-white">BYOB</TabsTrigger>
            </TabsList>

            <TabsContent value="managed" className="w-full">
              <div className="flex flex-col items-center gap-6">
                <ToggleGroup
                  type="single"
                  value={managedBackend}
                  onValueChange={(value) => {
                    if (value === 's3' || value === 'hetzner') {
                      setManagedBackend(value);
                    }
                  }}
                  variant="outline"
                  size="sm"
                  spacing={0}
                  className="bg-[#111111] border border-[#2a2a2a]"
                >
                   <ToggleGroupItem value="s3" className="text-white">Maximum durability</ToggleGroupItem>
                   <ToggleGroupItem value="hetzner" className="text-white">Best value (EU)</ToggleGroupItem>
                </ToggleGroup>

                <div className="grid md:grid-cols-2 gap-6 lg:gap-8 items-stretch w-full">
                  {currentManagedPlans.map((plan, index) => (
                    <div
                      key={plan.name}
                      ref={(el) => { cardsRef.current[index] = el; }}
                      className={`relative rounded-2xl p-6 lg:p-8 transition-all duration-500 group ${
                        plan.highlighted
                          ? 'bg-gradient-to-br from-[#1a1a1a] to-[#111111] border-2 border-[#ff6b35]/50 scale-[1.01]'
                          : 'bg-[#1a1a1a]/80 border border-[#2a2a2a] hover:border-[#ff6b35]/30'
                      }`}
                    >
                      <h3 className="text-xl font-display font-semibold text-white mb-2">
                        {plan.name}
                      </h3>
                      <div className="flex items-baseline gap-1 mb-1">
                        <span className={`text-4xl font-display font-bold ${
                          plan.highlighted ? 'text-[#ff6b35]' : 'text-white'
                        }`}>
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
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                              plan.highlighted ? 'bg-[#ff6b35]/20' : 'bg-white/10'
                            }`}>
                              <Check className={`w-3 h-3 ${
                                plan.highlighted ? 'text-[#ff6b35]' : 'text-white'
                              }`} />
                            </div>
                            <span className="text-sm text-[#a0a0a0]">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        className={`w-full py-6 rounded-xl font-medium transition-all duration-300 ${
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

                <p className="text-xs text-[#777] max-w-3xl text-center">
                  {managedBackend === 'hetzner'
                    ? 'Base includes 1 TB storage + 1 TB egress. Extra egress is priced per TB by the upstream provider.'
                    : 'Durability/availability targets apply to the maximum durability tier.'}
                </p>
              </div>
            </TabsContent>
          </div>

          <TabsContent value="byob">
            <div className="grid md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
              {byobPlans.map((plan, index) => (
                <div
                  key={plan.name}
                  ref={(el) => { cardsRef.current[index + currentManagedPlans.length] = el; }}
                  className={`relative rounded-2xl p-6 lg:p-8 transition-all duration-500 group ${
                    plan.highlighted
                      ? 'bg-gradient-to-br from-[#1a1a1a] to-[#111111] border-2 border-[#ff6b35]/50 scale-[1.01]'
                      : 'bg-[#1a1a1a]/80 border border-[#2a2a2a] hover:border-[#ff6b35]/30'
                  }`}
                >
                  <h3 className="text-xl font-display font-semibold text-white mb-2">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className={`text-4xl font-display font-bold ${
                      plan.highlighted ? 'text-[#ff6b35]' : 'text-white'
                    }`}>
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
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          plan.highlighted ? 'bg-[#ff6b35]/20' : 'bg-white/10'
                        }`}>
                          <Check className={`w-3 h-3 ${
                            plan.highlighted ? 'text-[#ff6b35]' : 'text-white'
                          }`} />
                        </div>
                        <span className="text-sm text-[#a0a0a0]">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full py-6 rounded-xl font-medium transition-all duration-300 ${
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
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
