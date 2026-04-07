'use client';

import { useState, useEffect } from 'react';
import { MaterialIcon } from './material-icon';
import { submitMechanicRequest, checkIfAlreadyMechanic } from '@/lib/actions';
import { createClient } from '@/lib/supabase/client';
import dynamic from 'next/dynamic';
import { SERVICE_TYPES } from '@/lib/types';
import Link from 'next/link';

// Leaflet components are dynamically imported below to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });

function LocationMarker({ position, setPosition, icon }: { 
  position: [number, number], 
  setPosition: (pos: [number, number]) => void,
  icon: any
}) {
  // Only import useMapEvents on the client
  const { useMapEvents } = require('react-leaflet');
  
  useMapEvents({
    click(e: any) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position === null ? null : (
    <Marker position={position} icon={icon} />
  );
}

export function MechanicRegistrationForm() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState<'approved' | 'pending' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState("");
  const [pinPosition, setPinPosition] = useState<[number, number]>([14.5995, 120.9842]); // Default Manila
  const [locating, setLocating] = useState(false);
  
  // Form State to preserve data across steps
  const [profile, setProfile] = useState({
    full_name: '',
    contact_number: '',
    email: '',
    experience_years: ''
  });
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);
  const [registrationIcon, setRegistrationIcon] = useState<any>(null);

  // Initial Check for Existing Registration
  useEffect(() => {
    const checkStatus = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setProfile(p => ({ ...p, email: user.email! }));
        
        // Final sanity check for existing registration
        const check = await checkIfAlreadyMechanic(user.email);
        if (check.registered) {
          setAlreadyRegistered(check.status as any);
        }
      }
    };
    checkStatus();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Only load Leaflet on the client
    const L = require('leaflet');
    require('leaflet/dist/leaflet.css');
    
    const icon = L.divIcon({
      className: 'custom-registration-icon',
      html: `
        <div class="relative w-10 h-10 -translate-x-1/2 -translate-y-full">
          <div class="w-full h-full bg-turbo-orange rounded-full flex items-center justify-center text-midnight shadow-[0_0_20px_rgba(255,95,0,0.5)] border-2 border-white animate-in zoom-in">
            <span class="material-symbols-outlined text-xl">engineering</span>
          </div>
          <div class="w-1 h-3 bg-turbo-orange mx-auto -mt-1 shadow-lg"></div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });
    setRegistrationIcon(icon);
  }, []);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, "");
    if (raw.startsWith("0")) {
      if (raw.length > 11) raw = raw.slice(0, 11);
    } else if (raw.startsWith("63")) {
      if (raw.length > 12) raw = raw.slice(0, 12);
    }
    
    let formatted = raw;
    if (raw.startsWith("09")) {
      if (raw.length > 4) {
        formatted = raw.slice(0, 4) + "-" + raw.slice(4, 7);
        if (raw.length > 7) formatted += "-" + raw.slice(7, 11);
      }
    } else if (raw.startsWith("639")) {
      if (raw.length > 5) {
        formatted = raw.slice(0, 5) + "-" + raw.slice(5, 8);
        if (raw.length > 8) formatted += "-" + raw.slice(8, 12);
      }
    }

    setProfile(prev => ({ ...prev, contact_number: formatted }));

    const phMobileRegexRaw = /^(09|639)\d{9}$/;
    if (raw.length > 0) {
      if (!phMobileRegexRaw.test(raw)) {
        if (!raw.startsWith("09") && !raw.startsWith("639")) {
          setPhoneError("Start with 09 or 639");
        } else if (raw.length < 11) {
          setPhoneError("Number incomplete");
        } else {
          setPhoneError("Invalid format");
        }
      } else {
        setPhoneError("");
      }
    } else {
      setPhoneError("");
    }
  };

  const handleSpecToggle = (spec: string) => {
    setSelectedSpecs(prev => 
      prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]
    );
  };

  const handleGeolocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setPinPosition(newPos);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true }
    );
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const rawPhone = profile.contact_number.replace(/\D/g, "");
    const phMobileRegexRaw = /^(09|639)\d{9}$/;
    
    if (!phMobileRegexRaw.test(rawPhone)) {
      setPhoneError("Please enter a valid PH mobile number");
      setStep(1); // Go back to step 1 to show the error
      setIsSubmitting(false);
      return;
    }

    const finalFormData = new FormData();
    finalFormData.append('full_name', profile.full_name);
    finalFormData.append('contact_number', rawPhone);
    finalFormData.append('email', profile.email);
    finalFormData.append('experience_years', profile.experience_years);
    selectedSpecs.forEach(spec => finalFormData.append('specializations', spec));
    finalFormData.append('google_maps_pin_lat', pinPosition[0].toString());
    finalFormData.append('google_maps_pin_lng', pinPosition[1].toString());

    const result = await submitMechanicRequest(finalFormData);
    
    if (!result.success) {
      console.error("Submission failed:", result.error);
    }

    if (result.success) {
      setSubmitted(true);
    } else {
      setError(result.error || 'Something went wrong');
    }
    setIsSubmitting(false);
  }

  if (alreadyRegistered) {
    return (
      <div className="py-12 text-center animate-in zoom-in">
        <div className="w-20 h-20 bg-turbo-orange/20 rounded-full flex items-center justify-center mx-auto mb-6 text-turbo-orange">
          <MaterialIcon name="verified_user" className="text-5xl" />
        </div>
        <h3 className="text-xl font-black text-foreground uppercase tracking-tighter mb-2 italic">
          {alreadyRegistered === 'approved' ? "You're Already a Mechanic" : "Application Pending"}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-8">
          {alreadyRegistered === 'approved' 
            ? "Your account is already verified and active in the TaraFix network. You can start accepting jobs from your dashboard."
            : "We've received your application. Our team is currently reviewing your credentials. Check your email for updates!"}
        </p>
        <Link href="/profile" className="inline-flex h-12 px-8 bg-turbo-orange text-midnight font-black uppercase tracking-widest text-[10px] rounded-xl items-center justify-center orange-glow">
          Go to My Dashboard
        </Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="py-12 text-center animate-in zoom-in">
        <div className="w-20 h-20 bg-turbo-orange/20 rounded-full flex items-center justify-center mx-auto mb-6 text-turbo-orange">
          <MaterialIcon name="verified_user" className="text-5xl" />
        </div>
        <h3 className="text-xl font-black text-foreground uppercase tracking-tighter mb-2 italic">Application Sent!</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Our team is reviewing your credentials and verifying your service base location. Expect a call within 24-48 hours.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Floating Notification for Existing Mechanics */}
      {alreadyRegistered && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[999] w-[calc(100%-40px)] max-w-sm animate-in slide-in-from-top-10 duration-500">
          <div className="glass p-4 rounded-2xl border border-turbo-orange/30 shadow-[0_20px_50px_rgba(255,95,0,0.2)] flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-turbo-orange/20 flex items-center justify-center text-turbo-orange shrink-0">
              <MaterialIcon name="info" />
            </div>
            <div className="flex flex-col">
              <p className="text-[10px] font-black text-foreground uppercase tracking-widest">System Alert</p>
              <p className="text-xs font-bold text-turbo-orange leading-tight">You're already registered as mechanic</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {step === 1 && (
        <div className="flex flex-col gap-5 animate-in slide-in-from-right-4">
          <div className="space-y-4">
            <h2 className="text-lg font-black text-foreground uppercase tracking-tight italic">Professional Profile</h2>
            
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Full Name</label>
              <input required name="full_name" value={profile.full_name} onChange={handleProfileChange} className="h-12 bg-background/50 border border-foreground/10 rounded-xl px-4 text-sm focus:ring-2 focus:ring-turbo-orange outline-none" placeholder="Juan Dela Cruz" />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Contact Number</label>
                {phoneError && <span className="text-[9px] font-bold text-red-500 animate-pulse">{phoneError}</span>}
              </div>
              <input 
                required 
                name="contact_number" 
                type="tel"
                value={profile.contact_number} 
                onChange={handlePhoneChange} 
                className={`h-12 bg-background/50 border rounded-xl px-4 text-sm focus:ring-2 focus:outline-none transition-all ${
                  phoneError ? "border-red-500/50 focus:ring-red-500/30" : "border-foreground/10 focus:ring-turbo-orange"
                }`} 
                placeholder="09XX-XXX-XXXX" 
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Email Address <span className="text-electric-blue ml-1">(Linked to Account)</span></label>
              <input required name="email" type="email" value={profile.email} onChange={handleProfileChange} readOnly className="h-12 bg-background/50 border border-foreground/10 rounded-xl px-4 text-sm focus:ring-2 focus:ring-turbo-orange outline-none opacity-70 cursor-not-allowed" placeholder="juan@example.com" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Years of Experience</label>
              <input required name="experience_years" type="number" min="0" value={profile.experience_years} onChange={handleProfileChange} className="h-12 bg-background/50 border border-foreground/10 rounded-xl px-4 text-sm focus:ring-2 focus:ring-turbo-orange outline-none" placeholder="Years of auto repair exp" />
            </div>
          </div>
          
          <button type="button" onClick={() => setStep(2)} className="h-14 bg-white text-midnight font-black uppercase tracking-[0.2em] text-xs rounded-2xl flex items-center justify-center gap-2">
            Next: Specializations
            <MaterialIcon name="arrow_forward" />
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-5 animate-in slide-in-from-right-4">
          <div className="space-y-4">
            <h2 className="text-lg font-black text-foreground uppercase tracking-tight italic">Your Expertise</h2>
            <div className="grid grid-cols-2 gap-3">
              {SERVICE_TYPES.map(service => (
                <label key={service} className="flex items-center gap-3 p-3 bg-midnight/40 border border-white/5 rounded-xl cursor-pointer hover:border-turbo-orange/30 transition-all">
                  <input 
                    type="checkbox" 
                    checked={selectedSpecs.includes(service)}
                    onChange={() => handleSpecToggle(service)}
                    className="w-4 h-4 accent-turbo-orange" 
                  />
                  <span className="text-[10px] font-black text-foreground uppercase tracking-tight">{service}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)} className="flex-1 h-14 glass text-foreground font-black uppercase tracking-[0.2em] text-xs rounded-2xl">Back</button>
            <button type="button" onClick={() => setStep(3)} className="flex-2 h-14 bg-white text-midnight font-black uppercase tracking-[0.2em] text-xs rounded-2xl flex items-center justify-center gap-2">
              Next: Location Pin
              <MaterialIcon name="location_on" />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-5 animate-in slide-in-from-right-4">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-black text-foreground uppercase tracking-tight italic">Truth Pinning</h2>
              <button type="button" onClick={handleGeolocation} disabled={locating} className="text-[10px] font-black text-turbo-orange uppercase tracking-[0.2em] flex items-center gap-1">
                <MaterialIcon name="my_location" className="text-sm" />
                {locating ? 'Locating...' : 'Use Current'}
              </button>
            </div>
            
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
              Pin your exact service base. This is where users will find you as "Nearby".
            </p>

            <div className="h-64 rounded-2xl overflow-hidden border border-white/10 relative">
              {typeof window !== 'undefined' && (
                <MapContainer
                  center={pinPosition}
                  zoom={15}
                  className="h-full w-full"
                  scrollWheelZoom={false}
                >
                  {/* Esri World Imagery Layer for high-res verification without API key */}
                  <TileLayer 
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" 
                    attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                  />
                  {/* Label layer to help identify streets */}
                  <TileLayer 
                    url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
                    opacity={0.8}
                  />
                  <LocationMarker 
                    position={pinPosition} 
                    setPosition={setPinPosition} 
                    icon={registrationIcon}
                  />
                </MapContainer>
              )}
              <div className="absolute top-4 right-4 z-[1000] p-2 glass rounded-lg border border-white/10">
                <p className="text-[8px] font-black text-foreground uppercase mb-1">Truth Coordinates</p>
                <code className="text-[10px] text-turbo-orange font-bold">
                  {pinPosition[0].toFixed(5)}, {pinPosition[1].toFixed(5)}
                </code>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-black text-center uppercase tracking-tight">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(2)} className="flex-1 h-14 glass text-foreground font-black uppercase tracking-[0.2em] text-xs rounded-2xl">Back</button>
            <button
              disabled={isSubmitting}
              type="submit"
              className="flex-2 h-14 bg-turbo-orange orange-glow text-midnight font-black uppercase tracking-[0.2em] text-xs rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-midnight border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <MaterialIcon name="how_to_reg" />
                  Apply as Mechanic
                </>
              )}
            </button>
          </div>
        </div>
      )}
      </form>
    </>
  );
}
