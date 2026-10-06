'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  Copy,
  Check,
  Terminal,
  ExternalLink,
  ArrowRight,
  Lock,
  Server,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

function MarketplaceOnboardingContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('x-gcp-marketplace-token') || searchParams.get('jwt');

  const [copied, setCopied] = useState(false);
  const [tenantName, setTenantName] = useState('enterprise-pilot');
  const [resolving, setResolving] = useState(false);
  const [resolveSuccess, setResolveSuccess] = useState(false);
  const [resolvedAccount, setResolvedAccount] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      setResolving(true);
      fetch('/api/marketplace/google/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
        .then((res) => res.json())
        .then((data) => {
          setResolving(false);
          if (data.success) {
            setResolveSuccess(true);
            setResolvedAccount(data.account);
          } else {
            setResolveError(data.error || 'Failed to link Google Marketplace account');
          }
        })
        .catch((err) => {
          setResolving(false);
          setResolveError(err.message || 'Network error connecting to marketplace resolver');
        });
    }
  }, [token]);

  const connectionSnippet = `gcloud run services add-iam-policy-binding mastyf-agent-gateway-authz \\
  --region us-central1 \\
  --member="serviceAccount:YOUR_AGENT_GATEWAY_SA@YOUR_PROJECT.iam.gserviceaccount.com" \\
  --role="roles/run.invoker"`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(connectionSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col justify-between selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-cyan-500/10 via-blue-500/5 to-transparent blur-[120px] rounded-full" />
      </div>

      {/* Top Navbar */}
      <header className="relative z-10 border-b border-slate-800/80 bg-[#07090e]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/20">
            M
          </div>
          <span className="font-semibold text-lg tracking-tight text-white">Mastyf AI</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
            Google Cloud Marketplace
          </span>
        </div>
        <Link
          href="/dashboard"
          className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1.5"
        >
          Console <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-3xl mx-auto px-6 py-12 flex-1 flex flex-col justify-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-950/30 text-cyan-300 text-xs font-mono mb-6 self-start">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Google Agent Gateway Service Extension Verified</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
          Activate Mastyf Shield for your Google Cloud Project
        </h1>
        <p className="text-slate-400 text-sm sm:text-base mb-8 leading-relaxed">
          Welcome from the Google Cloud Marketplace. Complete this one-time binding to attach the Mastyf
          External Processing authorization filter to your Google Cloud Agent Gateway.
        </p>

        {/* Dynamic Token Resolution State */}
        {resolving && (
          <div className="bg-cyan-950/20 border border-cyan-800/50 rounded-xl p-4 mb-6 flex items-center gap-3 text-cyan-300 text-sm">
            <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
            <span>Resolving Google Cloud Marketplace Entitlement with Partner Procurement API...</span>
          </div>
        )}

        {resolveSuccess && (
          <div className="bg-emerald-950/20 border border-emerald-800/50 rounded-xl p-4 mb-6 flex items-start gap-3 text-emerald-300 text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <div className="font-medium text-emerald-200">Marketplace Entitlement Linked Successfully</div>
              <div className="text-xs text-emerald-400/80 font-mono mt-1">
                GCP Account: {resolvedAccount} &bull; Status: Active
              </div>
            </div>
          </div>
        )}

        {resolveError && (
          <div className="bg-red-950/20 border border-red-800/50 rounded-xl p-4 mb-6 flex items-start gap-3 text-red-300 text-sm">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
            <div>
              <div className="font-medium text-red-200">Token Resolution Notice</div>
              <div className="text-xs text-red-400/80 mt-1">{resolveError}</div>
            </div>
          </div>
        )}

        {/* Tenant Configuration Card */}
        <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-6 mb-6 shadow-2xl shadow-black/40">
          <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Server className="w-4 h-4 text-cyan-400" />
            1. Configure Tenant Namespace
          </h2>
          <div className="space-y-3">
            <label className="text-xs text-slate-400">Enterprise Tenant Identifier</label>
            <input
              type="text"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              className="w-full bg-[#07090e] border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition font-mono"
            />
            <p className="text-[11px] text-slate-500">
              This identifier partitions your capability policies, secret scanning rules, and audit logs.
            </p>
          </div>
        </div>

        {/* One-Click Binding Snippet */}
        <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-6 mb-8 shadow-2xl shadow-black/40">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              2. Grant Envoy Agent Gateway Invoker IAM Role
            </h2>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="bg-[#07090e] border border-slate-800 rounded-lg p-4 text-xs font-mono text-cyan-300 overflow-x-auto leading-relaxed">
            {connectionSnippet}
          </pre>
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>Endpoint: <code>mastyf-agent-gateway-authz-gwgjarmhoa-uc.a.run.app:443</code> (mTLS OIDC)</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-sm transition shadow-lg shadow-cyan-500/20 flex items-center gap-2"
          >
            Open Mastyf Cloud Dashboard <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="https://cloud.google.com/marketplace"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-3 rounded-lg border border-slate-800 hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 text-sm transition flex items-center gap-1.5"
          >
            Marketplace Listing <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-900 px-6 py-4 text-center text-xs text-slate-600">
        Mastyf AI &bull; Google Cloud Marketplace Partner Integration &bull; Powered by Google Cloud Run
      </footer>
    </div>
  );
}

export default function GoogleMarketplaceOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#07090e] flex items-center justify-center text-cyan-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      }
    >
      <MarketplaceOnboardingContent />
    </Suspense>
  );
}
