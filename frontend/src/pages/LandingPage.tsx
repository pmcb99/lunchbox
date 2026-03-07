import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HeroSection } from '../sections/HeroSection';
import { ManagedBackendSection } from '../sections/ManagedBackendSection';
import { FeaturesSection } from '../sections/FeaturesSection';
import { HowItWorksSection } from '../sections/HowItWorksSection';
import { TestimonialsSection } from '../sections/TestimonialsSection';
import { PricingSection } from '../sections/PricingSection';
import { FAQSection } from '../sections/FAQSection';
import { CTASection } from '../sections/CTASection';

gsap.registerPlugin(ScrollTrigger);

export function LandingPage() {
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Refresh ScrollTrigger on mount
    ScrollTrigger.refresh();
    
    return () => {
      // Clean up only this component's ScrollTriggers
      const triggers = ScrollTrigger.getAll();
      triggers.forEach(st => st.kill());
    };
  }, []);

  return (
    <div ref={mainRef} className="relative">
      <HeroSection />
      <ManagedBackendSection />
      <FeaturesSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <PricingSection />
      <FAQSection />
      <CTASection />
    </div>
  );
}
