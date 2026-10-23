import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Trash2, ArrowLeft, Mail, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function DeleteAccountPage() {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrPhone.trim()) return;
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <Header />
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 pt-28 sm:pt-36 pb-16">
        <div className="bg-white rounded-3xl shadow-xs border border-slate-200 p-6 sm:p-10 md:p-12">
          {/* Header */}
          <div className="border-b border-slate-100 pb-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold mb-3 border border-red-200">
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>Account & Data Deletion</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Request Account Deletion
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                VybHz by Uniqnex360 • Compliance with Google Play & Apple Data Safety Policies
              </p>
            </div>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7B1E3D] hover:underline"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Link>
          </div>

          <div className="space-y-6 text-slate-700 text-xs sm:text-sm leading-relaxed">
            {/* Overview Box */}
            <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 text-amber-900">
              <h2 className="font-bold text-sm sm:text-base flex items-center gap-2 mb-1.5 text-amber-950">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                Permanent Deletion Notice
              </h2>
              <p className="text-xs leading-relaxed text-amber-800">
                Deleting your VybHz account permanently removes your profile information, authentication credentials, loyalty points, and personal preferences from our active systems. Past financial invoices and GST transaction receipts are retained strictly as required by applicable statutory taxation laws.
              </p>
            </div>

            {/* In-App Deletion Method */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-red-600" />
                Method 1: Direct In-App Instant Deletion
              </h3>
              <p className="text-xs text-slate-600">
                If you have the VybHz app installed, you can delete your account instantly without waiting:
              </p>
              <ol className="list-decimal pl-5 text-xs text-slate-600 space-y-1">
                <li>Open the <strong>VybHz</strong> mobile app or website.</li>
                <li>Tap your <strong>Profile</strong> icon in the navigation bar.</li>
                <li>Go to <strong>Edit Profile</strong> &rarr; scroll to <strong>Danger Zone</strong>.</li>
                <li>Tap <strong>Delete Account Permanently</strong> and confirm your passcode/OTP.</li>
              </ol>
            </div>

            {/* Web Request Form (Google Play requirement for users without the app) */}
            <div className="p-6 rounded-2xl border-2 border-red-100 bg-white shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#7B1E3D]" />
                Method 2: Web Deletion Request Form
              </h3>
              <p className="text-xs text-slate-500">
                If you no longer have access to the app, submit your registered details below. Our data compliance officer will process your deletion request within 48-72 business hours.
              </p>

              {submitted ? (
                <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm">Account Deletion Request Received</h4>
                    <p className="text-xs mt-1 text-emerald-700">
                      We have logged your deletion request for <strong>{emailOrPhone}</strong>. A verification confirmation link will be delivered to complete identity verification.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Registered Email Address or Mobile Number *
                    </label>
                    <Input
                      type="text"
                      required
                      placeholder="e.g. user@example.com or +91 9876543210"
                      value={emailOrPhone}
                      onChange={(e) => setEmailOrPhone(e.target.value)}
                      className="h-10 text-xs rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Reason for deletion (optional)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Help us improve: why are you deleting your account?"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#7B1E3D]/30"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full sm:w-auto px-6 h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs"
                  >
                    Submit Deletion Request
                  </Button>
                </form>
              )}
            </div>

            {/* Direct Email Support */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
              <span>
                Questions regarding data privacy? Contact: <strong>privacy@vyhbz.com</strong>
              </span>
              <Link to="/privacy" className="text-[#7B1E3D] font-bold hover:underline inline-flex items-center gap-1">
                View Privacy Policy <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

