import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../context/AuthContext.jsx";
import { LockIcon, AlertTriangleIcon, LogoIcon } from "../components/Icons.jsx";

export default function AuthPage({ googleConfigured }) {
  const { login, register, loginWithGoogle } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (isRegister) {
        if (!name.trim()) throw new Error("Please enter your name");
        if (password.length < 6) throw new Error("Password must be at least 6 characters");
        await register(name.trim(), email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError(null);
    setSubmitting(true);
    try {
      if (!credentialResponse.credential) {
        throw new Error("No Google credentials returned.");
      }
      await loginWithGoogle(credentialResponse.credential);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-ivory flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans text-refined ambient-glow-login">
      {/* Background ambient lighting effects */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-mallow/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-mallow/50 rounded-full blur-[120px] pointer-events-none" />

      {/* Center Wrapper */}
      <div className="w-full max-w-md relative z-10 flex flex-col items-center">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6 w-full">
          <div className="w-16 h-16 mb-4 rounded-2xl bg-refined flex items-center justify-center shadow-md text-white">
            <LogoIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-refined tracking-tight">
            KnowledgeBase
          </h1>
          <p className="text-xs sm:text-sm text-mineral mt-1.5 max-w-xs">
            Your personal knowledge vault with isolated vector search & RAG
          </p>
        </div>

        {/* Auth Card */}
        <div className="w-full rounded-3xl bg-canvas border border-border p-6 sm:p-8 shadow-xl flex flex-col gap-5">
          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-fade-in-up">
              <AlertTriangleIcon className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Google Sign-In Section */}
          <div>
            {googleConfigured ? (
              <div className="flex justify-center w-full">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError("Google sign-in popup was cancelled or failed.")}
                  theme="outline"
                  shape="pill"
                  size="large"
                  text={isRegister ? "signup_with" : "signin_with"}
                  width="100%"
                />
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-ivory border border-border text-center flex flex-col items-center justify-center">
                <div className="flex items-center gap-2 text-xs font-semibold text-refined">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Google Sign-In Ready</span>
                </div>
                <p className="text-[10px] text-mineral mt-1">
                  Add <code className="text-refined bg-canvas border border-border px-1 py-0.5 rounded">VITE_GOOGLE_CLIENT_ID</code> to client/.env to activate
                </p>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="flex-grow border-t border-border"></div>
            <span className="shrink-0 px-3 text-[11px] font-medium text-mineral uppercase tracking-wider">
              or with email
            </span>
            <div className="flex-grow border-t border-border"></div>
          </div>

          {/* Tabs: Sign In / Create Account */}
          <div className="flex rounded-xl bg-ivory p-1 border border-border">
            <button
              type="button"
              onClick={() => {
                setIsRegister(false);
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                !isRegister
                  ? "bg-refined text-white shadow-2xs"
                  : "text-mineral hover:text-refined"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegister(true);
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                isRegister
                  ? "bg-refined text-white shadow-2xs"
                  : "text-mineral hover:text-refined"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {isRegister && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-refined">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Mercer"
                  className="w-full px-4 py-2.5 rounded-xl bg-canvas border border-border focus:border-refined focus:ring-2 focus:ring-mallow text-refined text-xs outline-none transition-all placeholder:text-mineral-light"
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-refined">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@example.com"
                className="w-full px-4 py-2.5 rounded-xl bg-canvas border border-border focus:border-refined focus:ring-2 focus:ring-mallow text-refined text-xs outline-none transition-all placeholder:text-mineral-light"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-refined">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl bg-canvas border border-border focus:border-refined focus:ring-2 focus:ring-mallow text-refined text-xs outline-none transition-all placeholder:text-mineral-light"
              />
              {isRegister && (
                <p className="text-[10px] text-mineral">
                  Must be at least 6 characters
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-1 py-3 px-4 rounded-xl bg-refined hover:bg-refined-hover text-white font-semibold text-xs sm:text-sm transition-all shadow-xs disabled:opacity-60 cursor-pointer"
            >
              {submitting
                ? "Please wait…"
                : isRegister
                ? "Create Account & Get Started"
                : "Sign In"}
            </button>
          </form>

          {/* Security note */}
          <div className="pt-1 text-center">
            <p className="text-[11px] text-mineral flex items-center justify-center gap-1.5">
              <LockIcon className="w-3.5 h-3.5" />
              <span>All documents and vectors are strictly isolated to your account.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
