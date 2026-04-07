"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Shop, Mechanic, MechanicRequest, ServiceRequest, Review } from "./types"
import { strictRatelimit } from "./ratelimit"
import { headers } from "next/headers"
import webpush from 'web-push'

export async function getMechanics(options?: {
  city?: string
  service?: string
}): Promise<Mechanic[]> {
  const supabase = await createClient()

  let query = supabase.from("mechanics").select("*")

  if (options?.city) {
    query = query.eq("city", options.city)
  }

  const { data, error } = await query.order("rating", { ascending: false })

  if (error) {
    console.error("Error fetching mechanics:", JSON.stringify(error, null, 2))
    return []
  }

  let mechanics = (data || []) as Mechanic[]

  if (options?.service) {
    mechanics = mechanics.filter((m) =>
      m.specializations?.some((s: string) => s.toLowerCase() === options.service!.toLowerCase())
    )
  }

  return mechanics
}

export async function getMechanicById(id: string): Promise<Mechanic | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("mechanics")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    console.error("Error fetching mechanic:", error)
    return null
  }

  return data as Mechanic
}

export async function getReviewsByMechanicId(mechanicId: string): Promise<Review[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("mechanic_id", mechanicId)
        .order("created_at", { ascending: false })

    if (error) {
        console.error("Error fetching reviews:", error)
        return []
    }

    return data as Review[]
}

export async function getMechanicByEmail(email: string): Promise<Mechanic | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("mechanics")
    .select("*")
    .eq("email", email)
    .maybeSingle()

  if (error) {
    console.error("Error fetching mechanic by email:", error)
    return null
  }

  let mechanic = data as Mechanic

  // Proactively update mechanic image from Google if missing
  if (mechanic && !mechanic.image_url) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email === email && user.user_metadata?.avatar_url) {
      await supabase.from("mechanics").update({ image_url: user.user_metadata.avatar_url }).eq("id", mechanic.id)
      mechanic.image_url = user.user_metadata.avatar_url
    }
  }

  return mechanic
}

export async function getShops(options?: {
  city?: string
  service?: string
}): Promise<Shop[]> {
  const supabase = await createClient()

  let query = supabase.from("shops").select("*")

  if (options?.city) {
    query = query.eq("city", options.city)
  }

  const { data, error } = await query.order("rating", { ascending: false })

  if (error) {
    console.error("Error fetching shops:", JSON.stringify(error, null, 2))
    return []
  }

  let shops = (data || []) as Shop[]

  if (options?.service) {
    shops = shops.filter((s) =>
      s.services?.toLowerCase().includes(options.service!.toLowerCase())
    )
  }

  return shops
}

export async function getShopById(id: string): Promise<Shop | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("shops")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    console.error("Error fetching shop:", error)
    return null
  }

  return data as Shop
}

export async function submitServiceRequest(formData: FormData) {
  // Rate Limit Check
  const headerList = await headers()
  const ip = headerList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1"
  const { success } = await strictRatelimit.limit(`submit_service_${ip}`)
  
  if (!success) {
    return { success: false, error: "Too many requests. Please try again in a minute." }
  }

  const supabase = await createClient()

  const mechanicId = formData.get("mechanic_id") as string
  const customerName = formData.get("customer_name") as string
  const customerPhone = formData.get("customer_phone") as string
  const vehicleInfo = formData.get("vehicle_info") as string
  const serviceType = formData.get("service_type") as string
  const servicePreference = formData.get("service_preference") as string
  const message = formData.get("message") as string

  if (!mechanicId || !customerName || !customerPhone || !servicePreference) {
    return { success: false, error: "Please fill in all required fields." }
  }

  const { data: { user } } = await supabase.auth.getUser()
  const customerAvatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null

  const { error } = await supabase.from("service_requests").insert({
    mechanic_id: mechanicId,
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_email: user?.email || null,
    customer_avatar_url: customerAvatarUrl,
    vehicle_info: vehicleInfo || null,
    service_type: serviceType || null,
    service_preference: servicePreference,
    message: message || null,
  })

  if (error) {
    console.error("Error submitting service request:", error)
    return { success: false, error: "Something went wrong. Please try again." }
  }

  return { success: true }
}

