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
    answer: 'Yes. Lunchbox is designed to be self-hostable from day one. Run the control plane on your own infrastructure and point backups at your own S3, R2, or GCS bucket (BYOB).',
  },
  {
    question: 'How does the pricing work?',
    answer: 'Self-hosted: you run the software and use your own storage (S3, R2, GCS). Managed: a platform fee plus usage; storage includes a GB-month allowance with overages on deduped storage and restore history.',
  },
  {
    question: 'Why not just use S3 + Litestream?',
    answer: 'You can. Lunchbox exists to remove the multi-key, multi-bucket setup and give you one secure place to manage backups, retention, and restores without living in cloud IAM.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes. All revisions are encrypted at rest and transmitted over TLS 1.3. With client-side encryption enabled, we can\'t read your data.',
  },
  {
    question: 'Can I restore to a specific point in time?',
    answer: 'Yes, for PostgreSQL with continuous WAL archiving enabled (managed or self-hosted). SQLite supports revision-based restore.',
  },
  {
    question: 'Do you offer team collaboration?',
    answer: 'Yes. Team features include roles and audit history. SSO and SCIM are available for enterprise support plans.',
  },
  {
    question: 'Do you support enterprise requirements?',
    answer: 'Yes. We can support SSO/SCIM, custom retention, security reviews, and support contracts while keeping the core product developer-first.',
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
                src="/lunchbox.png"
                alt="Lunchbox FAQ"
                className="relative w-full h-auto max-w-sm mx-auto rounded-2xl shadow-2xl"
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
