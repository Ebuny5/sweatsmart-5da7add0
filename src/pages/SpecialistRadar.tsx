import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import PageTransition from '@/components/layout/PageTransition';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useEpisodes } from '@/hooks/useEpisodes';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  MapPin, Navigation, Star, Phone, Globe, ExternalLink,
  Filter, X, Zap, Award, Share2, RefreshCw,
  Loader2, Sparkles, ChevronRight, Heart, Shield,
  Video, AlertCircle, Wifi, ChevronLeft
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────
interface Doctor {
  id: string;
  name: string;
  clinicName?: string;
  specialty: string;
  address: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  phone?: string;
  email?: string;
  website?: string;
  treatments: string[];
  isIhsVerified: boolean;
  isNdsMember: boolean;
  isTelehealth: boolean;
  distance?: string | null;
  distanceMeters?: number | null;
  tier: 'curated' | 'external' | 'telehealth';
  rating?: number | null;
  reviewCount?: number | null;
  openNow?: boolean | null;
  languages: string[];
}

interface SearchMeta {
  total: number;
  curatedCount: number;
  externalCount: number;
  telehealthCount: number;
  careGap: boolean;
}

type TreatmentFilter = 'all' | 'iontophoresis' | 'botox' | 'miradry' | 'topical';
type ScopeFilter = 'city' | 'country' | 'continent';

// ── Constants ──────────────────────────────────────────────────────────────
const TREATMENTS = [
  { key: 'iontophoresis', label: 'Iontophoresis', icon: '⚡', color: 'text-yellow-300 border-yellow-500/40 bg-yellow-500/10' },
  { key: 'botox',         label: 'Botox',          icon: '💉', color: 'text-blue-300 border-blue-500/40 bg-blue-500/10' },
  { key: 'miradry',       label: 'miraDry',         icon: '🔥', color: 'text-orange-300 border-orange-500/40 bg-orange-500/10' },
  { key: 'topical',       label: 'Topical Rx',      icon: '🧴', color: 'text-green-300 border-green-500/40 bg-green-500/10' },
];

const SCOPE_RADII: Record<ScopeFilter, number> = {
  city:      10000,
  country:   300000,
  continent: 5000000,
};

// ── Helpers ────────────────────────────────────────────────────────────────
const computeHdss = (episodes: any[]): number => {
  if (!episodes?.length) return 0;
  const recent = episodes.slice(0, 10);
  return recent.reduce((s, e) => s + Number(e.severityLevel || 0), 0) / recent.length;
};

// ── Leaflet loader ─────────────────────────────────────────────────────────
const loadLeaflet = (): Promise<any> => new Promise((resolve, reject) => {
  if ((window as any).L) { resolve((window as any).L); return; }
  const link   = document.createElement('link');
  link.rel     = 'stylesheet';
  link.href    = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
  document.head.appendChild(link);
  const script   = document.createElement('script');
  script.src     = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
  script.onload  = () => resolve((window as any).L);
  script.onerror = reject;
  document.head.appendChild(script);
});

const glowPin = (active = false, isTele = false, user = false) => `
  <div style="display:flex;flex-direction:column;align-items:center;width:36px;height:44px;">
    <div style="
      width:${user ? 18 : 28}px;height:${user ? 18 : 28}px;border-radius:50%;
      background:${user ? '#facc15' : isTele ? 'rgba(139,92,246,0.9)' : active ? 'rgba(0,188,212,1)' : 'rgba(0,188,212,0.75)'};
      box-shadow:0 0 ${active ? 24 : 12}px ${active ? 10 : 5}px ${user ? 'rgba(250,204,21,0.4)' : isTele ? 'rgba(139,92,246,0.4)' : 'rgba(0,188,212,0.4)'};
      border:2px solid rgba(255,255,255,0.35);
      display:flex;align-items:center;justify-content:center;
    ">
      <div style="width:7px;height:7px;border-radius:50%;background:white;opacity:0.9;"></div>
    </div>
    ${!user ? `<div style="width:2px;height:12px;background:linear-gradient(to bottom,rgba(0,188,212,0.7),transparent);margin-top:1px;"></div>` : ''}
  </div>`;

// ── Tier badge ─────────────────────────────────────────────────────────────
const TierBadge = ({ tier, isIhs, isNds }: { tier: string; isIhs: boolean; isNds: boolean }) => {
  if (isIhs) return <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold text-yellow-300 border border-yellow-500/40 bg-yellow-500/10">🏅 IHS Verified</span>;
  if (isNds) return <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold text-teal-300 border border-teal-500/40 bg-teal-500/10">NDS Member</span>;
  if (tier === 'curated') return <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold text-purple-300 border border-purple-500/40 bg-purple-500/10">✓ Verified</span>;
  if (tier === 'telehealth') return <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold text-violet-300 border border-violet-500/40 bg-violet-500/10">📡 Telehealth</span>;
  return null;
};

