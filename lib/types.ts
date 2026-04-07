export interface Shop {
  id: string
  name: string
  description: string | null
  services: string
  address: string | null
  barangay: string | null
  city: string
  province: string
  latitude: number | null
  longitude: number | null
  phone: string | null
  opening_hours: string | null
  image_url: string | null
  rating: number
  review_count: number
  is_verified: boolean
  created_at: string
}

export interface Mechanic {
  id: string
  name: string
  email: string
  bio: string | null
  specializations: string[]
  barangay: string | null
  city: string
  province: string
  latitude: number | null
  longitude: number | null
  phone: string | null
  image_url: string | null
  rating: number
  review_count: number
  is_verified: boolean
  is_available: boolean
  created_at: string
}

export interface ShopRequest {
  id: string
  shop_name: string
  owner_name: string
  contact_details: string
  address: string
  google_maps_link: string
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason: string | null
  created_at: string
}

export interface MechanicRequest {
  id: string
  full_name: string
  contact_number: string
  email: string
  specializations: string[]
  experience_years: number
  valid_id_url: string
  google_maps_pin_lat: number
  google_maps_pin_lng: number
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason: string | null
  created_at: string
}

export interface ServiceRequest {
  id: string
  mechanic_id: string
  customer_name: string
  customer_phone: string
  vehicle_info: string | null
  service_type: string | null
  service_preference: 'Home Service' | 'On Shop' | null
  message: string | null
  status: 'pending' | 'accepted' | 'on_my_way' | 'arrived' | 'in_progress' | 'completed' | 'cancelled'
  customer_email: string | null
  customer_avatar_url: string | null
  created_at: string
  mechanic_name?: string
  mechanic_image_url?: string | null
  quote_amount?: number | null
  quote_description?: string | null
  quote_status?: 'pending' | 'accepted' | 'rejected' | null
  quote_updated_at?: string | null
  is_reviewed?: boolean
}

export interface Review {
  id: string
  request_id: string
  mechanic_id: string
  customer_name: string
  customer_avatar_url: string | null
  rating: number
  comment: string | null
  created_at: string
}

export interface ChatMessage {
  id: string
  request_id: string
  sender_email: string
  sender_role: 'admin' | 'customer' | 'mechanic'
  content: string
  image_url?: string | null
  storage_purged?: boolean
  created_at: string
}

export const PH_CITIES = [
  { label: "Manila", value: "Manila", province: "Metro Manila", lat: 14.5995, lng: 120.9842 },
  { label: "Quezon City", value: "Quezon City", province: "Metro Manila", lat: 14.6760, lng: 121.0437 },
  { label: "Makati", value: "Makati", province: "Metro Manila", lat: 14.5547, lng: 121.0244 },
  { label: "Pasig", value: "Pasig", province: "Metro Manila", lat: 14.5764, lng: 121.0851 },
  { label: "Taguig", value: "Taguig", province: "Metro Manila", lat: 14.5176, lng: 121.0509 },
  { label: "Cebu City", value: "Cebu City", province: "Cebu", lat: 10.3157, lng: 123.8854 },
  { label: "Davao City", value: "Davao City", province: "Davao del Sur", lat: 7.1907, lng: 125.4553 },
  { label: "Angeles City", value: "Angeles City", province: "Pampanga", lat: 15.1451, lng: 120.5947 },
  { label: "Antipolo", value: "Antipolo", province: "Rizal", lat: 14.5845, lng: 121.1754 },
  { label: "Caloocan", value: "Caloocan", province: "Metro Manila", lat: 14.6416, lng: 120.9762 },
  { label: "Cagayan de Oro", value: "Cagayan de Oro", province: "Misamis Oriental", lat: 8.4875, lng: 124.6497 },
] as const

export const SERVICE_TYPES = [
  "General Repair",
  "Oil Change",
  "Vulcanizing",
  "Tire Services",
  "Car Wash",
  "Engine Tune-Up",
  "Brake Services",
  "Electrical",
  "Air Conditioning",
  "Body & Paint",
] as const

export function getDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
