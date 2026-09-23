// src/components/Footer.tsx
import { Link } from 'react-router-dom';
import { Wine, Facebook, Twitter, Instagram, Youtube, HeadphonesIcon, TicketIcon, MailIcon } from 'lucide-react';

const footerSections = [
  {
    title: 'Movies By Genre',
    links: ['Action Movies', 'Comedy Movies', 'Drama Movies', 'Romance Movies', 'Thriller Movies'],
  },
  {
    title: 'Movies By Language',
    links: ['Malayalam Movies', 'Tamil Movies', 'Hindi Movies', 'English Movies', 'Telugu Movies'],
  },
  {
    title: 'Help & Support',
    // Notice the updated path for Terms & Conditions
    links: [
      { name: 'About Us', path: '#' },
      { name: 'Contact Us', path: '#' },
      { name: 'Terms & Conditions', path: '/terms' },
      { name: 'Privacy Policy', path: '#' },
      { name: 'FAQs', path: '#' }
    ],
  },
];

const socials = [
  { icon: Facebook, href: '#' },
  { icon: Twitter, href: '#' },
  { icon: Instagram, href: '#' },
  { icon: Youtube, href: '#' },
];

export function Footer() {
  return (
    <footer className="bg-[#313035] text-[#cccccc] pt-8 pb-12 mt-auto">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
        
        {/* BMS Style Top Strip: Support & Contact */}
        <div className="flex flex-col md:flex-row items-center justify-around py-6 border-b border-[#444444] gap-6 mb-8 text-center">
          <div className="flex flex-col items-center group cursor-pointer">
            <div className="text-[#888888] group-hover:text-white transition-colors mb-2">
              <HeadphonesIcon size={36} strokeWidth={1.5} />
            </div>
            <span className="text-xs font-semibold text-[#888888] group-hover:text-white transition-colors">24/7 CUSTOMER CARE</span>
          </div>
          <div className="flex flex-col items-center group cursor-pointer">
            <div className="text-[#888888] group-hover:text-white transition-colors mb-2">
              <TicketIcon size={36} strokeWidth={1.5} />
            </div>
            <span className="text-xs font-semibold text-[#888888] group-hover:text-white transition-colors">RESEND BOOKING CONFIRMATION</span>
          </div>
          <div className="flex flex-col items-center group cursor-pointer">
            <div className="text-[#888888] group-hover:text-white transition-colors mb-2">
              <MailIcon size={36} strokeWidth={1.5} />
            </div>
            <span className="text-xs font-semibold text-[#888888] group-hover:text-white transition-colors">SUBSCRIBE TO NEWSLETTER</span>
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 pb-10">
          <div className="lg:col-span-1">
            <p className="mb-4 text-xs font-bold uppercase tracking-wider text-white">
              Vyhbz App
            </p>
            <p className="max-w-xs text-xs leading-relaxed text-[#888888] mb-5">
              Your gateway to premium cinema experiences, IMAX shows, live concerts, and fine dining reservations.
            </p>
            {/* App badges */}
            <div className="flex flex-col gap-2">
              <a href="#" className="flex items-center gap-2 rounded-md border border-[#444444] px-3 py-2 hover:border-white transition max-w-[140px]">
                <span className="text-[10px] leading-tight">
                  <span className="block text-[#888888]">Get it on</span>
                  <span className="block font-bold text-white">Google Play</span>
                </span>
              </a>
              <a href="#" className="flex items-center gap-2 rounded-md border border-[#444444] px-3 py-2 hover:border-white transition max-w-[140px]">
                <span className="text-[10px] leading-tight">
                  <span className="block text-[#888888]">Download on</span>
                  <span className="block font-bold text-white">App Store</span>
                </span>
              </a>
            </div>
          </div>

          {footerSections.map((col) => (
            <div key={col.title}>
              <p className="mb-4 text-xs font-bold uppercase tracking-wider text-white">
                {col.title}
              </p>
              <ul className="space-y-2">
                {col.links.map((link, idx) => (
                  <li key={idx}>
                    {typeof link === 'string' ? (
                      <Link to="#" className="text-xs text-[#888888] transition-colors hover:text-white">
                        {link}
                      </Link>
                    ) : (
                      <Link to={link.path} className="text-xs text-[#888888] transition-colors hover:text-white">
                        {link.name}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* BMS Centered Logo & Socials with Horizontal Lines */}
        <div className="relative flex items-center justify-center py-6 my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#444444]"></div>
          </div>
          <div className="relative bg-[#313035] px-6 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F84464]">
              <Wine className="h-5 w-5 text-white" strokeWidth={2} />
            </div>
            <span className="text-2xl font-bold tracking-wide text-white">Vyhbz</span>
          </div>
        </div>

        <div className="flex justify-center gap-4 mb-8">
          {socials.map((s, i) => (
            <a
              key={i}
              href={s.href}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#444444] text-white hover:bg-white hover:text-[#313035] transition-colors duration-300"
            >
              <s.icon className="h-5 w-5" />
            </a>
          ))}
        </div>

        {/* Copyright & Bottom Links */}
        <div className="flex flex-col items-center justify-center text-[11px] text-[#888888] text-center">
          <p className="mb-2">
            Copyright {new Date().getFullYear()} © Vyhbz Entertainment Pvt. Ltd. All Rights Reserved.
          </p>
          <p className="max-w-4xl mx-auto leading-relaxed">
            The content and images used on this site are copyright protected and copyrights vests with the respective owners. 
            The usage of the content and images on this website is intended to promote the works and no endorsement of the artist shall be implied. 
            Unauthorized use is prohibited and punishable by law.
          </p>
        </div>
      </div>
    </footer>
  );
}