export async function submitShopRequest(formData: FormData) {
  // Rate Limit Check
  const headerList = await headers()
  const ip = headerList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1"
  const { success } = await strictRatelimit.limit(`submit_shop_${ip}`)
  
  if (!success) {
    return { success: false, error: "Too many requests. Please try again in a minute." }
  }

  const supabase = await createClient()

  const shopName = formData.get("shop_name") as string
  const ownerName = formData.get("owner_name") as string
  const contactDetails = formData.get("contact_details") as string
  const address = formData.get("address") as string
  const googleMapsLink = formData.get("google_maps_link") as string

  if (!shopName || !ownerName || !contactDetails || !address || !googleMapsLink) {
    return { success: false, error: "Please fill in all fields." }
  }

  const isGoogleMapsUrl = googleMapsLink.includes("google.com/maps") || googleMapsLink.includes("maps.app.goo.gl")
  if (!isGoogleMapsUrl) {
    return { success: false, error: "Please provide a valid Google Maps link." }
  }

  const { data: existingShop } = await supabase
    .from("shops")
    .select("id")
    .ilike("name", shopName)
    .ilike("address", `%${address.substring(0, 5)}%`)
    .maybeSingle()

  if (existingShop) {
    return { success: false, error: "This shop appears to be already listed." }
  }

  const { error } = await supabase.from("shop_requests").insert({
    shop_name: shopName,
    owner_name: ownerName,
    contact_details: contactDetails,
    address: address,
    google_maps_link: googleMapsLink,
    status: 'pending'
  })

  if (error) {
    console.error("Error submitting shop request:", error)
    return { success: false, error: "Something went wrong. Please try again." }
  }

  return { success: true }
}
export async function getShopRequests() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("shop_requests")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching shop requests:", error)
    return []
  }

  return data
}

export async function getServiceRequests() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("service_requests")
    .select("*, mechanics(name, image_url)")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching service requests:", error)
    return []
  }

  return data.map((req: any) => ({
    ...req,
    mechanic_name: req.mechanics?.name || "Unknown Mechanic",
    mechanic_image_url: req.mechanics?.image_url || null
  }))
}

export async function getUsersServiceRequests(email: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("service_requests")
    .select("*, mechanics(name, image_url)")
    .eq("customer_email", email)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching user's service requests:", error)
    return []
  }

  return data.map((req: any) => ({
    ...req,
    mechanic_name: req.mechanics?.name || "Unknown Mechanic",
    mechanic_image_url: req.mechanics?.image_url || null
  }))
}

export async function getMechanicServiceRequests(mechanicId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("service_requests")
    .select("*, mechanics(name, image_url)")
    .eq("mechanic_id", mechanicId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching mechanic's service requests:", error)
    return []
  }

  return data.map((req: any) => ({
    ...req,
    mechanic_name: req.mechanics?.name || "Unknown Mechanic",
    mechanic_image_url: req.mechanics?.image_url || null
  }))
}

export async function getMessages(requestId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("service_request_messages")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Error fetching messages:", error)
    return []
  }

  return data
}

export async function uploadChatImage(requestId: string, file: File | Blob, fileName: string) {
    const supabase = await createClient()
    
    // Upload to bucket under requestId folder
    const path = `${requestId}/${Date.now()}_${fileName}`
    const { data, error } = await supabase.storage
        .from('chat_attachments')
        .upload(path, file, {
            contentType: 'image/webp', // We will compress to webp
            upsert: false
        })

    if (error) {
        console.error("Error uploading image:", error)
        return { success: false, error: "Failed to upload image." }
    }

    // Get public URL or just the path for private bucket access
    // Note: Since bucket is private, we will use signed URLs or the storage proxy
    // For now, we return the path which we will use with supabase.storage.from().createSignedUrl() later
    return { success: true, path: data.path }
}

export async function getSignedUrls(paths: string[]) {
    const supabase = await createClient()
    const { data, error } = await supabase.storage
        .from('chat_attachments')
        .createSignedUrls(paths, 3600) // 1 hour expiry

    if (error) {
        console.error("Error generating signed URLs:", error)
        return []
    }

    return data
}

export async function cleanupChatImages(requestId: string) {
    const supabase = await createClient()
    
    // 1. List all files in the requestId folder
    const { data: files, error: listError } = await supabase.storage
        .from('chat_attachments')
        .list(requestId)

    if (listError) {
        console.error("Cleanup error (list):", listError)
        return { success: false }
    }

    if (files && files.length > 0) {
        // 2. Delete all files
        const pathsToDelete = files.map(f => `${requestId}/${f.name}`)
        const { error: deleteError } = await supabase.storage
            .from('chat_attachments')
            .remove(pathsToDelete)

        if (deleteError) {
            console.error("Cleanup error (delete):", deleteError)
        }
    }

    // 3. Mark messages as purged in DB
    await supabase.from("service_request_messages")
        .update({ storage_purged: true })
        .eq("request_id", requestId)

    return { success: true }
}