// ── AI Greeting ────────────────────────────────────────────────────────────
const AIGreeting = ({ profile, hdss, meta, city, onDismiss }: {
  profile: any; hdss: number; meta: SearchMeta | null; city: string; onDismiss: () => void;
}) => {
  const name = profile?.name?.split(' ')[0] || 'Warrior';
  const hdssText = hdss > 0 ? `HDSS ${hdss.toFixed(1)} severity` : 'your hyperhidrosis profile';
  const physCount = meta ? meta.curatedCount + meta.externalCount : 0;

  return (
    <div className="relative rounded-2xl overflow-hidden mb-4 p-4"
      style={{ background: 'rgba(0,188,212,0.07)', backdropFilter: 'blur(20px)', border: '1px solid rgba(0,188,212,0.28)', boxShadow: '0 0 32px rgba(0,188,212,0.12), inset 0 1px 0 rgba(255,255,255,0.07)' }}>
      <div className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{ background: 'radial-gradient(ellipse at 15% 50%, rgba(0,188,212,0.1) 0%, transparent 65%)', animation: 'pulse 3s ease-in-out infinite' }} />
      <div className="flex items-start gap-3 relative">
        <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#00BCD4,#0097A7)', boxShadow: '0 0 16px rgba(0,188,212,0.4)' }}>
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-teal-400 uppercase tracking-widest mb-1">HidroAlly · Specialist Radar</p>
          <p className="text-sm text-white/85 leading-relaxed">
            <span className="font-bold text-white">{name}</span>, based on your{' '}
            <span className="text-teal-300 font-semibold">{hdssText}</span>,{' '}
            {meta?.careGap
              ? <>no physical specialists were found nearby, but I've located <span className="text-violet-300 font-semibold">{meta.telehealthCount} telehealth expert{meta.telehealthCount !== 1 ? 's' : ''}</span> who can review your Warrior Report today.</>
              : <>I've located <span className="text-teal-300 font-semibold">{physCount} specialist{physCount !== 1 ? 's' : ''}</span> near <span className="font-semibold text-white">{city || 'you'}</span>. Tap any pin to see their profile.</>
            }
          </p>
        </div>
        <button onClick={onDismiss} className="p-1 rounded-lg hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors shrink-0"><X className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
};

// ── Care Gap card ──────────────────────────────────────────────────────────
const CareGapCard = ({ onWiden, hideWiden }: { onWiden: () => void, hideWiden?: boolean }) => (
  <div className="rounded-2xl p-4 mb-4"
    style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)' }}>
    <div className="flex items-center gap-2 mb-2">
      <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
      <span className="text-xs font-bold text-red-400">Care Gap Detected</span>
    </div>
    <p className="text-xs text-white/55 leading-relaxed mb-3">
      No certified hyperhidrosis specialists are registered near you yet. This is a known gap across many African cities — HidroAlly is actively working to map specialist availability across the continent.
    </p>
    <div className="flex gap-2">
      {!hideWiden && <button onClick={onWiden}
        className="flex-1 py-2.5 rounded-xl text-xs font-bold text-teal-300 border border-teal-500/40 bg-teal-500/10 transition-all active:scale-95">
        Widen to Country / Continent
      </button>}
      <a href="https://www.sweathelp.org/find-a-provider.html" target="_blank" rel="noreferrer"
        className="flex-1 py-2.5 rounded-xl text-xs font-bold text-violet-300 border border-violet-500/40 bg-violet-500/10 text-center transition-all active:scale-95">
        IHS Global Directory
      </a>
    </div>
  </div>
);

