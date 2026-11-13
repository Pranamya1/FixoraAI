import { useState } from 'react';
import { ShieldCheck, Mail, Lock, User, Building2, ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { supabase } from '../services/supabase';

interface AuthViewProps {
  onLogin: (userData: { email: string; name: string; org: string }) => void;
  onStartSignup: (signupData: { email: string; name: string; org: string }) => void;
}

export function AuthView({ onLogin, onStartSignup }: AuthViewProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1-Click Instant Demo Login for Hackathon Evaluators
  const handleDemoAccess = () => {
    try {
      localStorage.setItem('fixora_onboarded_demo@fixora.ai', 'true');
    } catch (e) {
      console.warn(e);
    }
    onLogin({
      email: 'demo@fixora.ai',
      name: 'Judge Reviewer',
      org: 'Enterprise Brand Lab'
    });
  };

  // Handle Email + Password Submit (Real Supabase Auth)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (isSignUp) {
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match. Please re-enter.');
        return;
      }
      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters long.');
        return;
      }
    }

    setLoading(true);

    try {
      if (isSignUp) {
        // Real Supabase User Sign Up
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              full_name: name.trim(),
              company: company.trim()
            }
          }
        });

        if (error) {
          setErrorMessage(error.message);
          setLoading(false);
          return;
        }

        // Direct the user immediately to Onboarding
        onStartSignup({
          email: data.user?.email || email.trim(),
          name: name.trim() || data.user?.user_metadata?.full_name || '',
          org: company.trim() || ''
        });
        return;
      } else {
        // Real Supabase User Sign In
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password
        });

        if (error) {
          setErrorMessage(error.message);
          setLoading(false);
          return;
        }

        if (data.user) {
          const userName =
            data.user.user_metadata?.full_name ||
            data.user.user_metadata?.name ||
            data.user.email?.split('@')[0] ||
            '';
          const userOrg = data.user.user_metadata?.company || '';

          onLogin({
            email: data.user.email || email.trim(),
            name: userName,
            org: userOrg
          });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#ffffff] flex flex-col justify-center items-center p-4 select-none">
      <div className="w-full max-w-md">
        {/* Brand Logo & Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="relative mb-3">
            <img
              src="/fixoraailogo.jpeg"
              alt="FixoraAI Logo"
              className="h-16 w-16 rounded-2xl object-cover shadow-sm border border-[#D1DCE5]"
            />
            <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
              <ShieldCheck className="h-3 w-3 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Fixora<span style={{ color: '#0F172A' }}>AI</span>
          </h1>
        </div>

        {/* Auth Card */}
        <div className="bg-[#E4EBF2] border border-[#D1DCE5] rounded-2xl p-7 shadow-xs">
          {/* Tab Pill Toggle with explicit # hex colors */}
          <div className="flex rounded-lg bg-white/70 p-1 mb-5 border border-[#CBD5E1]">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setErrorMessage(null);
                setSuccessMessage(null);
                setConfirmPassword('');
              }}
              style={{
                backgroundColor: !isSignUp ? '#009DFF' : 'transparent',
                color: !isSignUp ? '#ffffff' : '#475569'
              }}
              className="flex-1 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setErrorMessage(null);
                setSuccessMessage(null);
                setConfirmPassword('');
              }}
              style={{
                backgroundColor: isSignUp ? '#009DFF' : 'transparent',
                color: isSignUp ? '#ffffff' : '#475569'
              }}
              className="flex-1 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer"
            >
              Create Account
            </button>
          </div>

          {/* Real Supabase Error Message Banner */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-300 flex items-start gap-2 text-rose-800 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Success Message Banner */}
          {successMessage && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-300 flex items-start gap-2 text-emerald-800 text-xs">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{successMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isSignUp && (
              <>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Rivera"
                      required={isSignUp}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#009DFF]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Company / Organization
                  </label>
                  <div className="relative">
                    <Building2 className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Acme Global Inc."
                      required={isSignUp}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#009DFF]"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Work Email
              </label>
              <div className="relative">
                <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex.rivera@company.com"
                  required
                  className="w-full pl-9 pr-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#009DFF]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                {!isSignUp && (
                  <button
                    type="button"
                    style={{ color: '#009DFF' }}
                    className="text-[11px] hover:underline font-semibold cursor-pointer"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-9 pr-10 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#009DFF]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {isSignUp && (
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required={isSignUp}
                    className="w-full pl-9 pr-10 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#009DFF]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Submit button with explicit #009DFF hex color */}
            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: '#009DFF',
                color: '#ffffff'
              }}
              className="w-full mt-2 py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer hover:opacity-90 disabled:opacity-50"
            >
              {loading ? (
                <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <>
                  <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>

            {/* Evaluator Quick Access Divider */}
            <div className="relative my-4 flex items-center justify-center">
              <div className="border-t border-[#CBD5E1] w-full" />
              <span className="bg-[#E4EBF2] px-2 text-[10px] uppercase font-bold tracking-wider text-slate-500 whitespace-nowrap">
                For Hackathon Evaluators
              </span>
            </div>

            {/* Instant Judge Demo Access Button */}
            <button
              type="button"
              onClick={handleDemoAccess}
              className="w-full py-2.5 px-3.5 rounded-xl border border-blue-300 bg-linear-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-900 font-bold text-xs flex items-center justify-between shadow-2xs transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-xs text-blue-950 flex items-center gap-1.5">
                    <span>⚡ 1-Click Judge Demo Access</span>
                  </div>
                  <div className="text-[10px] text-blue-700 font-normal">Jump straight into active live workspace</div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-blue-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
