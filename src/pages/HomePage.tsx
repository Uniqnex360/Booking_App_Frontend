import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Wine,
  Search,
  Calendar,
  MapPin,
  Users,
  Star,
  ArrowRight,
  Sparkles,
  Utensils,
  Music,
  Sparkle,
  Heart,
  Clock,
  TrendingUp,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';

const categories = [
  {
    icon: Utensils,
    title: 'Dining',
    count: '320+ venues',
    image:
      'https://images.pexels.com/photos/32568165/pexels-photo-32568165.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
    accent: 'from-amber-900/80 to-amber-950/90',
  },
  {
    icon: Wine,
    title: 'Wine Tastings',
    count: '150+ estates',
    image:
      'https://images.pexels.com/photos/20151747/pexels-photo-20151747.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
    accent: 'from-wine-700/80 to-wine-950/90',
  },
  {
    icon: Music,
    title: 'Live Events',
    count: '200+ shows',
    image:
      'https://images.pexels.com/photos/4218027/pexels-photo-4218027.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
    accent: 'from-purple-900/80 to-slate-950/90',
  },
  {
    icon: Sparkle,
    title: 'Spa & Wellness',
    count: '80+ retreats',
    image:
      'https://images.pexels.com/photos/18120173/pexels-photo-18120173.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
    accent: 'from-teal-800/80 to-slate-950/90',
  },
  {
    icon: Users,
    title: 'Workshops',
    count: '120+ classes',
    image:
      'https://images.pexels.com/photos/15323383/pexels-photo-15323383.png?auto=compress&cs=tinysrgb&h=400&w=600',
    accent: 'from-orange-800/80 to-stone-950/90',
  },
  {
    icon: Heart,
    title: 'Rooftop Soirées',
    count: '60+ venues',
    image:
      'https://images.pexels.com/photos/36729891/pexels-photo-36729891.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
    accent: 'from-rose-800/80 to-wine-950/90',
  },
];

const featuredExperiences = [
  {
    title: 'Sunset Vineyard Tour & Tasting',
    venue: 'Château Lumière Estate',
    location: 'Napa Valley, CA',
    date: 'Aug 24, 2026',
    price: '$85',
    rating: 4.9,
    reviews: 234,
    image:
      'https://images.pexels.com/photos/20151747/pexels-photo-20151747.jpeg?auto=compress&cs=tinysrgb&h=600&w=800',
    tag: 'Bestseller',
    link: '/events',
  },
  {
    title: "Chef's Table: 7-Course Tasting",
    venue: 'Maison Noir',
    location: 'Downtown, NYC',
    date: 'Sep 02, 2026',
    price: '$180',
    rating: 5.0,
    reviews: 89,
    image:
      'https://images.pexels.com/photos/8856555/pexels-photo-8856555.jpeg?auto=compress&cs=tinysrgb&h=600&w=800',
    tag: 'Exclusive',
    link: '/restaurants',
  },
  {
    title: 'Jazz Night: Live Quartet',
    venue: 'The Velvet Room',
    location: 'Soho, NYC',
    date: 'Aug 28, 2026',
    price: '$45',
    rating: 4.8,
    reviews: 156,
    image:
      'https://images.pexels.com/photos/13230484/pexels-photo-13230484.jpeg?auto=compress&cs=tinysrgb&h=600&w=800',
    tag: 'Tonight',
    link: '/events',
  },
  {
    title: 'Hot Stone Massage Retreat',
    venue: 'Sérénité Spa',
    location: 'Malibu, CA',
    date: 'Sep 10, 2026',
    price: '$120',
    rating: 4.9,
    reviews: 312,
    image:
      'https://images.pexels.com/photos/18120173/pexels-photo-18120173.jpeg?auto=compress&cs=tinysrgb&h=600&w=800',
    tag: 'Trending',
    link: '/events',
  },
];

