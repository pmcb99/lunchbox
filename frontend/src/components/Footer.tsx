import { Link } from 'react-router-dom';
import { Github, Twitter, MessageCircle } from 'lucide-react';

export function Footer() {
  const productLinks = [
    { label: 'Features', href: '/#features' },
    { label: 'Pricing', href: '/#pricing' },
    { label: 'Changelog', href: '#' },
    { label: 'Roadmap', href: '#' },
  ];

  const resourceLinks = [
    { label: 'Documentation', href: '/docs' },
    { label: 'API Reference', href: '/docs#api-reference' },
    { label: 'GitHub', href: 'https://github.com' },
    { label: 'Blog', href: '#' },
  ];

  const legalLinks = [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
    { label: 'Security', href: '#' },
  ];

  return (
    <footer className="bg-[#111111] border-t border-[#2a2a2a]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer */}
        <div className="py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img
                src="/lunchbox.png"
                alt="Lunchbox"
                className="w-8 h-8 object-cover"
              />
              <span className="text-xl font-display font-semibold text-white">
                lunchbox<span className="text-[#ff6b35]">.</span>
              </span>
            </Link>
            <p className="text-[#a0a0a0] text-sm max-w-xs mb-6">
              Developer-first database backups. Immutable, content-addressed revisions with one-command sync.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-[#a0a0a0] hover:text-white hover:border-[#ff6b35]/50 transition-all duration-300 hover:scale-110"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-[#a0a0a0] hover:text-white hover:border-[#ff6b35]/50 transition-all duration-300 hover:scale-110"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="https://discord.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-[#a0a0a0] hover:text-white hover:border-[#ff6b35]/50 transition-all duration-300 hover:scale-110"
              >
                <MessageCircle className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-white font-display font-medium mb-4">Product</h4>
            <ul className="space-y-3">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-[#a0a0a0] text-sm hover:text-white transition-colors duration-300 inline-flex items-center gap-1 group"
                  >
                    <span className="transition-transform duration-300 group-hover:translate-x-1">
                      {link.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h4 className="text-white font-display font-medium mb-4">Resources</h4>
            <ul className="space-y-3">
              {resourceLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-[#a0a0a0] text-sm hover:text-white transition-colors duration-300 inline-flex items-center gap-1 group"
                  >
                    <span className="transition-transform duration-300 group-hover:translate-x-1">
                      {link.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-white font-display font-medium mb-4">Legal</h4>
            <ul className="space-y-3">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-[#a0a0a0] text-sm hover:text-white transition-colors duration-300 inline-flex items-center gap-1 group"
                  >
                    <span className="transition-transform duration-300 group-hover:translate-x-1">
                      {link.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-6 border-t border-[#2a2a2a] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[#a0a0a0] text-sm">
            © 2026 Lunchbox, Inc. All rights reserved.
          </p>
          <p className="text-[#a0a0a0] text-sm">
            Built for developers. Enterprise support available.
          </p>
        </div>
      </div>
    </footer>
  );
}
