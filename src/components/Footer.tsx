import { Link } from 'react-router-dom';
import { Wine } from 'lucide-react';

const footerSections = [
  {
    title: 'Discover',
    links: ['Movies', 'Events', 'Restaurants', 'Gift cards'],
  },
  {
    title: 'Company',
    links: ['About us', 'Careers', 'Press', 'Contact'],
  },
  {
    title: 'Support',
    links: ['Help center', 'Privacy', 'Terms', 'Cookie policy'],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      {/* <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-500">
                <Wine className="h-4 w-4 text-slate-900" strokeWidth={2.2} />
              </div>
              <span className="font-serif text-xl font-semibold text-slate-900">
                Vyhbz App
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-slate-500">
              Curated experiences, effortlessly booked. Your gateway to
              memorable moments.
            </p>
          </div>
          {footerSections.map((col) => (
            <div key={col.title}>
              <p className="mb-3 text-sm font-semibold text-slate-900">
                {col.title}
              </p>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link}>
                    <Link
                      to="#"
                      className="text-sm text-slate-500 transition-colors hover:text-amber-700"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6 sm:flex-row">
          <p className="text-xs text-slate-500">
            © 2026 Vyhbz App. All rights reserved.
          </p>
          <p className="text-xs text-slate-500">
            Crafted with care for memorable moments.
          </p>
        </div>
      </div> */}
    </footer>
  );
}
