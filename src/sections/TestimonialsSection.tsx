import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Star } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'CTO at TechStart',
    content: 'We migrated our entire infrastructure to Lunchbox in a day. The peace of mind is incredible.',
    rating: 5,
  },
  {
    name: 'Marcus Johnson',
    role: 'Senior DevOps Engineer',
    content: 'Finally, database backups that don\'t wake me up at 3 AM. The immutable revisions are genius.',
    rating: 5,
  },
  {
    name: 'Emily Rodriguez',
    role: 'Full Stack Developer',
    content: 'The CLI is so intuitive. I trained my entire team in 30 minutes.',
    rating: 5,
  },
  {
    name: 'David Kim',
    role: 'Database Administrator',
    content: 'We tested restore times against our old solution. Lunchbox was 10x faster.',
    rating: 5,
  },
  {
    name: 'Lisa Thompson',
    role: 'Engineering Manager',
    content: 'The CI/CD integration is seamless. Our deploy pipeline is now bulletproof.',
    rating: 5,
  },
  {
    name: 'James Wilson',
    role: 'Startup Founder',
    content: 'Self-hosted option was crucial for our compliance needs. Setup took 20 minutes.',
    rating: 5,
  },
];

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

  // Split testimonials into 3 columns
  const columns = [
    testimonials.slice(0, 2),
    testimonials.slice(2, 4),
    testimonials.slice(4, 6),
  ];

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
            Loved by <span className="text-[#ff6b35]">developers</span>
          </h2>
          <p className="text-lg text-[#a0a0a0] max-w-2xl mx-auto">
            Here's what teams are saying about Lunchbox
          </p>
        </div>

        {/* Masonry Grid */}
        <div 
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          style={{ perspective: '1000px' }}
        >
          {columns.map((column, columnIndex) => (
            <div
              key={columnIndex}
              ref={(el) => { columnsRef.current[columnIndex] = el; }}
              className="space-y-6"
              style={{ 
                transform: `translateZ(${columnIndex * 10}px)`,
                marginTop: columnIndex === 1 ? '-50px' : columnIndex === 2 ? '-25px' : '0',
              }}
            >
              {column.map((testimonial, index) => (
                <div
                  key={testimonial.name}
                  className="relative bg-[#1a1a1a]/80 border border-[#2a2a2a] rounded-xl p-6 hover:border-[#ff6b35]/30 transition-all duration-300 group"
                  style={{
                    animation: `float ${5 + (columnIndex + index) * 0.5}s ease-in-out infinite`,
                    animationDelay: `${(columnIndex + index) * 0.3}s`,
                  }}
                >
                  {/* Glow Effect */}
                  <div className="absolute -inset-px bg-gradient-to-br from-[#ff6b35]/10 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-lg" />
                  
                  <div className="relative">
                    {/* Stars */}
                    <div className="flex gap-1 mb-4">
                      {Array.from({ length: testimonial.rating }).map((_, i) => (
                        <Star
                          key={i}
                          className="w-4 h-4 fill-[#ff6b35] text-[#ff6b35]"
                          style={{
                            animation: `pulse 2s ease-in-out infinite`,
                            animationDelay: `${i * 0.2}s`,
                          }}
                        />
                      ))}
                    </div>

                    {/* Content */}
                    <p className="text-white mb-6 leading-relaxed">
                      "{testimonial.content}"
                    </p>

                    {/* Author */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ff6b35] to-[#ff8f5a] flex items-center justify-center text-white font-medium text-sm">
                        {testimonial.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div className="text-white font-medium text-sm">
                          {testimonial.name}
                        </div>
                        <div className="text-[#a0a0a0] text-xs">
                          {testimonial.role}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
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
