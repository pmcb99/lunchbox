import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

gsap.registerPlugin(ScrollTrigger);

const faqs = [
  {
    question: 'What databases does Lunchbox support?',
    answer: 'Lunchbox currently supports SQLite and PostgreSQL. MySQL support is coming in Q2 2026.',
  },
  {
    question: 'Can I self-host Lunchbox?',
    answer: 'Yes! Our Enterprise plan includes a self-hosted option. You maintain full control of your data.',
  },
  {
    question: 'How does the pricing work?',
    answer: 'Pricing is based on storage and retention. The Free tier includes 1GB, Pro includes 100GB.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Absolutely. All revisions are encrypted at rest with AES-256 and transmitted over TLS 1.3.',
  },
  {
    question: 'Can I restore to a specific point in time?',
    answer: 'Yes, for PostgreSQL with continuous archiving enabled. SQLite supports revision-based restore.',
  },
  {
    question: 'Do you offer team collaboration?',
    answer: 'Yes, Pro and Enterprise plans include team features with role-based access control.',
  },
];

export function FAQSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const accordionRef = useRef<HTMLDivElement>(null);

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

      // Image animation
      gsap.fromTo(
        imageRef.current,
        { opacity: 0, rotateY: -30 },
        {
          opacity: 1,
          rotateY: 0,
          duration: 1,
          delay: 0.2,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 60%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      // Floating animation for image
      gsap.to(imageRef.current, {
        y: -10,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      // Accordion items animation
      const accordionItems = accordionRef.current?.querySelectorAll('[data-accordion-item]');
      accordionItems?.forEach((item, index) => {
        gsap.fromTo(
          item,
          { opacity: 0, x: 50 },
          {
            opacity: 1,
            x: 0,
            duration: 0.5,
            delay: 0.3 + index * 0.1,
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
      ref={sectionRef}
      className="relative py-24 lg:py-32 bg-black overflow-hidden"
    >
      <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div ref={headerRef} className="text-center mb-16 lg:mb-20">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-semibold text-white mb-4">
            Frequently asked <span className="text-[#ff6b35]">questions</span>
          </h2>
          <p className="text-lg text-[#a0a0a0] max-w-2xl mx-auto">
            Everything you need to know about Lunchbox
          </p>
        </div>

        {/* Content Grid */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left Column - Sticky Image */}
          <div 
            ref={imageRef}
            className="relative hidden lg:block sticky top-32"
            style={{ perspective: '1000px' }}
          >
            <div 
              className="relative"
              style={{
                transform: 'rotateY(5deg)',
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Glow Effect */}
              <div 
                className="absolute -inset-10 bg-[#ff6b35]/10 rounded-full blur-3xl opacity-50"
                style={{ transform: 'translateZ(-50px)' }}
              />
              
              <img
                src="/faq-card.jpg"
                alt="Lunchbox FAQ"
                className="relative w-full h-auto rounded-2xl shadow-2xl"
                style={{
                  boxShadow: '0 50px 100px -20px rgba(0,0,0,0.8), 0 30px 60px -30px rgba(255,107,53,0.2)',
                }}
              />
            </div>
          </div>

          {/* Right Column - Accordion */}
          <div ref={accordionRef}>
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  data-accordion-item
                  className="bg-[#1a1a1a]/80 border border-[#2a2a2a] rounded-xl px-6 data-[state=open]:border-[#ff6b35]/30 transition-all duration-300 hover:border-[#ff6b35]/20"
                >
                  <AccordionTrigger className="text-left text-white font-display font-medium hover:no-underline py-5 group">
                    <span className="group-hover:text-[#ff6b35] transition-colors duration-300">
                      {faq.question}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-[#a0a0a0] pb-5 leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
}
