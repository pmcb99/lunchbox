import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { ArrowRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subheadingRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const imageWrapperRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLCanvasElement>(null);

  // Particle animation
  useEffect(() => {
    const canvas = particlesRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
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
    }

    const particles: Particle[] = [];
    const particleCount = 80;
    const connectionDistance = 150;
    const maxConnections = 3;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.2,
      });
    }

    let animationId: number;
    let frameCount = 0;

    const animate = () => {
      frameCount++;
      // Render every 2nd frame for performance (30fps)
      if (frameCount % 2 === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Update and draw particles
        particles.forEach((particle, i) => {
          particle.x += particle.vx;
          particle.y += particle.vy;

          // Wrap around edges
          if (particle.x < 0) particle.x = canvas.width;
          if (particle.x > canvas.width) particle.x = 0;
          if (particle.y < 0) particle.y = canvas.height;
          if (particle.y > canvas.height) particle.y = 0;

          // Draw particle
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`;
          ctx.fill();

          // Draw connections (only check every 3rd particle for performance)
          if (i % 3 === 0) {
            let connections = 0;
            for (let j = i + 1; j < particles.length && connections < maxConnections; j++) {
              const dx = particles[j].x - particle.x;
              const dy = particles[j].y - particle.y;
              const distance = Math.sqrt(dx * dx + dy * dy);

              if (distance < connectionDistance) {
                ctx.beginPath();
                ctx.moveTo(particle.x, particle.y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 * (1 - distance / connectionDistance)})`;
                ctx.stroke();
                connections++;
              }
            }
          }
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

  // GSAP animations - useGSAP handles React 18 StrictMode properly
  useGSAP(() => {
    // Floating animation for image (subtle bob effect)
    gsap.to(imageRef.current, {
      y: -20,
      duration: 3,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });

    // Badge floating animation (using GSAP to preserve translateZ)
    gsap.to(badgeRef.current, {
      y: -10,
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });

    // Scroll-triggered parallax on heading
    gsap.to(headingRef.current, {
      y: -30,
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top top',
        end: '60% top',
        scrub: true,
        invalidateOnRefresh: true,
      },
    });

    // Scroll-triggered parallax on image wrapper (separate from floating animation)
    gsap.to(imageWrapperRef.current, {
      y: -100,
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top top',
        end: '50% top',
        scrub: 0.5,
      },
    });

    // Scroll-triggered rotation on inner image
    gsap.to(imageRef.current, {
      rotateY: 10,
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top top',
        end: '50% top',
        scrub: 0.5,
      },
    });
  }, { scope: sectionRef, dependencies: [] });

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex items-center overflow-hidden bg-black"
    >
      {/* Particle Canvas */}
      <canvas
        ref={particlesRef}
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: 0.6 }}
      />

      {/* Grid Background */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center min-h-[calc(100vh-80px)]">
          {/* Left Column - Text */}
          <div className="flex flex-col justify-center">
            <div className="mb-8" style={{ minHeight: '120px' }}>
              <h1
                ref={headingRef}
                className="text-4xl sm:text-5xl lg:text-4xl xl:text-5xl font-display font-semibold text-white leading-[1.1]"
                style={{ perspective: '1000px', willChange: 'transform' }}
              >
                Self-host your database.
                <br />
                Let Lunchbox handle backup, restore, and history.
              </h1>
            </div>

            <p
              ref={subheadingRef}
              className="text-lg sm:text-xl text-[#a0a0a0] max-w-xl mb-8 leading-relaxed relative z-10"
            >
              Keep SQLite or Postgres exactly where it runs today. Lunchbox adds automatic encrypted backups, point-in-time restores, and git-style revision history — without moving to a managed database.
            </p>

            <ul className="space-y-3 mb-8 text-sm sm:text-base text-[#a0a0a0]">
              <li className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff6b35]" />
                Automatic, encrypted backups for self-hosted databases
              </li>
              <li className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff6b35]" />
                One-command restores to any revision or point in time
              </li>
              <li className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff6b35]" />
                Optional post-quantum encryption for long-lived backups
              </li>
            </ul>

            <div ref={ctaRef} className="flex flex-col sm:flex-row gap-4 mb-8">
              <Button
                asChild
                size="lg"
                className="bg-[#ff6b35] hover:bg-[#ff6b35]/90 text-white px-8 py-6 text-lg font-medium rounded-xl transition-all duration-300 hover:scale-105 animate-pulse-glow"
              >
                <Link to="/platform">
                  Protect my database
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-[#2a2a2a] text-white hover:bg-white/5 px-8 py-6 text-lg font-medium rounded-xl transition-all duration-300 group"
              >
                <a href="/docs">
                  <Play className="mr-2 w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                  View docs
                </a>
              </Button>
            </div>

            <p className="text-sm text-[#a0a0a0]">
              Self-host your database. Let Lunchbox handle the safety net, with managed or bring-your-own storage options.
            </p>
          </div>

          {/* Right Column - 3D Card Image */}
          <div 
            className="relative flex items-center justify-center lg:justify-end"
            style={{ perspective: '1000px' }}
          >
            {/* Wrapper for scroll parallax (y translation) */}
            <div
              ref={imageWrapperRef}
              className="relative w-full max-w-lg lg:max-w-xl"
            >
              {/* Inner element for floating animation and 3D transforms */}
               <div
                 ref={imageRef}
                 className="relative"
                 style={{ 
                   transformStyle: 'preserve-3d',
                   transform: 'translateX(-15px)',
                 }}
               >
                {/* Glow Effect */}
                <div 
                  className="absolute -inset-10 bg-[#ff6b35]/20 rounded-full blur-3xl opacity-50"
                />
                
                {/* Image */}
                  <img
                    src="/lunchbox.png"
                    alt="Lunchbox Backup Interface"
                    className="relative w-full h-auto rounded-2xl shadow-2xl"
                    style={{
                      boxShadow: '0 50px 100px -20px rgba(0,0,0,0.8), 0 30px 60px -30px rgba(255,107,53,0.3)',
                    }}
                  />

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none" />
    </section>
  );
}
