"use client"

import { useState } from "react"
import { submitServiceRequest } from "@/lib/actions"
import { MaterialIcon } from "./material-icon"
import { SERVICE_TYPES } from "@/lib/types"

interface ServiceRequestFormProps {
  mechanicId: string
  mechanicServices: string
}

export function ServiceRequestForm({ mechanicId, mechanicServices }: ServiceRequestFormProps) {
  const [phone, setPhone] = useState("")
  const [phoneError, setPhoneError] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Get digits only
    let raw = e.target.value.replace(/\D/g, "");
    
    // Handle PH Mobile Format (09...)
    if (raw.startsWith("0")) {
      if (raw.length > 11) raw = raw.slice(0, 11);
    } else if (raw.startsWith("63")) {
      if (raw.length > 12) raw = raw.slice(0, 12);
    }
    
    // Auto-formatting Logic (09XX-XXX-XXXX)
    let formatted = raw;
    if (raw.startsWith("09")) {
      if (raw.length > 4) {
        formatted = raw.slice(0, 4) + "-" + raw.slice(4, 7);
        if (raw.length > 7) {
          formatted += "-" + raw.slice(7, 11);
        }
      }
    } else if (raw.startsWith("639")) {
      // 63-9XX-XXX-XXXX or similar? Let's just do 09 as primary.
      if (raw.length > 5) {
        formatted = raw.slice(0, 5) + "-" + raw.slice(5, 8);
        if (raw.length > 8) {
          formatted += "-" + raw.slice(8, 12);
        }
      }
    }

    setPhone(formatted);

    // Immediate Validation (Regex against raw digits)
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
  }

  const handleSubmit = async (formData: FormData) => {
    // Final check on raw digits
    const raw = phone.replace(/\D/g, "");
    const phMobileRegexRaw = /^(09|639)\d{9}$/;
    
    if (!phMobileRegexRaw.test(raw)) {
      setPhoneError("Please enter a valid PH mobile number");
      return;
    }

    // Replace the phone value in FormData with the cleaned version for DB
    formData.set("customer_phone", raw);

    setLoading(true)
    setError("")
    const result = await submitServiceRequest(formData)
    setLoading(false)
    if (result.success) {
      setSubmitted(true)
    } else {
      setError(result.error || "Something went wrong.")
    }
  }

  if (submitted) {
    return (
      <div className="glass-card p-8 rounded-3xl border border-foreground/10 text-center">
        <div className="w-16 h-16 bg-turbo-orange/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <MaterialIcon name="check_circle" className="text-4xl text-turbo-orange" />
        </div>
        <h3 className="text-xl font-black text-foreground italic mb-2">REQUEST SENT</h3>
        <p className="text-muted-foreground text-sm">
          The mechanic will contact you soon. Salamat!
        </p>
      </div>
    )
  }

  const availableServices = mechanicServices
    ? mechanicServices.split(",").map((s) => s.trim()).filter(Boolean)
    : [...SERVICE_TYPES]

  return (
    <div className="glass-card p-8 rounded-3xl border border-foreground/10 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-turbo-orange/5 blur-3xl rounded-full" />
      <h3 className="text-xl font-black text-foreground italic mb-6 text-center">REQUEST SERVICE</h3>
      <form action={handleSubmit} className="flex flex-col gap-5">
        <input type="hidden" name="mechanic_id" value={mechanicId} />
        <input type="hidden" name="customer_phone" value={phone} />

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Your Name *
          </label>
          <input
            name="customer_name"
            required
            placeholder="Juan Dela Cruz"
            className="w-full h-14 bg-background/80 border border-foreground/10 rounded-xl px-4 text-foreground text-sm focus:ring-2 focus:ring-turbo-orange focus:outline-none transition-all placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Phone Number *
            </label>
            {phoneError && <span className="text-[9px] font-bold text-red-500 animate-pulse">{phoneError}</span>}
          </div>
          <input
            value={phone}
            onChange={handlePhoneChange}
            required
            type="tel"
            placeholder="09XX XXX XXXX"
            className={`w-full h-14 bg-background/80 border rounded-xl px-4 text-foreground text-sm focus:ring-2 focus:outline-none transition-all placeholder:text-muted-foreground ${
              phoneError ? "border-red-500/50 focus:ring-red-500/30" : "border-foreground/10 focus:ring-turbo-orange"
            }`}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Vehicle Info
          </label>
          <input
            name="vehicle_info"
            placeholder="e.g. Toyota Vios 2019"
            className="w-full h-14 bg-background/80 border border-foreground/10 rounded-xl px-4 text-foreground text-sm focus:ring-2 focus:ring-turbo-orange focus:outline-none transition-all placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Service Needed
          </label>
          <select
            name="service_type"
            required
            className="w-full h-14 bg-background/80 border border-foreground/10 rounded-xl px-4 text-foreground text-sm focus:ring-2 focus:ring-turbo-orange focus:outline-none transition-all appearance-none"
          >
            <option value="">Select a service</option>
            {availableServices.map((svc) => (
              <option key={svc} value={svc}>{svc}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Service Preference *
          </label>
          <select
            name="service_preference"
            required
            className="w-full h-14 bg-background/80 border border-foreground/10 rounded-xl px-4 text-foreground text-sm focus:ring-2 focus:ring-turbo-orange focus:outline-none transition-all appearance-none"
          >
            <option value="">Select preference</option>
            <option value="Home Service">Home Service</option>
            <option value="On Shop">On Shop</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Message (Optional)
          </label>
          <textarea
            name="message"
            rows={3}
            placeholder="Describe what you need..."
            className="w-full bg-background/80 border border-foreground/10 rounded-xl px-4 py-3 text-foreground text-sm focus:ring-2 focus:ring-turbo-orange focus:outline-none transition-all resize-none placeholder:text-muted-foreground"
          />
        </div>

        {error && <p className="text-destructive text-xs text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-16 bg-turbo-orange orange-glow text-midnight font-black uppercase tracking-[0.15em] rounded-xl flex items-center justify-center gap-3 transition-transform active:scale-95 disabled:opacity-60"
        >
          {loading && <div className="w-5 h-5 border-2 border-midnight border-t-transparent rounded-full animate-spin" />}
          <span>{loading ? "Sending..." : "Send Request"}</span>
          {!loading && <MaterialIcon name="bolt" className="font-bold" />}
        </button>
      </form>
    </div>
  )
}
