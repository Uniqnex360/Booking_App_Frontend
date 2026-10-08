import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Trash2, Mail, ExternalLink } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col font-sans">
      <Header />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 pt-28 sm:pt-36 pb-16">
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6 sm:p-10 md:p-12">
          <div className="flex items-center justify-between border-b border-gray-100 pb-6 mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#7B1E3D]/10 text-[#7B1E3D] text-xs font-bold mb-3">
                <Shield className="h-3.5 w-3.5" />
                <span>Privacy & Data Protection</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                Privacy Policy
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Last updated: October 2026 • VybHz by Uniqnex360
              </p>
            </div>
            <Link
              to="/"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-[#7B1E3D] hover:underline"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Link>
          </div>

          <div className="space-y-8 text-gray-700 text-xs sm:text-sm leading-relaxed">
            <section>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-2">1. Overview</h2>
              <p>
                Uniqnex360 ("we", "our", or "us") operates the <strong>VybHz</strong> mobile application and web platform. This Privacy Policy describes how we collect, use, disclose, and safeguard your personal data when you use our entertainment ticketing and experience booking services.
              </p>
            </section>

            <section>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-2">2. Data We Collect</h2>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong>Personal Identification:</strong> Name, email address, mobile telephone number, and delivery city.</li>
                <li><strong>Transaction Records:</strong> Booking references, seat reservations, showtimes, and purchase history.</li>
                <li><strong>Authentication Data:</strong> Login credentials, secure tokens, and OTP verification logs.</li>
                <li><strong>Device & Diagnostics:</strong> App version, operating system, and crash logs to maintain stability.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-2">3. Payment Information</h2>
              <p>
                Payments are securely processed via certified payment gateways (such as Razorpay). We do <strong>not</strong> store your credit/debit card numbers, CVVs, or UPI PINs on our servers. All financial transactions are encrypted using industry-standard TLS protocols.
              </p>
            </section>

            <section>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-2">4. Device Permissions</h2>
              <p>
                The VybHz Android app only requests permissions essential for core operations:
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li><code>android.permission.INTERNET</code>: Required to access real-time showtimes, seat maps, and ticketing services.</li>
              </ul>
              <p className="mt-2 text-gray-500">
                The app does not access your microphone, contacts, biometric data, or advertising identifiers without your explicit authorization.
              </p>
            </section>

            <section className="rounded-xl border border-red-200 bg-red-50/50 p-5">
              <h2 className="text-base font-bold text-red-900 flex items-center gap-2 mb-2">
                <Trash2 className="h-4 w-4 text-red-600" />
                5. Account & Data Deletion
              </h2>
              <p className="text-red-800/90 mb-3">
                In compliance with Google Play Developer policies, you have the right to request deletion of your account and personal data at any time:
              </p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <a
                  href="https://booking-app-frontend-navy.vercel.app/delete-account.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition shadow-xs"
                >
                  <span>Request account deletion</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <span className="text-xs text-red-700">or email us at <strong>privacy@vyhbz.com</strong></span>
              </div>
            </section>

            <section>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-2">6. Contact Us</h2>
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#7B1E3D]" />
                <span>For any privacy inquiries or grievances: <strong>support@vyhbz.com</strong></span>
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