const steps = [
  {
    icon: Search,
    title: 'Discover',
    description:
      'Browse curated experiences from dining to wellness, all in one place.',
  },
  {
    icon: Calendar,
    title: 'Book',
    description:
      'Reserve your spot in seconds with instant confirmation and flexible dates.',
  },
  {
    icon: Sparkles,
    title: 'Enjoy',
    description: 'Show up and savor the moment. We handle the rest — seamlessly.',
  },
];

const stats = [
  { value: '930+', label: 'Curated venues' },
  { value: '50K+', label: 'Happy guests' },
  { value: '4.9', label: 'Average rating' },
  { value: '120+', label: 'Cities' },
];

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen bg-background">
      <Header />
    
      {/* <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-wine-50 via-background to-background" />
        <div className="absolute inset-0 bg-wine-radial" />
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-wine-300/20 blur-3xl" />
        <div className="absolute top-40 -left-32 h-80 w-80 rounded-full bg-wine-200/30 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-36 sm:px-6 lg:px-8 lg:pb-28 lg:pt-44">
          <div className="mx-auto max-w-3xl text-center">
            <Badge
              variant="outline"
              className="mb-6 animate-fade-up border-wine-200 bg-white/60 px-4 py-1.5 text-xs font-medium text-wine-700 backdrop-blur"
            >
              <Sparkles className="mr-1.5 h-3 w-3" />
              Curated experiences, effortlessly booked
            </Badge>

            <h1 className="animate-fade-up text-balance font-serif text-5xl font-semibold leading-[1.05] text-wine-950 sm:text-6xl lg:text-7xl">
              Book moments
              <br />
              worth <em className="font-medium italic text-wine-600">savoring</em>
            </h1>

            <p
              className="mx-auto mt-6 max-w-xl animate-fade-up text-balance text-base leading-relaxed text-foreground/60 sm:text-lg"
              style={{ animationDelay: '0.1s' }}
            >
              From intimate vineyard tastings to chef&apos;s tables and live
              jazz — discover and reserve extraordinary experiences near you.
            </p>

            <div
              className="mx-auto mt-10 flex max-w-2xl animate-fade-up flex-col gap-3 rounded-2xl border border-border/60 bg-card/80 p-3 shadow-soft-lg backdrop-blur sm:flex-row sm:items-center"
              style={{ animationDelay: '0.2s' }}
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search experiences, venues, or cities..."
                  className="border-0 bg-transparent pl-10 text-sm focus-visible:ring-0"
                />
              </div>
              <div className="hidden h-8 w-px bg-border sm:block" />
              <div className="relative flex-1 sm:flex-initial">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Location"
                  className="border-0 bg-transparent pl-10 text-sm focus-visible:ring-0 sm:w-40"
                />
              </div>
              <Button className="h-11 rounded-xl bg-wine-700 px-6 text-sm font-semibold shadow-wine transition-all hover:bg-wine-800 hover:shadow-wine-lg">
                <Search className="mr-2 h-4 w-4" />
                Search
              </Button>
            </div>

            <div
              className="mt-6 flex animate-fade-up flex-wrap items-center justify-center gap-2"
              style={{ animationDelay: '0.3s' }}
            >
              <span className="text-xs text-muted-foreground">Popular:</span>
              {['Wine tasting', 'Fine dining', 'Live music', 'Spa day'].map(
                (tag) => (
                  <button
                    key={tag}
                    className="rounded-full border border-border/60 bg-card/50 px-3 py-1 text-xs font-medium text-foreground/70 transition-all hover:border-wine-300 hover:bg-wine-50 hover:text-wine-700"
                  >
                    {tag}
                  </button>
                )
              )}
            </div>
          </div>

          <div
            className="mt-16 grid animate-fade-up grid-cols-2 gap-4 sm:grid-cols-4"
            style={{ animationDelay: '0.4s' }}
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-border/50 bg-card/60 p-5 text-center backdrop-blur transition-all hover:border-wine-200 hover:shadow-soft"
              >
                <p className="font-serif text-3xl font-semibold text-wine-800">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="categories" className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <Badge
                variant="outline"
                className="mb-3 border-wine-200 bg-wine-50 px-3 py-1 text-xs font-medium text-wine-700"
              >
                Browse by category
              </Badge>
              <h2 className="font-serif text-4xl font-semibold text-wine-950 sm:text-5xl">
                What are you in the mood for?
              </h2>
            </div>
            <Link
              to="/events"
              className="group flex items-center gap-1 text-sm font-medium text-wine-700 transition-colors hover:text-wine-900"
            >
              View all
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {categories.map((cat) => (
              <Link
                key={cat.title}
                to="/events"
                className="group relative aspect-[3/4] overflow-hidden rounded-2xl shadow-soft transition-all hover:shadow-soft-lg"
              >
                <img
                  src={cat.image}
                  alt={cat.title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div
                  className={`absolute inset-0 bg-gradient-to-t ${cat.accent}`}
                />
                <div className="relative flex h-full flex-col justify-end p-4">
                  <cat.icon
                    className="mb-2 h-6 w-6 text-white/90"
                    strokeWidth={1.8}
                  />
                  <p className="font-serif text-lg font-semibold text-white">
                    {cat.title}
                  </p>
                  <p className="text-xs text-white/70">{cat.count}</p>
                </div>
                <div className="absolute inset-0 ring-0 ring-wine-400/0 transition-all group-hover:ring-2 group-hover:ring-wine-400/40" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="experiences" className="bg-secondary/40 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <Badge
              variant="outline"
              className="mb-3 border-wine-200 bg-wine-50 px-3 py-1 text-xs font-medium text-wine-700"
            >
              <TrendingUp className="mr-1.5 h-3 w-3" />
              Handpicked for you
            </Badge>
            <h2 className="font-serif text-4xl font-semibold text-wine-950 sm:text-5xl">
              Featured experiences
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-foreground/60">
              Curated by our team — these are the experiences everyone&apos;s
              talking about this week.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featuredExperiences.map((exp, i) => (
              <Link
                key={exp.title}
                to={exp.link}
                className="group animate-fade-up overflow-hidden rounded-2xl border border-border/50 bg-card shadow-soft transition-all hover:-translate-y-1 hover:shadow-soft-lg"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={exp.image}
                    alt={exp.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute left-3 top-3">
                    <span className="rounded-full bg-wine-700 px-2.5 py-1 text-xs font-semibold text-white shadow-wine">
                      {exp.tag}
                    </span>
                  </div>
                  <button className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 backdrop-blur transition-all hover:bg-white">
                    <Heart className="h-4 w-4 text-wine-600" />
                  </button>
                </div>
                <div className="p-4">
                  <div className="mb-1.5 flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-wine-500 text-wine-500" />
                    <span className="text-xs font-semibold">{exp.rating}</span>
                    <span className="text-xs text-muted-foreground">
                      ({exp.reviews})
                    </span>
                  </div>
                  <h3 className="font-serif text-lg font-semibold leading-snug text-wine-950">
                    {exp.title}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {exp.venue}
                  </p>
                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {exp.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {exp.date}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
                    <div>
                      <span className="font-serif text-2xl font-semibold text-wine-800">
                        {exp.price}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {' '}
                        /person
                      </span>
                    </div>
                    <Button
                      size="sm"
                      className="rounded-full bg-wine-700 px-4 text-xs font-semibold text-white shadow-wine transition-all hover:bg-wine-800"
                    >
                      Book
                    </Button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 lg:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <Badge
              variant="outline"
              className="mb-3 border-wine-200 bg-wine-50 px-3 py-1 text-xs font-medium text-wine-700"
            >
              How it works
            </Badge>
            <h2 className="font-serif text-4xl font-semibold text-wine-950 sm:text-5xl">
              Book in three simple steps
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step, i) => (
              <div
                key={step.title}
                className="relative animate-fade-up text-center"
                style={{ animationDelay: `${i * 0.15}s` }}
              >
                {i < steps.length - 1 && (
                  <div className="absolute top-8 left-[60%] hidden h-px w-full bg-gradient-to-r from-wine-300 to-transparent md:block" />
                )}
                <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl wine-gradient shadow-wine">
                  <step.icon className="h-7 w-7 text-white" strokeWidth={1.8} />
                  <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-wine-700 shadow-soft">
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-serif text-2xl font-semibold text-wine-950">
                  {step.title}
                </h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-foreground/60">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-wine-950 py-20 text-white lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <Badge
                variant="outline"
                className="mb-4 border-wine-400/30 bg-wine-800/40 px-3 py-1 text-xs font-medium text-wine-200"
              >
                Why Vignette
              </Badge>
              <h2 className="font-serif text-4xl font-semibold leading-tight sm:text-5xl">
                More than a booking.
                <br />
                <em className="italic text-wine-300">A promise.</em>
              </h2>
              <p className="mt-4 max-w-md text-wine-100/70">
                Every venue on Vignette is vetted by our team. No noise, no
                endless scrolling — just the experiences worth your time.
              </p>

              <div className="mt-8 flex flex-col gap-4">
                {[
                  {
                    icon: ShieldCheck,
                    title: 'Verified quality',
                    desc: 'Every venue is visited and approved by our curators.',
                  },
                  {
                    icon: Smartphone,
                    title: 'Instant confirmation',
                    desc: 'Book in seconds. Get your confirmation immediately.',
                  },
                  {
                    icon: Clock,
                    title: 'Flexible rescheduling',
                    desc: 'Plans change. Reschedule for free up to 48 hours before.',
                  },
                ].map((feat) => (
                  <div key={feat.title} className="flex items-start gap-4">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-wine-800/50 ring-1 ring-wine-400/20">
                      <feat.icon className="h-5 w-5 text-wine-300" />
                    </div>
                    <div>
                      <p className="font-serif text-lg font-semibold text-white">
                        {feat.title}
                      </p>
                      <p className="text-sm text-wine-100/60">{feat.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="overflow-hidden rounded-2xl shadow-wine-lg">
                  <img
                    src="https://images.pexels.com/photos/941861/pexels-photo-941861.jpeg?auto=compress&cs=tinysrgb&h=500&w=400"
                    alt="Fine dining"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="overflow-hidden rounded-2xl shadow-wine-lg">
                  <img
                    src="https://images.pexels.com/photos/14943491/pexels-photo-14943491.jpeg?auto=compress&cs=tinysrgb&h=350&w=400"
                    alt="Wine pouring"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
              <div className="space-y-4 pt-8">
                <div className="overflow-hidden rounded-2xl shadow-wine-lg">
                  <img
                    src="https://images.pexels.com/photos/761543/pexels-photo-761543.jpeg?auto=compress&cs=tinysrgb&h=350&w=400"
                    alt="Concert"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="overflow-hidden rounded-2xl shadow-wine-lg">
                  <img
                    src="https://images.pexels.com/photos/31234754/pexels-photo-31234754.jpeg?auto=compress&cs=tinysrgb&h=500&w=400"
                    alt="Spa"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl wine-gradient px-6 py-16 text-center shadow-wine-lg sm:px-12">
            <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/5 blur-2xl" />
            <div className="absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-wine-500/20 blur-3xl" />
            <div className="relative">
              <Wine
                className="mx-auto mb-4 h-10 w-10 text-wine-200"
                strokeWidth={1.5}
              />
              <h2 className="font-serif text-4xl font-semibold text-white sm:text-5xl">
                Ready to book your
                <br />
                next experience?
              </h2>
              <p className="mx-auto mt-4 max-w-md text-wine-100/80">
                Join thousands who&apos;ve discovered unforgettable moments
                through Vignette.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full bg-white px-8 text-wine-800 shadow-lg transition-all hover:bg-wine-50 hover:scale-105"
                >
                  <Link to="/register">
                    Create free account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full border-wine-400/40 bg-wine-800/20 px-8 text-white backdrop-blur hover:bg-wine-800/40 hover:text-white"
                >
                  <Link to="/login">I already have an account</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div> */}
    </div>
  );
}
