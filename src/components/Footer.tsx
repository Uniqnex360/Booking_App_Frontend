import { Link } from 'react-router-dom';
import { Wine } from 'lucide-react';

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
    links: ['About Us', 'Contact Us', 'Terms & Conditions', 'Privacy Policy', 'FAQs'],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white text-slate-700 pt-12 pb-8">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 pb-10 border-b border-slate-100">
          <div>
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#7B1E3D] to-[#9B1B3A]">
                <Wine className="h-4 w-4 text-white" strokeWidth={2.2} />
              </div>
              <span className="text-xl font-bold text-[#7B1E3D]">
                Vyhbz
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-slate-500">
              Your gateway to premium cinema experiences, IMAX shows, live concerts, and fine dining reservations.
            </p>
          </div>

          {footerSections.map((col) => (
            <div key={col.title}>
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-900">
                {col.title}
              </p>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link}>
                    <Link
                      to="#"
                      className="text-xs text-slate-500 transition-colors hover:text-[#7B1E3D]"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Vyhbz App. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="#" className="hover:text-[#7B1E3D]">Privacy Policy</Link>
            <Link to="#" className="hover:text-[#7B1E3D]">Terms of Service</Link>
            <Link to="#" className="hover:text-[#7B1E3D]">Cookie Settings</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}