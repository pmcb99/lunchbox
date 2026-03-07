import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isAuthenticated, setAuth } from '@/lib/auth';
import { signup } from '@/lib/api';

export function PlatformLoginPage() {
  const navigate = useNavigate();

  if (isAuthenticated()) {
    return <Navigate to="/platform" replace />;
  }

  const handleLogin = async () => {
    try {
      const email = 'demo@lunchbox.dev';
      const password = 'lunchbox-demo';

      const response = await signup({ email, password });
      setAuth(response.data.email, response.data.token);
      navigate('/platform');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute -top-32 right-0 w-[500px] h-[500px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(255,107,53,0.18) 0%, transparent 70%)' }}
          />
          <div
            className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(255,107,53,0.12) 0%, transparent 70%)' }}
          />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 py-20">
          <div className="mb-10 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <img src="/lunchbox.png" alt="Lunchbox" className="w-9 h-9 object-cover" />
              <span className="text-xl font-display font-semibold">
                lunchbox<span className="text-[#ff6b35]">.</span>
              </span>
            </Link>
            <Link
              to="/docs"
              className="text-sm text-[#a0a0a0] hover:text-white transition-colors duration-300"
            >
              View docs
            </Link>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#777] mb-5">
                <ShieldCheck className="w-4 h-4 text-[#ff6b35]" />
                Demo access
              </div>
              <h1 className="text-4xl lg:text-5xl font-display font-semibold mb-5">
                Platform preview
              </h1>
              <p className="text-[#a0a0a0] text-lg leading-relaxed mb-8">
                Sign in to explore the platform UI with real backend integration.
              </p>

              <Button
                size="lg"
                onClick={handleLogin}
                className="bg-[#ff6b35] hover:bg-[#ff6b35]/90 text-white px-8 py-6 text-lg font-medium rounded-xl transition-all duration-300 hover:scale-[1.02]"
              >
                Sign in
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>

            <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-2xl p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-[#ff6b35]/10 border border-[#ff6b35]/30 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-[#ff6b35]" />
                </div>
                <div>
                  <div className="text-lg font-display font-semibold">What you will see</div>
                  <div className="text-sm text-[#777]">Dummy data only</div>
                </div>
              </div>

              <ul className="space-y-4 text-sm text-[#a0a0a0]">
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-[#ff6b35] mt-2" />
                  Database inventory with revisions, schedules, and retention summaries.
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-[#ff6b35] mt-2" />
                  Restore activity, health checks, and storage usage overviews.
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-[#ff6b35] mt-2" />
                  Placeholder controls for API keys and compliance settings.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