export async function sendChatMessage(requestId: string, content: string, senderRole: 'admin' | 'customer' | 'mechanic', senderEmail: string, imageUrl?: string | null) {
  const supabase = await createClient()
  
  // 1. Save message to DB
  const { error } = await supabase.from("service_request_messages").insert({
    request_id: requestId,
    content,
    sender_role: senderRole,
    sender_email: senderEmail,
    image_url: imageUrl || null
  })

  if (error) {
    console.error("Error sending message:", error)
    return { success: false, error: error.message || "Failed to send message." }
  }

  // 2. Identify Recipient for Push Notification
  try {
    const { data: request } = await supabase
      .from("service_requests")
      .select("customer_email, mechanic_id, mechanics(email), customer_name, service_name")
      .eq("id", requestId)
      .single();

    if (request) {
      let recipientEmail = '';
      if (senderRole === 'customer') {
        // Recipient is the mechanic
        recipientEmail = (request.mechanics as any)?.email;
      } else if (senderRole === 'mechanic') {
        // Recipient is the customer
        recipientEmail = request.customer_email;
      }

      if (recipientEmail) {
        // 3. Fetch recipient's push subscriptions
        const { data: subs } = await supabase
          .from("push_subscriptions")
          .select("subscription")
          .eq("user_email", recipientEmail);

        if (subs && subs.length > 0) {
          // 4. Configure web-push
          webpush.setVapidDetails(
            process.env.VAPID_SUBJECT || 'mailto:admin@tarafix.com',
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
            process.env.VAPID_PRIVATE_KEY!
          );

          const payload = JSON.stringify({
            title: `Message from ${senderRole === 'mechanic' ? 'Mechanic' : request.customer_name}`,
            body: content.length > 60 ? content.substring(0, 60) + '...' : content,
            url: `/profile`
          });

          // 5. Send pushes in parallel
          await Promise.allSettled(
            subs.map(s => 
              webpush.sendNotification(s.subscription as any, payload)
                .catch((err: any) => {
                   if (err.statusCode === 410 || err.statusCode === 404) {
                     // Subscription expired or gone, should clean up
                     return supabase.from("push_subscriptions").delete().eq("subscription", s.subscription);
                   }
                })
            )
          );
        }
      }
    }
  } catch (err) {
    console.error("Non-critical push error:", err);
  }

  return { success: true }
}

export async function updateShopRequestStatus(requestId: string, status: 'approved' | 'rejected', reason?: string) {
  const supabase = await createClient()

  const { data: request, error: fetchError } = await supabase
    .from("shop_requests")
    .select("*")
    .eq("id", requestId)
    .single()

  if (fetchError || !request) {
    return { success: false, error: "Request not found." }
  }

  if (status === 'approved') {
    const { error: insertError } = await supabase.from("shops").insert({
      name: request.shop_name,
      address: request.address,
      city: "Generic",
      province: "Philippines",
      is_verified: true,
      rating: 0,
      review_count: 0
    })

    if (insertError) {
      console.error("Error approving shop:", insertError)
      return { success: false, error: "Failed to add shop to database." }
    }
  }

  const { error: updateError } = await supabase
    .from("shop_requests")
    .update({ status, rejection_reason: reason })
    .eq("id", requestId)

  if (updateError) {
    return { success: false, error: "Failed to update request status." }
  }

  return { success: true }
}

export async function getMechanicRequests() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("mechanic_requests")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching fixer requests:", error)
    return []
  }

  return data
}

export async function submitMechanicRequest(formData: FormData) {
  // Rate Limit Check
  const headerList = await headers()
  const ip = headerList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1"
  const { success } = await strictRatelimit.limit(`submit_mechanic_${ip}`)
  
  if (!success) {
    return { success: false, error: "Too many requests. Please try again in a minute." }
  }

  const supabase = await createClient()

  const fullName = formData.get("full_name") as string
  const contactNumber = formData.get("contact_number") as string
  const email = formData.get("email") as string
  const specializations = formData.getAll("specializations") as string[]
  const experienceYears = parseInt(formData.get("experience_years") as string)
  const lat = parseFloat(formData.get("google_maps_pin_lat") as string)
  const lng = parseFloat(formData.get("google_maps_pin_lng") as string)

  if (!fullName || !contactNumber || !email) {
    return { success: false, error: "Please fill in all required fields." }
  }

  const { error } = await supabase.from("mechanic_requests").insert({
    full_name: fullName,
    contact_number: contactNumber,
    email: email,
    specializations: specializations,
    experience_years: experienceYears,
    google_maps_pin_lat: lat,
    google_maps_pin_lng: lng,
    status: 'pending'
  })

  if (error) {
    console.error("Error submitting fixer request:", error)
    return { success: false, error: "Something went wrong. Please try again." }
  }

  return { success: true }
}

