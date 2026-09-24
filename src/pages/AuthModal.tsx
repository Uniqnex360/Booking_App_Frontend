// src/components/AuthModal.tsx
import React, { useState } from 'react';
import { X, Mail, Smartphone, ShieldCheck } from 'lucide-react';

interface ContactDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (details: { email: string; phone: string }) => void;
}

export const AuthModal: React.FC<ContactDetailsModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  // Pre-fill if previously stored in localStorage
  const savedContact = JSON.parse(localStorage.getItem('vyhbz_contact_details') || '{}');
  const [email, setEmail] = useState(savedContact.email || '');
  const [phone, setPhone] = useState(savedContact.phone || '');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !phone) return;

    // Save contact details for ticket delivery
    const contactData = { email, phone };
    localStorage.setItem('vyhbz_contact_details', JSON.stringify(contactData));
    
    // Create a mock/guest session token if your backend needs access_token
    if (!localStorage.getItem('access_token')) {
      localStorage.setItem('access_token', `guest_${crypto.randomUUID()}`);
    }

    onSubmit(contactData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-[420px] bg-white rounded-2xl shadow-2xl overflow-hidden zoom-in-95 animate-in duration-200">
        
        {/* BMS Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#F8F8FA]">
          <div>
            <h2 className="text-base font-bold text-slate-800">Contact Details</h2>
            <p className="text-[11px] text-slate-500">Where should we send your M-Tickets?</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* BMS Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Email Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 text-sm text-slate-800 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1E3D] focus:border-[#7B1E3D]"
                required
                autoFocus
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Your M-Ticket and tax invoice will be sent here
            </p>
          </div>

          {/* Mobile Number Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
              Mobile Number
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-xs font-bold text-slate-500 border-r border-slate-200 pr-2">
                +91
              </span>
              <Smartphone className="absolute left-12 h-4 w-4 text-slate-400" />
              <input
                type="tel"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="9876543210"
                className="w-full pl-20 pr-4 py-3 text-sm text-slate-800 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1E3D] focus:border-[#7B1E3D]"
                required
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              For WhatsApp ticket updates & booking SMS
            </p>
          </div>

          {/* Trust Badge */}
          <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-[11px] text-slate-500">
            <ShieldCheck className="h-4 w-4 text-[#1EA83C] shrink-0" />
            <span>100% Safe & Secure. We do not spam your inbox.</span>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            className="w-full bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-bold py-3.5 rounded-lg transition shadow-md text-sm mt-2"
          >
            Continue to Payment
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;