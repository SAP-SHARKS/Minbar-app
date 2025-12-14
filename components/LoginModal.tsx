import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { X, Mail, ArrowRight, CheckCircle, Loader2 } from 'lucide-react';

export function LoginModal() {
  const { showLoginModal, setShowLoginModal, loginMessage, signInWithMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (showLoginModal) {
      setStatus('idle');
      setErrorMsg('');
    }
  }, [showLoginModal]);

  if (!showLoginModal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    setErrorMsg('');
    
    const { error } = await signInWithMagicLink(email);
    
    if (error) {
      setStatus('error');
      setErrorMsg(error.message || 'Failed to send magic link. Please try again.');
    } else {
      setStatus('success');
    }
  };

  const handleClose = () => {
      setShowLoginModal(false);
      setEmail('');
      setStatus('idle');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-xl relative overflow-hidden">
        <button 
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-all z-10"
        >
            <X size={20} />
        </button>
        
        {status === 'success' ? (
            <div className="text-center py-8 animate-in fade-in zoom-in duration-300">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={32} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h3>
                <p className="text-gray-600 mb-6">
                    We sent a magic link to <span className="font-bold text-gray-900">{email}</span>.<br/>
                    Click the link to sign in.
                </p>
                <button 
                    onClick={handleClose}
                    className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg font-bold hover:bg-gray-200 transition-colors"
                >
                    Close
                </button>
            </div>
        ) : (
            <>
                <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <Mail size={24} />
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-gray-900">Sign in to Minbar</h2>
                    <p className="text-gray-600">
                    {loginMessage || 'Enter your email to receive a magic sign-in link.'}
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email Address</label>
                        <input 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@example.com"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-gray-900 placeholder-gray-400 bg-gray-50 focus:bg-white"
                            required
                            disabled={status === 'loading'}
                        />
                    </div>

                    {status === 'error' && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                            <span className="font-bold">Error:</span> {errorMsg}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={status === 'loading' || !email}
                        className="w-full bg-emerald-600 text-white rounded-xl px-4 py-3.5 hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 transition-all font-bold shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 group"
                    >
                        {status === 'loading' ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : (
                            <>
                                Send Magic Link <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-xs text-gray-400">
                        By signing in, you agree to our Terms of Service and Privacy Policy.
                    </p>
                </div>
            </>
        )}
      </div>
    </div>
  );
}