export async function updateMechanicRequestStatus(requestId: string, status: 'approved' | 'rejected', reason?: string) {
  const supabase = await createClient()

  const { data: request, error: fetchError } = await supabase
    .from("mechanic_requests")
    .select("*")
    .eq("id", requestId)
    .single()

  if (fetchError || !request) {
    return { success: false, error: "Request not found." }
  }

  if (status === 'approved') {
    // Attempt reverse geocoding with OpenStreetMap Nominatim
    let resolvedCity = "Unknown City";
    let resolvedProvince = "Unknown Province";
    
    if (request.google_maps_pin_lat && request.google_maps_pin_lng) {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${request.google_maps_pin_lat}&lon=${request.google_maps_pin_lng}&format=json`, {
          headers: { 'User-Agent': 'TaraFix-App/1.0' }
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.address) {
            resolvedCity = data.address.city || data.address.town || data.address.municipality || data.address.village || "Unknown City";
            resolvedProvince = data.address.state || data.address.region || data.address.province || "Unknown Province";
          }
        }
      } catch (e) {
        console.error("Reverse geocoding failed during approval:", e);
      }
    }

    // Convert MechanicRequest to Mechanic entry
    const { error: insertError } = await supabase.from("mechanics").insert({
      name: request.full_name,
      email: request.email,
      specializations: request.specializations,
      phone: request.contact_number,
      latitude: request.google_maps_pin_lat,
      longitude: request.google_maps_pin_lng,
      is_verified: true,
      rating: 5.0,
      review_count: 0,
      is_available: true,
      city: resolvedCity,
      province: resolvedProvince,
      image_url: request.valid_id_url // Use this as initial placeholder if needed, or null
    })

    // If we can find the user record for this mechanic, grab their real Google avatar
    const { data: users } = await supabase.from('auth.users' as any).select('raw_user_metadata').eq('email', request.email)
    if (users && users.length > 0) {
      const avatarUrl = users[0].raw_user_metadata?.avatar_url || users[0].raw_user_metadata?.picture
      if (avatarUrl) {
        await supabase.from("mechanics").update({ image_url: avatarUrl }).eq("email", request.email)
      }
    }

    if (insertError) {
      console.error("Error approving fixer:", insertError)
      return { success: false, error: "Failed to create mechanic profile." }
    }
  }

  const { error: updateError } = await supabase
    .from("mechanic_requests")
    .update({ status, rejection_reason: reason })
    .eq("id", requestId)

  if (updateError) {
    return { success: false, error: "Failed to update request status." }
  }

  return { success: true }
}

export async function deleteServiceRequest(requestId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("service_requests").delete().eq("id", requestId)

  if (error) {
    console.error("Error deleting service request:", error)
    return { success: false, error: "Failed to delete request." }
  }

  revalidatePath('/admin')
  revalidatePath('/profile')
  return { success: true }
}

export async function updateServiceRequestStatus(requestId: string, status: ServiceRequest['status']) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Get current status for logging
  const { data: currentReq } = await supabase.from("service_requests").select("status").eq("id", requestId).single()

  const { error } = await supabase.from("service_requests").update({ 
    status,
    status_updated_at: new RegExp('completed|cancelled').test(status) ? new Date().toISOString() : undefined 
  }).eq("id", requestId)

  if (error) {
    console.error("Error updating service request status:", error)
    return { success: false, error: "Failed to update status." }
  }

  // Log the transition
  if (currentReq && user) {
    await supabase.from("service_request_status_logs").insert({
      request_id: requestId,
      old_status: currentReq.status,
      new_status: status,
      updated_by_email: user.email
    })
  }

  revalidatePath('/admin')
  revalidatePath('/profile')
  return { success: true }
}

export async function updateMechanicStatus(id: string, isAvailable: boolean) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("mechanics")
    .update({ is_available: isAvailable })
    .eq("id", id)
    .select()

  if (error) {
    console.error("Error updating mechanic status:", error)
    return { success: false, error: "Failed to update status." }
  }

  if (!data || data.length === 0) {
    console.error("No mechanic found with ID:", id)
    return { success: false, error: "Mechanic record not found or permission denied." }
  }

  revalidatePath('/profile')
  revalidatePath('/map')
  revalidatePath('/')
  return { success: true }
}

export async function updateMechanicProfile(email: string, data: Partial<Mechanic>) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("mechanics")
    .update({
      name: data.name,
      bio: data.bio,
      specializations: data.specializations,
      phone: data.phone
    })
    .eq("email", email)

  if (error) {
    console.error("Error updating mechanic profile:", error)
    return { success: false, error: "Failed to update profile." }
  }

  revalidatePath('/profile')
  return { success: true }
}

export async function syncCurrentUserAvatar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { success: false }

  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture
  if (!avatarUrl) return { success: false }

  // Update mechanics table
  await supabase.from("mechanics").update({ image_url: avatarUrl }).eq("email", user.email)
  
  // Update recent service requests as customer
  await supabase.from("service_requests").update({ customer_avatar_url: avatarUrl }).eq("customer_email", user.email)

  return { success: true }
}

export async function sendServiceQuote(requestId: string, amount: number, description: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from("service_requests")
        .update({
            quote_amount: amount,
            quote_description: description,
            quote_status: 'pending',
            quote_updated_at: new Date().toISOString()
        })
        .eq("id", requestId)

    if (error) {
        console.error("Error sending quote:", error)
        return { success: false, error: "Failed to send quote." }
    }

    revalidatePath(`/profile`)
    return { success: true }
}

export async function respondToQuote(requestId: string, status: 'accepted' | 'rejected') {
    const supabase = await createClient()
    const { error } = await supabase
        .from("service_requests")
        .update({
            quote_status: status,
            quote_updated_at: new Date().toISOString(),
            // Auto-advance status if accepted
            ...(status === 'accepted' ? { status: 'in_progress' } : {})
        })
        .eq("id", requestId)

    if (error) {
        console.error("Error responding to quote:", error)
        return { success: false, error: "Failed to process quote response." }
    }

    revalidatePath(`/profile`)
    return { success: true }
}

export async function submitReview(data: {
    requestId: string,
    mechanicId: string,
    customerName: string,
    customerAvatarUrl: string | null,
    rating: number,
    comment: string
}) {
    const supabase = await createClient()
    const { error } = await supabase
        .from("reviews")
        .insert({
            request_id: data.requestId,
            mechanic_id: data.mechanicId,
            customer_name: data.customerName,
            customer_avatar_url: data.customerAvatarUrl,
            rating: data.rating,
            comment: data.comment
        })

    if (error) {
        console.error("Error submitting review:", error)
        return { success: false, error: "Failed to submit review. You may have already reviewed this job." }
    }

    revalidatePath(`/mechanics/${data.mechanicId}`)
    revalidatePath(`/profile`)
    return { success: true }
}

export async function getMechanicStats(mechanicId: string) {
    const supabase = await createClient()

    // 1. Get request counts by status
    const { data: requests, error: reqError } = await supabase
        .from("service_requests")
        .select("status, created_at, status_updated_at")
        .eq("mechanic_id", mechanicId)

    if (reqError) {
        console.error("Error fetching request stats:", reqError)
        return null
    }

    const stats = {
        total: requests.length,
        completed: requests.filter(r => r.status === 'completed').length,
        pending: requests.filter(r => r.status === 'pending').length,
        cancelled: requests.filter(r => r.status === 'cancelled').length,
        active: requests.filter(r => ['accepted', 'on_my_way', 'arrived', 'in_progress'].includes(r.status)).length,
        avgResponseTimeSub30: 0, // Placeholder calculation if metrics exist in future
    }

    // 2. Get ratings
    const { data: reviews, error: revError } = await supabase
        .from("reviews")
        .select("rating")
        .eq("mechanic_id", mechanicId)

    const avgRating = reviews && reviews.length > 0 
        ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length 
        : 5.0

    // 3. Get last activity
    const { data: lastReq } = await supabase
        .from("service_requests")
        .select("created_at")
        .eq("mechanic_id", mechanicId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

    return {
        ...stats,
        avgRating,
        reviewCount: reviews?.length || 0,
        lastActivity: lastReq?.created_at || null
    }
}
