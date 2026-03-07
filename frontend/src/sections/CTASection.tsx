import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

gsap.registerPlugin(ScrollTrigger);

export function CTASection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLCanvasElement>(null);

  // Converging particle animation
  useEffect(() => {
    const canvas = particlesRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = sectionRef.current?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      opacity: number;
      originX: number;
      originY: number;
    }

    const particles: Particle[] = [];
    const particleCount = 60;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const distance = Math.max(canvas.width, canvas.height) * 0.6;
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;
      
      particles.push({
        x,
        y,
        originX: x,
        originY: y,
        vx: 0,
        vy: 0,
        radius: Math.random() * 2 + 1,
        opacity: Math.random() * 0.4 + 0.2,
      });
    }

    let animationId: number;
    let frameCount = 0;

    const animate = () => {
      frameCount++;
      // Render every 2nd frame for performance
      if (frameCount % 2 === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach((particle) => {
          // Move toward center
          const dx = centerX - particle.x;
          const dy = centerY - particle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance > 100) {
            particle.vx = (dx / distance) * 0.8;
            particle.vy = (dy / distance) * 0.8;
          } else {
            // Reset to edge when close to center
            const angle = Math.random() * Math.PI * 2;
            const resetDistance = Math.max(canvas.width, canvas.height) * 0.6;
            particle.x = centerX + Math.cos(angle) * resetDistance;
            particle.y = centerY + Math.sin(angle) * resetDistance;
            particle.opacity = Math.random() * 0.4 + 0.2;
          }

          particle.x += particle.vx;
          particle.y += particle.vy;

          // Fade as approaching center
          const currentDistance = Math.sqrt(
            Math.pow(centerX - particle.x, 2) + Math.pow(centerY - particle.y, 2)
          );
          const fadeStart = 300;
          const fadeEnd = 100;
          if (currentDistance < fadeStart) {
            particle.opacity = Math.max(0, (currentDistance - fadeEnd) / (fadeStart - fadeEnd) * 0.6);
          }

          // Draw particle
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 107, 53, ${particle.opacity})`;
          ctx.fill();
        });
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, []);

  // GSAP animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Heading animation
      gsap.fromTo(
        headingRef.current,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          delay: 0.2,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 70%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      // Description animation
      gsap.fromTo(
        descriptionRef.current,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          delay: 0.6,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 70%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      // CTA animation
      gsap.fromTo(
        ctaRef.current,
        { opacity: 0, scale: 0.8 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.6,
          delay: 0.8,
          ease: 'back.out(1.7)',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 70%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative py-24 lg:py-32 bg-black overflow-hidden"
    >
      {/* Particle Canvas */}
      <canvas
        ref={particlesRef}
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: 0.8 }}
      />

      {/* Center Glow */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(255,107,53,0.2) 0%, transparent 60%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2
          ref={headingRef}
          className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-display font-semibold text-white mb-6"
        >
          Ship backups without the <span className="text-[#ff6b35]">cloud maze.</span>
        </h2>

        <p
          ref={descriptionRef}
          className="text-lg lg:text-xl text-[#a0a0a0] max-w-2xl mx-auto mb-10"
        >
          Use a self-hosted control plane or our managed service. Your data stays in durable object storage with a clean, developer-friendly API.
        </p>

        <div ref={ctaRef} className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            asChild
            size="lg"
            className="bg-[#ff6b35] hover:bg-[#ff6b35]/90 text-white px-10 py-7 text-lg font-medium rounded-xl transition-all duration-300 hover:scale-105 animate-pulse-glow"
          >
            <Link to="/platform">
              Deploy or Get Started
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>

          <Link
            to="/docs"
            className="text-[#a0a0a0] hover:text-white transition-colors duration-300 flex items-center gap-2 group"
          >
            View Documentation
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
