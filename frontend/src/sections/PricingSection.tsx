import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

gsap.registerPlugin(ScrollTrigger);

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'Perfect for personal projects',
    features: [
      '1 database',
      '7-day retention',
      '1GB storage',
      'Community support',
    ],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    description: 'For growing teams',
    features: [
      'Unlimited databases',
      '30-day retention',
      '100GB storage',
      'Priority support',
      'Team collaboration',
      'API access',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large organizations',
    features: [
      'Unlimited everything',
      'Custom retention',
      'SSO & SAML',
      'Dedicated support',
      'Self-hosted option',
      'SLA guarantee',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

export function PricingSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

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

      // Cards animation
      cardsRef.current.forEach((ref, index) => {
        if (!ref) return;
        const isCenter = index === 1;
        
        gsap.fromTo(
          ref,
          { 
            opacity: 0, 
            y: 60,
            rotateY: index === 0 ? -45 : index === 2 ? 45 : 0,
            x: index === 0 ? -100 : index === 2 ? 100 : 0,
            scale: isCenter ? 0.8 : 1,
          },
          {
            opacity: 1,
            y: 0,
            rotateY: index === 0 ? -5 : index === 2 ? 5 : 0,
            x: 0,
            scale: isCenter ? 1.05 : 1,
            duration: isCenter ? 0.9 : 0.8,
            delay: 0.2 + index * 0.1,
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
      {/* Background Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(255,107,53,0.2) 0%, transparent 60%)',
          }}
        />
      </div>

      <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div ref={headerRef} className="text-center mb-16 lg:mb-20">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-semibold text-white mb-4">
            Simple, <span className="text-[#ff6b35]">transparent</span> pricing
          </h2>
          <p className="text-lg text-[#a0a0a0] max-w-2xl mx-auto">
            Start free, scale as you grow
          </p>
        </div>

        {/* Pricing Cards */}
        <div 
          className="grid md:grid-cols-3 gap-6 lg:gap-8 items-center"
          style={{ perspective: '1200px' }}
        >
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              ref={(el) => { cardsRef.current[index] = el; }}
              className={`relative rounded-2xl p-6 lg:p-8 transition-all duration-500 group ${
                plan.highlighted
                  ? 'bg-gradient-to-br from-[#1a1a1a] to-[#111111] border-2 border-[#ff6b35]/50 scale-105 z-10'
                  : 'bg-[#1a1a1a]/80 border border-[#2a2a2a] hover:border-[#ff6b35]/30'
              }`}
              style={{
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="flex items-center gap-1.5 bg-[#ff6b35] text-white text-xs font-medium px-3 py-1.5 rounded-full animate-pulse-glow">
                    <Sparkles className="w-3.5 h-3.5" />
                    {plan.badge}
                  </div>
                </div>
              )}

              {/* Holographic Sheen Effect */}
              <div 
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-600 pointer-events-none overflow-hidden"
                style={{
                  background: 'linear-gradient(105deg, transparent 40%, rgba(255,107,53,0.1) 45%, rgba(255,107,53,0.2) 50%, rgba(255,107,53,0.1) 55%, transparent 60%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 2s linear infinite',
                }}
              />

              <div className="relative">
                {/* Plan Name */}
                <h3 className="text-xl font-display font-semibold text-white mb-2">
                  {plan.name}
                </h3>

                {/* Price */}
                <div className="flex items-baseline gap-1 mb-2">
                  <span className={`text-4xl lg:text-5xl font-display font-bold ${
                    plan.highlighted ? 'text-[#ff6b35]' : 'text-white'
                  }`}>
                    {plan.price}
                  </span>
                  <span className="text-[#a0a0a0]">{plan.period}</span>
                </div>

                {/* Description */}
                <p className="text-[#a0a0a0] text-sm mb-6">
                  {plan.description}
                </p>

                {/* Features */}
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

                {/* CTA Button */}
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
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </section>
  );
}