// ── Doctor card ────────────────────────────────────────────────────────────
const DoctorCard = ({ doctor, isActive, onTap }: { doctor: Doctor; isActive: boolean; onTap: () => void }) => (
  <div onClick={onTap} className="rounded-2xl p-4 cursor-pointer transition-all active:scale-[0.98]"
    style={{
      background: isActive ? 'rgba(0,188,212,0.1)' : doctor.isTelehealth ? 'rgba(139,92,246,0.06)' : 'rgba(255,255,255,0.04)',
      border: `1px solid ${isActive ? 'rgba(0,188,212,0.38)' : doctor.isTelehealth ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.08)'}`,
      boxShadow: isActive ? '0 0 20px rgba(0,188,212,0.12)' : 'none',
    }}>
    <div className="flex items-start gap-3">
      {/* Avatar */}
      <div className="w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center font-bold text-base"
        style={{
          background: doctor.isTelehealth ? 'linear-gradient(135deg,rgba(139,92,246,0.3),rgba(109,62,216,0.2))' : 'linear-gradient(135deg,rgba(0,188,212,0.25),rgba(0,150,170,0.15))',
          border: `1px solid ${doctor.isTelehealth ? 'rgba(139,92,246,0.3)' : 'rgba(0,188,212,0.25)'}`,
        }}>
        {doctor.isTelehealth ? <Video className="h-5 w-5 text-violet-400" /> : doctor.name.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-1.5 flex-wrap">
          <p className="text-sm font-bold text-white leading-tight">{doctor.name}</p>
          <TierBadge tier={doctor.tier} isIhs={doctor.isIhsVerified} isNds={doctor.isNdsMember} />
        </div>
        {doctor.clinicName && <p className="text-[11px] text-teal-400/70 truncate mt-0.5">{doctor.clinicName}</p>}
        <p className="text-[11px] text-white/45 truncate mt-0.5">{doctor.isTelehealth ? 'Virtual — Africa & Global' : doctor.address}</p>

        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {doctor.rating && (
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
              <span className="text-[11px] text-white/70 font-semibold">{doctor.rating.toFixed(1)}</span>
              {doctor.reviewCount && <span className="text-[10px] text-white/30">({doctor.reviewCount})</span>}
            </div>
          )}
          {doctor.distance && !doctor.isTelehealth && (
            <div className="flex items-center gap-1">
              <Navigation className="h-3 w-3 text-teal-400" />
              <span className="text-[11px] text-white/55">{doctor.distance}</span>
            </div>
          )}
          {doctor.isTelehealth && (
            <div className="flex items-center gap-1">
              <Wifi className="h-3 w-3 text-violet-400" />
              <span className="text-[11px] text-violet-300">Online consult available</span>
            </div>
          )}
          {doctor.openNow !== null && doctor.openNow !== undefined && (
            <span className={`text-[10px] font-bold ${doctor.openNow ? 'text-green-400' : 'text-white/30'}`}>
              {doctor.openNow ? '● Open now' : '● Closed'}
            </span>
          )}
        </div>

        {doctor.treatments.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {doctor.treatments.slice(0, 3).map(t => {
              const tx = TREATMENTS.find(x => x.key === t);
              return tx ? <span key={t} className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${tx.color}`}>{tx.icon} {tx.label}</span> : null;
            })}
          </div>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-white/20 mt-1 shrink-0" />
    </div>
  </div>
);

// ── Doctor modal ───────────────────────────────────────────────────────────
const DoctorModal = ({ doctor, onClose, onShare }: { doctor: Doctor; onClose: () => void; onShare: (d: Doctor) => void }) => {
  const [shared, setShared] = useState(false);
  const doShare = () => { onShare(doctor); setShared(true); setTimeout(() => setShared(false), 3000); };

  return (
    <div className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full rounded-t-3xl overflow-hidden"
        style={{ background: 'linear-gradient(180deg,rgba(13,18,42,0.99) 0%,rgba(7,10,26,1) 100%)', border: '1px solid rgba(255,255,255,0.09)', borderBottom: 'none', boxShadow: '0 -20px 60px rgba(0,0,0,0.6)', maxHeight: '88vh', overflowY: 'auto' }}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
        <div className="p-5 pb-10">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-start gap-3">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 font-bold text-2xl"
                style={{ background: doctor.isTelehealth ? 'linear-gradient(135deg,rgba(139,92,246,0.3),rgba(109,62,216,0.2))' : 'linear-gradient(135deg,rgba(0,188,212,0.22),rgba(0,150,170,0.15))', border: `1.5px solid ${doctor.isTelehealth ? 'rgba(139,92,246,0.4)' : 'rgba(0,188,212,0.38)'}`, boxShadow: `0 0 20px ${doctor.isTelehealth ? 'rgba(139,92,246,0.2)' : 'rgba(0,188,212,0.18)'}` }}>
                {doctor.isTelehealth ? <Video className="h-7 w-7 text-violet-400" /> : doctor.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-base font-bold text-white leading-snug">{doctor.name}</h2>
                {doctor.clinicName && <p className="text-xs text-teal-400 mt-0.5">{doctor.clinicName}</p>}
                <p className="text-xs text-white/45 mt-0.5">{doctor.specialty}</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <TierBadge tier={doctor.tier} isIhs={doctor.isIhsVerified} isNds={doctor.isNdsMember} />
                  {doctor.isIhsVerified && <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold text-yellow-300 border border-yellow-500/40 bg-yellow-500/10 flex items-center gap-1"><Award className="h-2.5 w-2.5" />IHS Trained</span>}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-colors"><X className="h-4 w-4" /></button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            {[
              { label: 'Rating', value: doctor.rating ? `${doctor.rating.toFixed(1)} ⭐` : 'N/A' },
              { label: 'Distance', value: doctor.isTelehealth ? 'Virtual' : (doctor.distance || 'N/A') },
              { label: 'Status', value: doctor.isTelehealth ? 'Online' : (doctor.openNow == null ? 'Unknown' : doctor.openNow ? 'Open' : 'Closed') },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3 text-center"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-xs font-bold text-white">{s.value}</p>
                <p className="text-[9px] text-white/35 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Address */}
          <div className="flex items-start gap-2.5 rounded-xl p-3 mb-4"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {doctor.isTelehealth ? <Wifi className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" /> : <MapPin className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />}
            <p className="text-sm text-white/65">{doctor.isTelehealth ? 'Virtual consultations — available to all African warriors via video call' : doctor.address}</p>
          </div>

          {/* Treatments */}
          {doctor.treatments.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] font-bold text-white/35 uppercase tracking-widest mb-2">Treatment Specialisations</p>
              <div className="flex flex-wrap gap-2">
                {doctor.treatments.map(t => {
                  const tx = TREATMENTS.find(x => x.key === t);
                  return tx ? <span key={t} className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border ${tx.color}`}>{tx.icon} {tx.label}</span> : null;
                })}
              </div>
            </div>
          )}

          {/* HidroAlly Note */}
          <div className="rounded-xl p-3.5 mb-5"
            style={{ background: 'rgba(0,188,212,0.06)', border: '1px solid rgba(0,188,212,0.18)' }}>
            <div className="flex items-center gap-2 mb-1.5">
              <Shield className="h-3.5 w-3.5 text-teal-400" />
              <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">HidroAlly Insight</span>
            </div>
            <p className="text-xs text-white/60 leading-relaxed">
              {doctor.isIhsVerified
                ? 'This specialist is verified by the International Hyperhidrosis Society — the global authority on HH treatment. They understand your condition at a clinical level that most general dermatologists don\'t.'
                : doctor.isTelehealth
                ? 'A telehealth consultation lets you share your Warrior Report before the call so the doctor arrives prepared. This is especially powerful if no local specialist is available near you.'
                : 'Share your Warrior Report before your visit so the doctor can review your HDSS history, episode patterns and EDA readings before the first minute of consultation.'}
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button onClick={doShare}
              className="w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{ background: shared ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'linear-gradient(135deg,#00BCD4,#0097A7)', boxShadow: shared ? '0 4px 20px rgba(34,197,94,0.28)' : '0 4px 20px rgba(0,188,212,0.32)' }}>
              {shared ? <><Heart className="h-4 w-4 fill-white" /> Report Shared!</> : <><Share2 className="h-4 w-4" /> Share My Warrior Report</>}
            </button>
            <div className="grid grid-cols-2 gap-2.5">
              {doctor.phone && (
                <a href={`tel:${doctor.phone}`}
                  className="py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 text-white active:scale-95 transition-all"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <Phone className="h-4 w-4 text-teal-400" /> Call
                </a>
              )}
              {doctor.website && (
                <a href={doctor.website} target="_blank" rel="noreferrer"
                  className="py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 text-white active:scale-95 transition-all"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <Globe className="h-4 w-4 text-teal-400" /> {doctor.isTelehealth ? 'Book Online' : 'Website'}
                </a>
              )}
              {!doctor.phone && !doctor.website && (
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(doctor.name + ' ' + doctor.address)}`}
                  target="_blank" rel="noreferrer"
                  className="col-span-2 py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 text-white active:scale-95 transition-all"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <ExternalLink className="h-4 w-4 text-teal-400" /> View on Google Maps
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main ───────────────────────────────────────────────────────────────────
const SpecialistRadar = () => {
  const navigate = useNavigate();
  const { user }     = useAuth();
  const { profile }  = useProfile();
  const { episodes } = useEpisodes();

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/home');
    }
  };

  const [doctors, setDoctors]         = useState<Doctor[]>([]);
  const [meta, setMeta]               = useState<SearchMeta | null>(null);
  const [isLoading, setIsLoading]     = useState(false);
  const [location, setLocation]       = useState<{ lat: number; lng: number } | null>(null);
  const [city, setCity]               = useState('');
  const [state, setState]             = useState('');
  const [country, setCountry]         = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [continent, setContinent]     = useState('Africa');
  const [geoReady, setGeoReady]       = useState(false); // true once reverse geocode completes
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [activePin, setActivePin]     = useState<string | null>(null);
  const [treatFilter, setTreatFilter] = useState<TreatmentFilter>('all');
  const [scope, setScope]             = useState<ScopeFilter>('city');
  const [showGreeting, setShowGreeting] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [locationError, setLocationError] = useState('');
  const hasFetched = useRef(false); // prevent duplicate initial fetches

  const mapRef     = useRef<HTMLDivElement>(null);
  const mapInst    = useRef<any>(null);
  const markers    = useRef<any[]>([]);
  const userPin    = useRef<any>(null);
  const hdss       = useMemo(() => computeHdss(episodes || []), [episodes]);

  // ── Filtered doctors ────────────────────────────────────────────────────
  const physical   = useMemo(() => doctors.filter(d => !d.isTelehealth && (treatFilter === 'all' || d.treatments.includes(treatFilter))), [doctors, treatFilter]);
  const telehealth = useMemo(() => doctors.filter(d => d.isTelehealth), [doctors]);

  // ── Init map ────────────────────────────────────────────────────────────
  useEffect(() => {
    loadLeaflet().then(L => {
      if (!mapRef.current || mapInst.current) return;
      const map = L.map(mapRef.current, { center: [9.082, 8.675], zoom: 6, zoomControl: false });
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CartoDB', maxZoom: 19,
      }).addTo(map);
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      mapInst.current = map;
    }).catch(() => toast.error('Map failed to load'));
    return () => { if (mapInst.current) { mapInst.current.remove(); mapInst.current = null; } };
  }, []);

  // ── Geolocation + reverse geocode ───────────────────────────────────────
  useEffect(() => {
    // Seed from localStorage immediately for instant map centering
    try {
      const saved = localStorage.getItem('ss_last_known_location');
      if (saved) {
        const p = JSON.parse(saved);
        if (p.lat && p.lng) {
          setLocation({ lat: p.lat, lng: p.lng });
          if (p.city) setCity(p.city);
          if (p.state) setState(p.state);
          if (p.country) setCountry(p.country);
          if (p.countryCode) setCountryCode(p.countryCode);
          if (p.continent) setContinent(p.continent);
          setGeoReady(true);
        }
      }
    } catch {}

    if (!navigator.geolocation) { setLocationError('Geolocation not supported'); return; }

    const doReverseGeocode = async (lat: number, lng: number) => {
      try {
        const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`);
        const data = await res.json();
        const addr = data.address || {};
        const dc = addr.city || addr.town || addr.municipality || addr.village || addr.suburb || addr.county || '';
        const ds = addr.state || addr.region || addr.province || '';
        const dco = addr.country || '';
        const iso = (addr.country_code || '').toUpperCase();
        const CONTINENT_MAP: Record<string, string> = {
          NG:'Africa',GH:'Africa',ZA:'Africa',KE:'Africa',EG:'Africa',TZ:'Africa',
          ET:'Africa',CM:'Africa',SN:'Africa',CI:'Africa',RW:'Africa',UG:'Africa',
          MA:'Africa',TN:'Africa',DZ:'Africa',MZ:'Africa',AO:'Africa',CD:'Africa',
          SD:'Africa',MG:'Africa',ZM:'Africa',ZW:'Africa',BJ:'Africa',BF:'Africa',
          ML:'Africa',NE:'Africa',TD:'Africa',SO:'Africa',LY:'Africa',ER:'Africa',
          TG:'Africa',SL:'Africa',GN:'Africa',MW:'Africa',LS:'Africa',
          BW:'Africa',NA:'Africa',GM:'Africa',GA:'Africa',GQ:'Africa',CG:'Africa',
          GB:'Europe',DE:'Europe',FR:'Europe',IT:'Europe',ES:'Europe',PT:'Europe',
          NL:'Europe',BE:'Europe',SE:'Europe',NO:'Europe',DK:'Europe',FI:'Europe',
          CH:'Europe',AT:'Europe',PL:'Europe',CZ:'Europe',SK:'Europe',HU:'Europe',
          RO:'Europe',BG:'Europe',GR:'Europe',TR:'Europe',UA:'Europe',RU:'Europe',
          IE:'Europe',HR:'Europe',RS:'Europe',SI:'Europe',LT:'Europe',LV:'Europe',
          EE:'Europe',LU:'Europe',MT:'Europe',CY:'Europe',IS:'Europe',AL:'Europe',
          US:'Americas',CA:'Americas',MX:'Americas',BR:'Americas',AR:'Americas',
          CL:'Americas',CO:'Americas',PE:'Americas',VE:'Americas',EC:'Americas',
          BO:'Americas',PY:'Americas',UY:'Americas',GY:'Americas',SR:'Americas',
          GT:'Americas',HN:'Americas',SV:'Americas',NI:'Americas',CR:'Americas',
          PA:'Americas',CU:'Americas',DO:'Americas',JM:'Americas',TT:'Americas',
          CN:'Asia',JP:'Asia',IN:'Asia',KR:'Asia',PK:'Asia',BD:'Asia',TH:'Asia',
          VN:'Asia',ID:'Asia',PH:'Asia',MY:'Asia',SG:'Asia',MM:'Asia',KH:'Asia',
          LK:'Asia',NP:'Asia',AE:'Asia',SA:'Asia',IL:'Asia',JO:'Asia',LB:'Asia',
          IQ:'Asia',IR:'Asia',KW:'Asia',QA:'Asia',BH:'Asia',OM:'Asia',YE:'Asia',
          KZ:'Asia',UZ:'Asia',GE:'Asia',AM:'Asia',AZ:'Asia',TW:'Asia',HK:'Asia',
          AU:'Oceania',NZ:'Oceania',FJ:'Oceania',PG:'Oceania',
        };
        const cont = CONTINENT_MAP[iso] || 'Global';
        setCity(dc); setState(ds); setCountry(dco); setCountryCode(iso); setContinent(cont);
        localStorage.setItem('ss_last_known_location', JSON.stringify({
          lat, lng, city: dc, state: ds, country: dco, countryCode: iso, continent: cont,
        }));
        setGeoReady(true);
      } catch {
        setCity('your area');
        setGeoReady(true);
      }
    };

    let watchId: number | null = null;
    let resolved = false;
    watchId = navigator.geolocation.watchPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setLocation({ lat, lng });
        setLocationError('');
        if (!resolved) {
          resolved = true;
          doReverseGeocode(lat, lng);
          if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        }
      },
      err => {
        if (!resolved) { setLocationError('Location access denied — please enable GPS'); console.error(err); }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
    return () => { if (watchId !== null) navigator.geolocation.clearWatch(watchId); };
  }, []);

  // ── Fetch specialists ───────────────────────────────────────────────────
  const fetchDoctors = useCallback(async () => {
    if (!location) { toast.error('Waiting for your location...'); return; }
    setIsLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) { toast.error('Please log in to search for specialists'); setIsLoading(false); return; }
      const RADAR_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/specialist-radar`;
      const res = await fetch(RADAR_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          lat: location.lat, lng: location.lng,
          radius: SCOPE_RADII[scope],
          city, state, country, countryCode, continent, scope,
        }),
      });
      if (!res.ok) { const errData = await res.json().catch(() => ({})); if (res.status === 429) { toast.error(errData.message || 'Daily limit reached for this scope'); return; } throw new Error(errData.error || 'Search failed'); }
      const { doctors: results, meta: resMeta } = await res.json();
      setDoctors(results || []);
      setMeta(resMeta || null);
    } catch (e) {
      console.error('Specialist search error:', e);
      toast.error('Could not find specialists — check your connection');
    } finally {
      setIsLoading(false);
    }
  }, [location, scope, city, state, country, countryCode, continent]);

  // Auto-fetch: fires once geoReady + user auth available, and on scope changes
  useEffect(() => {
    if (geoReady && location && user) {
      fetchDoctors();
    }
  }, [geoReady, user, scope]); // scope change = re-fetch; geoReady+user = initial fetch

  // ── Map markers ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInst.current) return;
    const L = (window as any).L;
    markers.current.forEach(m => m.remove());
    markers.current = [];

    if (location) {
      if (userPin.current) userPin.current.remove();
      const uIcon = L.divIcon({ html: glowPin(false, false, true), iconSize: [36, 44], iconAnchor: [18, 22], className: '' });
      userPin.current = L.marker([location.lat, location.lng], { icon: uIcon }).addTo(mapInst.current)
        .bindPopup('<div style="color:#fff;background:#1a1a2e;border:1px solid rgba(250,204,21,0.3);padding:6px 10px;border-radius:10px;font-size:12px;font-weight:bold;">You are here</div>', { className: 'radar-popup' });
      mapInst.current.setView([location.lat, location.lng], scope === 'city' ? 6 : scope === 'country' ? 4 : 2);
    }

    physical.forEach(doc => {
      const isActive = activePin === doc.id;
      const icon = L.divIcon({ html: glowPin(isActive, false), iconSize: [36, 44], iconAnchor: [18, 44], className: '' });
      const m = L.marker([doc.lat, doc.lng], { icon }).addTo(mapInst.current)
        .bindPopup(`<div style="color:#fff;background:rgba(10,15,30,0.97);border:1px solid rgba(0,188,212,0.3);padding:8px 12px;border-radius:12px;font-size:12px;max-width:200px;">
          <div style="font-weight:bold;color:#00BCD4;margin-bottom:2px;">${doc.name}</div>
          <div style="opacity:0.55;font-size:11px;">${doc.address}</div>
          ${doc.rating ? `<div style="color:#facc15;margin-top:3px;">★ ${doc.rating.toFixed(1)}</div>` : ''}
        </div>`, { className: 'radar-popup' });
      m.on('click', () => { setActivePin(doc.id); setSelectedDoctor(doc); });
      markers.current.push(m);
    });
  }, [physical, location, activePin, scope]);

  // ── Share warrior report ────────────────────────────────────────────────
  const handleShare = (doctor: Doctor) => {
    const msg = `Hi, I'm a patient managing hyperhidrosis. I use HidroAlly to track my condition and would like to share my data before our consultation.\n\nMy HDSS score: ${hdss.toFixed(1)}/4\nEpisode count (recent): ${episodes?.length || 0}\nPrimary concern: Palmar/Plantar hyperhidrosis\n\nI will bring my full HidroAlly Warrior Report to our ${doctor.isTelehealth ? 'virtual' : 'in-person'} appointment.\n\nKind regards`;
    if (navigator.share) {
      navigator.share({ title: 'HidroAlly Warrior Report', text: msg }).catch(() => {});
    } else {
      navigator.clipboard.writeText(msg);
      toast.success('Pre-consultation message copied — send it to your doctor 💙');
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <PageTransition>
      <style>{`
        .leaflet-container { background:#07091a !important; }
        .radar-popup .leaflet-popup-content-wrapper,.radar-popup .leaflet-popup-tip-container { display:none; }
        .radar-popup .leaflet-popup-content-wrapper { background:transparent !important; border:none !important; box-shadow:none !important; padding:0 !important; display:block; }
        .radar-popup .leaflet-popup-content { margin:0 !important; }
        .leaflet-control-zoom a { width:48px !important; height:48px !important; line-height:48px !important; font-size:20px !important; background:rgba(13,18,42,0.95) !important; color:rgba(0,188,212,0.85) !important; border:1px solid rgba(0,188,212,0.25) !important; border-radius:14px !important; backdrop-filter:blur(12px) !important; }
        .leaflet-control-zoom { margin-bottom:80px !important; margin-right:12px !important; gap:6px; display:flex; flex-direction:column; }
        .no-scrollbar::-webkit-scrollbar { display:none; }
      `}</style>

      <div className="flex flex-col w-full max-w-[100vw] overflow-x-hidden" style={{ minHeight: '100dvh', background: 'linear-gradient(180deg,#070b1a 0%,#0a0e24 100%)' }}>

        {/* Header */}
        <div className="px-4 pt-4 pb-3 shrink-0" style={{ background: 'rgba(7,11,26,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3 mb-3">
            <button onClick={handleBack} className="w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-white/5 border border-white/10 shrink-0">
              <ChevronLeft className="h-5 w-5 text-white/70" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-white">Specialist Radar</h1>
              <p className="text-[11px] text-white/35">AI-matched dermatologists · Hyperhidrosis experts</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setShowFilters(s => !s)}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                style={{ background: showFilters ? 'rgba(0,188,212,0.18)' : 'rgba(255,255,255,0.06)', border: `1px solid ${showFilters ? 'rgba(0,188,212,0.38)' : 'rgba(255,255,255,0.1)'}` }}>
                <Filter className="h-4 w-4 text-teal-400" />
              </button>
              <button onClick={fetchDoctors} disabled={isLoading}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {isLoading ? <Loader2 className="h-4 w-4 text-teal-400 animate-spin" /> : <RefreshCw className="h-4 w-4 text-white/40" />}
              </button>
            </div>
          </div>

          {/* Scope selector */}
          <div className="flex rounded-xl p-0.5 gap-0.5"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {(['city', 'country', 'continent'] as ScopeFilter[]).map(s => (
              <button key={s} onClick={() => setScope(s)}
                className="flex-1 py-2 rounded-[10px] text-[11px] font-bold capitalize transition-all"
                style={{
                  background: scope === s ? 'rgba(0,188,212,0.22)' : 'transparent',
                  color: scope === s ? '#00BCD4' : 'rgba(255,255,255,0.35)',
                  border: scope === s ? '1px solid rgba(0,188,212,0.38)' : '1px solid transparent',
                }}>
                {s === 'city' ? 'My City' : s === 'country' ? 'My Country' : 'My Continent'}
              </button>
            ))}
          </div>

          {/* Treatment filters */}
          {showFilters && (
            <div className="flex gap-2 overflow-x-auto pb-1 mt-3 no-scrollbar">
              <button onClick={() => setTreatFilter('all')}
                className="shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all"
                style={{ background: treatFilter === 'all' ? 'rgba(0,188,212,0.18)' : 'rgba(255,255,255,0.05)', border: `1px solid ${treatFilter === 'all' ? 'rgba(0,188,212,0.38)' : 'rgba(255,255,255,0.1)'}`, color: treatFilter === 'all' ? '#00BCD4' : 'rgba(255,255,255,0.45)' }}>
                All
              </button>
              {TREATMENTS.map(t => (
                <button key={t.key} onClick={() => setTreatFilter(t.key as TreatmentFilter)}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${treatFilter === t.key ? t.color : 'text-white/35 border-white/10 bg-white/5'}`}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Map */}
        <div className="relative shrink-0" style={{ height: '38vh' }}>
          <div ref={mapRef} className="w-full h-full" />

          {locationError && (
            <div className="absolute inset-0 flex items-center justify-center z-10"
              style={{ background: 'rgba(7,11,26,0.88)', backdropFilter: 'blur(8px)' }}>
              <div className="text-center px-6">
                <Navigation className="h-10 w-10 text-teal-400 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-bold text-white mb-1">Location needed</p>
                <p className="text-xs text-white/45 mb-4">{locationError}</p>
                <button onClick={() => window.location.reload()}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg,#00BCD4,#0097A7)' }}>
                  Enable Location
                </button>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-full flex items-center gap-2"
              style={{ background: 'rgba(10,15,30,0.95)', border: '1px solid rgba(0,188,212,0.28)', backdropFilter: 'blur(12px)' }}>
              <Loader2 className="h-3.5 w-3.5 text-teal-400 animate-spin" />
              <span className="text-xs font-bold text-teal-300">Scanning for specialists...</span>
            </div>
          )}

          {!isLoading && physical.length > 0 && (
            <div className="absolute top-3 left-3 z-10 px-3 py-1.5 rounded-full flex items-center gap-1.5"
              style={{ background: 'rgba(0,188,212,0.13)', border: '1px solid rgba(0,188,212,0.38)', backdropFilter: 'blur(12px)' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              <span className="text-xs font-bold text-teal-300">{physical.length} specialist{physical.length !== 1 ? 's' : ''} found</span>
            </div>
          )}
        </div>

        {/* Doctor list */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28">

          {showGreeting && !isLoading && meta && (
            <AIGreeting profile={profile} hdss={hdss} meta={meta} city={city} onDismiss={() => setShowGreeting(false)} />
          )}

          {/* Care gap */}
          {!isLoading && meta?.careGap && physical.length === 0 && (
            <CareGapCard onWiden={() => setScope(scope === 'city' ? 'country' : 'continent')} hideWiden={scope === 'continent'} />
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-14">
              <div className="relative w-14 h-14 mb-4">
                <div className="absolute inset-0 rounded-full border-2 border-teal-500/20" />
                <div className="absolute inset-0 rounded-full border-t-2 border-teal-400 animate-spin" />
                <Sparkles className="absolute inset-0 m-auto h-5 w-5 text-teal-400" />
              </div>
              <p className="text-sm font-bold text-white/50">Finding specialists near you...</p>
              <p className="text-xs text-white/25 mt-1">Checking curated database + Geoapify Places</p>
            </div>
          )}

          {/* Physical specialists */}
          {physical.length > 0 && (
            <>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-white/8" />
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Physical Clinics</span>
                <div className="h-px flex-1 bg-white/8" />
              </div>
              <div className="space-y-3 mb-6">
                {physical.map(doc => (
                  <DoctorCard key={doc.id} doctor={doc} isActive={activePin === doc.id}
                    onTap={() => {
                      setActivePin(doc.id); setSelectedDoctor(doc);
                      if (mapInst.current) mapInst.current.setView([doc.lat, doc.lng], 15, { animate: true });
                    }} />
                ))}
              </div>
            </>
          )}

          {/* Telehealth section */}
          {telehealth.length > 0 && (
            <>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-white/8" />
                <span className="text-[10px] font-bold text-violet-400/60 uppercase tracking-widest">📡 Telehealth Bridge</span>
                <div className="h-px flex-1 bg-white/8" />
              </div>
              {physical.length === 0 && (
                <div className="rounded-xl p-3 mb-3"
                  style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.2)' }}>
                  <p className="text-xs text-violet-300/80 leading-relaxed">
                    No physical specialists nearby — but these virtual experts can review your Warrior Report today. Telehealth is often the fastest path to HH diagnosis in Africa.
                  </p>
                </div>
              )}
              <div className="space-y-3 mb-6">
                {telehealth.map(doc => (
                  <DoctorCard key={doc.id} doctor={doc} isActive={activePin === doc.id}
                    onTap={() => { setActivePin(doc.id); setSelectedDoctor(doc); }} />
                ))}
              </div>
            </>
          )}

          {/* IHS link */}
          <a href="https://www.sweathelp.org/find-a-provider.html" target="_blank" rel="noreferrer"
            className="flex items-center justify-between w-full rounded-2xl p-4 mb-4 transition-all active:scale-[0.98]"
            style={{ background: 'rgba(250,204,21,0.06)', border: '1px solid rgba(250,204,21,0.2)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(250,204,21,0.15)' }}>
                <Award className="h-4 w-4 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-yellow-300">IHS Global Provider Directory</p>
                <p className="text-[11px] text-white/40">Find HH-certified doctors worldwide</p>
              </div>
            </div>
            <ExternalLink className="h-4 w-4 text-yellow-400/50" />
          </a>

          <p className="text-[10px] text-white/18 text-center leading-relaxed px-4 mb-4">
            Data from HidroAlly curated database, Geoapify Places & IHS directory. Always verify credentials before booking. Not medical advice.
          </p>
        </div>
      </div>

      {selectedDoctor && (
        <DoctorModal doctor={selectedDoctor} onClose={() => { setSelectedDoctor(null); setActivePin(null); }} onShare={handleShare} />
      )}
    </PageTransition>
  );
};

export default SpecialistRadar;
