'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ChatMessage } from '@/lib/types';

interface NotificationContextType {
    unreadCounts: Record<string, number>;
    clearUnreadCount: (requestId: string) => void;
    setActiveChatId: (id: string | null) => void;
    subscribeToPush: () => Promise<boolean>;
    isPushSupported: boolean;
    totalUnread: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [isPushSupported, setIsPushSupported] = useState(false);
    const activeChatIdRef = useRef<string | null>(null);
    const userEmailRef = useRef<string | null>(null);
    const myRequestIdsRef = useRef<Set<string>>(new Set());
    const mechanicProfileRef = useRef<any>(null);
    const lastAudioPlayRef = useRef<number>(0);
    const processedMessageIdsRef = useRef<Set<string>>(new Set());
    const supabase = createClient();

    const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BEx6mp-8rKcS0L08Ca7epwKz3TTPGFvqbelrnYLdM-HhjoPUM-7Z-0Gi9Pcg8Zig5f_Prj5q3DKGYS4Fnxqfu3g";

    // Sum of all unread counts
    const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

    const urlBase64ToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    };

    useEffect(() => {
        setIsPushSupported('serviceWorker' in navigator && 'PushManager' in window);
        
        let globalChannel: any = null;

    const setupSubscription = (email: string) => {
        if (globalChannel) {
            supabase.removeChannel(globalChannel);
        }

        // Use a UNIQUE channel name per user to prevent crosstalk
        globalChannel = supabase
            .channel(`notifications:${email.replace(/[^a-zA-Z0-9]/g, '_')}`)
            // 1. Listen for MY NEW Service Requests (to update our watchlist)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'service_requests'
                },
                (payload) => {
                    const newReq = payload.new as any;
                    if (newReq.customer_email === userEmailRef.current || newReq.mechanic_id === mechanicProfileRef?.current?.id) {
                        myRequestIdsRef.current.add(newReq.id);
                    }
                }
            )
            // 2. Listen for messages
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'service_request_messages'
                },
                (payload) => {
                    const newMsg = payload.new as ChatMessage;
                    
                    // Prevention: don't process same message twice if realtime double-fires
                    if (processedMessageIdsRef.current.has(newMsg.id)) return;
                    processedMessageIdsRef.current.add(newMsg.id);

                    // ONLY trigger if the message belongs to ONE OF MY REQUESTS
                    // and I am NOT the sender, and it's not the active chat
                    const isForMe = myRequestIdsRef.current.has(newMsg.request_id);
                    const isNotFromMe = newMsg.sender_email !== userEmailRef.current;
                    const isNotActive = activeChatIdRef.current !== newMsg.request_id;

                    if (isForMe && isNotFromMe && isNotActive) {
                        setUnreadCounts(prev => ({
                            ...prev,
                            [newMsg.request_id]: (prev[newMsg.request_id] || 0) + 1
                        }));
                        
                        // Audio Debouncing: Don't spam the user with sounds if 7 messages arrive at once
                        const now = Date.now();
                        if (now - lastAudioPlayRef.current > 1500) {
                            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
                            audio.play().catch(() => {});
                            lastAudioPlayRef.current = now;
                        }
                    }
                }
            )
            .subscribe();
    };

    const init = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Sanity Flush: Clear previous user data if switching accounts in a SPA
        myRequestIdsRef.current = new Set();
        processedMessageIdsRef.current = new Set();
        setUnreadCounts({});

        if (user?.email) {
            userEmailRef.current = user.email;
            setUserEmail(user.email);
            
            // 1. Get Mechanic ID if it exists
            const { data: mechanic } = await supabase
                .from('mechanics')
                .select('id')
                .eq('email', user.email)
                .maybeSingle();

            if (mechanic) mechanicProfileRef.current = mechanic;

            // 2. Fetch our request IDs initially
            const { data: custRequests } = await supabase
                .from('service_requests')
                .select('id')
                .eq('customer_email', user.email);
            
            let allIds = (custRequests || []).map(r => r.id);

            if (mechanic) {
                const { data: mechRequests } = await supabase
                    .from('service_requests')
                    .select('id')
                    .eq('mechanic_id', mechanic.id);
                
                if (mechRequests) {
                    allIds = [...allIds, ...mechRequests.map(r => r.id)];
                }
            }

            myRequestIdsRef.current = new Set(allIds);
            setupSubscription(user.email);
        }
    };

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            const email = session?.user?.email || null;
            userEmailRef.current = email;
            setUserEmail(email);

            if (email) {
                setupSubscription(email);
            } else {
                if (globalChannel) {
                    supabase.removeChannel(globalChannel);
                    globalChannel = null;
                }
                setUnreadCounts({});
            }
        });

        init();
        
        return () => {
            subscription.unsubscribe();
            if (globalChannel) supabase.removeChannel(globalChannel);
        };
    }, [supabase]);

    const clearUnreadCount = (requestId: string) => {
        setUnreadCounts(prev => {
            if (!prev[requestId]) return prev;
            const next = { ...prev };
            delete next[requestId];
            return next;
        });
    };

    const setActiveChatId = (id: string | null) => {
        activeChatIdRef.current = id;
        if (id) clearUnreadCount(id);
    };

    const subscribeToPush = async () => {
        if (!isPushSupported || !userEmail) return false;

        try {
            // Wait for the PWA service worker to be ready
            const registration = await navigator.serviceWorker.ready;
            
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });

            // Save to Supabase
            const { error } = await supabase
                .from('push_subscriptions')
                .upsert({
                    user_email: userEmail,
                    subscription: subscription.toJSON()
                }, { onConflict: 'user_email,subscription' });

            if (error) throw error;
            return true;
        } catch (err) {
            console.error('Push registration failed:', err);
            return false;
        }
    };

    return (
        <NotificationContext.Provider value={{ unreadCounts, clearUnreadCount, setActiveChatId, subscribeToPush, isPushSupported, totalUnread }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
}
