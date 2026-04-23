'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { MaterialIcon } from '@/components/material-icon';
import { BottomNav } from '@/components/bottom-nav';
import { AppHeader } from '@/components/app-header';
import { 
    getUsersServiceRequests, 
    getMechanicByEmail, 
    getMechanicServiceRequests,
    updateMechanicStatus, 
    updateMechanicProfile,
    deleteServiceRequest
} from '@/lib/actions';
import { ServiceChat } from '@/components/service-chat';
import { useNotifications } from '@/lib/notification-context';
import type { Mechanic } from '@/lib/types';
import { SERVICE_TYPES } from '@/lib/types';
import { PWAInstallButton } from '@/components/pwa-install-button';


export default function ProfilePage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState<any[]>([]);
    const [mechanicProfile, setMechanicProfile] = useState<Mechanic | null>(null);
    const [activeChat, setActiveChat] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState<'activity' | 'tools'>('activity');
    
    // Mechanic Dashboard State
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<Partial<Mechanic>>({});
    const [isTogglingAvailability, setIsTogglingAvailability] = useState(false);
    const [isDeletingRequest, setIsDeletingRequest] = useState<string | null>(null);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const { unreadCounts, clearUnreadCount, setActiveChatId, subscribeToPush, isPushSupported } = useNotifications();
    const [notificationAudio, setNotificationAudio] = useState<HTMLAudioElement | null>(null);
    const [pushLoading, setPushLoading] = useState(false);
    const [pushStatus, setPushStatus] = useState<'default' | 'granted' | 'denied'>(
        typeof Notification !== 'undefined' ? Notification.permission : 'default'
    );
    const activeChatRef = useRef<any>(null);

    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
        setNotificationAudio(audio);

        const init = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push('/login');
                    return;
                }
                setUser(user);

                const [userRequests, mechanic] = await Promise.all([
                    getUsersServiceRequests(user.email!),
                    getMechanicByEmail(user.email!)
                ]);
                
                let combinedRequests = [...userRequests];
                if (mechanic) {
                    const mechanicRequests = await getMechanicServiceRequests(mechanic.id);
                    const existingIds = new Set(combinedRequests.map(r => r.id));
                    mechanicRequests.forEach(r => {
                        if (!existingIds.has(r.id)) {
                            combinedRequests.push(r);
                        }
                    });
                    
                    setMechanicProfile(mechanic);
                    setEditData({
                        name: mechanic.name,
                        bio: mechanic.bio || '',
                        specializations: mechanic.specializations || [],
                        phone: mechanic.phone || ''
                    });
                }
                
                setRequests(combinedRequests.sort((a, b) => 
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                ));

            } catch (error) {
                console.error("Profile load error:", error);
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [router, supabase]);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        await supabase.auth.signOut();
        router.push('/');
        router.refresh();
        setIsLoggingOut(false);
    };

    const toggleAvailability = async () => {
        if (!mechanicProfile || isTogglingAvailability) return;
        setIsTogglingAvailability(true);
        const newStatus = !mechanicProfile.is_available;
        const result = await updateMechanicStatus(mechanicProfile.id, newStatus);
        if (result.success) {
            setMechanicProfile({ ...mechanicProfile, is_available: newStatus });
            router.refresh(); 
        } else {
            alert(result.error);
        }
        setIsTogglingAvailability(false);
    };

    const handleSaveProfile = async () => {
        if (!mechanicProfile) return;
        setSaving(true);
        const result = await updateMechanicProfile(mechanicProfile.email, editData);
        if (result.success) {
            setMechanicProfile({ ...mechanicProfile, ...editData } as Mechanic);
            setIsEditing(false);
        }
        setSaving(false);
    };

    const handleDeleteRequest = async (requestId: string) => {
        if (isDeletingRequest) return;
        if (confirm('Are you sure to remove this?')) {
            setIsDeletingRequest(requestId);
            const result = await deleteServiceRequest(requestId);
            if (result.success) {
                setRequests(prev => prev.filter(r => r.id !== requestId));
            } else {
                alert(result.error);
            }
            setIsDeletingRequest(null);
        }
    };

    const toggleSpec = (spec: string) => {
        const current = editData.specializations || [];
        const next = current.includes(spec) 
            ? current.filter(s => s !== spec)
            : [...current, spec];
        setEditData({ ...editData, specializations: next });
    };

    const handleEnablePush = async () => {
        setPushLoading(true);
        const success = await subscribeToPush();
        if (success) {
            setPushStatus('granted');
        }
        setPushLoading(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-midnight flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-turbo-orange border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-midnight pb-24">
            <AppHeader title="My Profile" />

            <main className="max-w-lg mx-auto px-6 pt-8">
                {/* Profile Overview Card */}
                <div className="glass-card rounded-3xl p-8 border-white/10 relative overflow-hidden mb-8 shadow-2xl animate-in fade-in zoom-in duration-500">
                    <div className="absolute inset-0 bg-gradient-to-br from-turbo-orange/5 via-transparent to-electric-blue/5 pointer-events-none" />
                    <div className="absolute top-0 right-0 w-48 h-48 bg-turbo-orange/10 blur-[80px] -mr-24 -mt-24 rounded-full opacity-50" />

                    <div className="flex flex-col items-center text-center relative z-10">
                        <div className="relative mb-6">
                            <div className="w-28 h-28 bg-midnight rounded-3xl flex items-center justify-center border-2 border-white/10 shadow-2xl overflow-hidden group">
                                {(mechanicProfile?.image_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture) ? (
                                    <img 
                                        src={mechanicProfile?.image_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture} 
                                        alt="Profile" 
                                        className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500" 
                                        referrerPolicy="no-referrer"
                                    />
                                ) : (
                                    <MaterialIcon name="person" className="text-6xl text-white/10" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-midnight/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-turbo-orange rounded-2xl flex items-center justify-center text-midnight shadow-lg border-4 border-midnight">
                                <MaterialIcon name="edit" className="text-lg" />
                            </div>
                        </div>

                        <h2 className="text-2xl font-black text-white italic tracking-tighter mb-1">
                            {mechanicProfile?.name || user?.email?.split('@')[0] || 'User'}
                        </h2>
                        <div className="flex flex-col items-center gap-2">
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em]">
                                {user?.email}
                            </p>
                            {mechanicProfile?.is_verified && (
                                <span className="bg-green-500/10 text-green-500 text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border border-green-500/20 flex items-center gap-1.5 mt-2">
                                    <MaterialIcon name="verified" className="text-[10px] text-electric-blue" />
                                    Verified Technician
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Direct Notification Alert Card */}
                {isPushSupported && pushStatus !== 'granted' && (
                    <div className="glass-card rounded-3xl p-6 border-electric-blue/30 bg-electric-blue/5 mb-8 relative overflow-hidden group shadow-2xl animate-in slide-in-from-bottom-4 duration-700">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <MaterialIcon name="notifications_active" className="text-5xl text-electric-blue" />
                        </div>
                        <div className="relative z-10">
                            <h4 className="text-electric-blue text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-electric-blue animate-pulse" />
                                Instant Fix Alerts
                            </h4>
                            <p className="text-[11px] text-white/60 mb-5 leading-relaxed font-bold">
                                Get notified immediately when mechanics message you or when an SOS is nearby. High-priority push notifications.
                            </p>
                            <button
                                onClick={handleEnablePush}
                                disabled={pushLoading}
                                className="h-12 bg-electric-blue text-midnight rounded-xl px-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-electric-blue/20 disabled:opacity-50"
                            >
                                {pushLoading ? (
                                    <div className="w-4 h-4 border-2 border-midnight border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <MaterialIcon name="notifications" className="text-sm" />
                                        Enable Push Alerts
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Tab Navigation if Mechanic */}
                {mechanicProfile && (
                    <div className="flex p-2 bg-white/5 rounded-[2rem] mb-10 border border-white/5 shadow-inner">
                        <button 
                            onClick={() => setActiveTab('activity')}
                            className={`flex-1 h-14 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${activeTab === 'activity' ? 'bg-white shadow-xl text-midnight scale-[1.02]' : 'text-white/40 hover:text-white'}`}
                        >
                            <MaterialIcon name="history" className="text-lg" />
                            My Activity
                        </button>
                        <button 
                            onClick={() => setActiveTab('tools')}
                            className={`flex-1 h-14 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${activeTab === 'tools' ? 'bg-turbo-orange text-midnight shadow-lg shadow-turbo-orange/40 scale-[1.02]' : 'text-white/40 hover:text-white'}`}
                        >
                            <MaterialIcon name="engineering" className="text-lg" />
                            Mechanic Tools
                        </button>
                    </div>
                )}

                {activeTab === 'activity' ? (
                    <div className="animate-in slide-in-from-left-4 fade-in duration-500">
                        <div className="flex items-center justify-between mb-6 px-1">
                            <h3 className="text-foreground font-bold text-lg tracking-tight uppercase">Service History</h3>
                            <div className="h-px flex-1 bg-white/5 mx-4" />
                            <span className="bg-turbo-orange/10 text-turbo-orange text-[9px] font-black uppercase px-2 py-0.5 rounded border border-turbo-orange/20 tracking-widest">
                                {requests.length} Total
                            </span>
                        </div>

                        {requests.length === 0 ? (
                            <div className="glass-card rounded-2xl p-10 text-center border-dashed border-foreground/10 opacity-50 mb-8">
                                <MaterialIcon name="history" className="text-4xl text-muted-foreground mb-4" />
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-relaxed"> 
                                    No active service requests.<br />Need help? Visit the map!
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4 mb-10">
                                {requests.map((req) => (
                                    <div 
                                        key={req.id} 
                                        className={`glass-card rounded-2xl border-white/5 overflow-hidden transition-all duration-300 ${expandedId === req.id ? 'border-turbo-orange/30 shadow-2xl shadow-turbo-orange/5' : 'hover:border-white/10'}`}
                                    >
                                        <div 
                                            className="p-5 flex items-center gap-4 cursor-pointer relative"
                                            onClick={() => {
                                                setExpandedId(expandedId === req.id ? null : req.id);
                                                // Clear unread count when card is focused/expanded
                                                clearUnreadCount(req.id);
                                            }}
                                        >
                                            {/* Unread Badge */}
                                            {unreadCounts[req.id] > 0 && (
                                                <div className="absolute top-4 left-4 min-w-[20px] h-5 bg-red-500 rounded-full border-2 border-midnight z-20 animate-bounce flex items-center justify-center px-1">
                                                    <span className="text-[10px] font-black text-white leading-none">
                                                        {unreadCounts[req.id] > 99 ? '99+' : unreadCounts[req.id]}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-turbo-orange shrink-0 overflow-hidden border border-white/5">
                                                {mechanicProfile && req.mechanic_id === mechanicProfile.id ? (
                                                    req.customer_avatar_url ? (
                                                        <img src={req.customer_avatar_url} alt="Customer" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                    ) : (
                                                        <MaterialIcon name="person" />
                                                    )
                                                ) : (
                                                    req.mechanic_image_url ? (
                                                        <img src={req.mechanic_image_url} alt="Mechanic" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                    ) : (
                                                        <MaterialIcon name="engineering" />
                                                    )
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <h4 className="text-foreground font-bold text-sm truncate uppercase tracking-tight">
                                                        {mechanicProfile && req.mechanic_id === mechanicProfile.id 
                                                            ? `Request from ${req.customer_name}` 
                                                            : (req.mechanic_name || 'Mechanic Service')}
                                                    </h4>
                                                    <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded border leading-none ${
                                                        req.status === 'completed' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                                        req.status === 'cancelled' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                        req.status === 'pending' ? 'bg-white/10 text-white/40 border-white/10' :
                                                        'bg-turbo-orange/10 text-turbo-orange border-turbo-orange/20'
                                                    }`}>
                                                        {req.status?.replace(/_/g, ' ') || 'pending'}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{req.vehicle_info || 'Unknown Vehicle'}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className={`transition-transform duration-300 ${expandedId === req.id ? 'rotate-180 text-turbo-orange' : 'text-muted-foreground'}`}>
                                                    <MaterialIcon name="expand_more" className="text-xl" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Expanded Details */}
                                        {expandedId === req.id && (
                                            <div className="px-5 pb-6 animate-in slide-in-from-top-2 duration-300">
                                                <div className="pt-4 border-t border-white/5 space-y-4">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-1">
                                                            <label className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Customer Phone</label>
                                                            <p className="text-xs font-bold text-foreground">{req.customer_phone}</p>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Service Preference</label>
                                                            <p className="text-xs font-black text-turbo-orange uppercase italic">{req.service_preference || 'Not Specified'}</p>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Service Needed</label>
                                                            <p className="text-xs font-bold text-foreground">{req.service_type || 'General Checkup'}</p>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Date Submitted</label>
                                                            <p className="text-[10px] font-bold text-foreground">
                                                                {new Date(req.created_at).toLocaleDateString()} at {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                        </div>
                                                        <div className="space-y-1 col-span-2">
                                                            <label className="text-[8px] font-black text-electric-blue uppercase tracking-widest">Scheduled Service Date</label>
                                                            <p className="text-[13px] font-black text-white italic tracking-tight">
                                                                {req.scheduled_date 
                                                                    ? new Date(req.scheduled_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) 
                                                                    : 'AS SOON AS POSSIBLE'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {req.message && (
                                                        <div className="space-y-1 bg-white/5 p-3 rounded-xl">
                                                            <label className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Message from Customer</label>
                                                            <p className="text-xs text-foreground/80 leading-relaxed italic">"{req.message}"</p>
                                                        </div>
                                                    )}

                                                    <div className="flex gap-2 pt-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                clearUnreadCount(req.id);
                                                                setActiveChat(req);
                                                                setActiveChatId(req.id);
                                                            }}
                                                            className="flex-1 h-12 bg-turbo-orange orange-glow text-midnight rounded-xl flex items-center justify-center gap-2 font-black uppercase text-[10px] tracking-widest transition-transform active:scale-95 shadow-lg shadow-turbo-orange/20 relative"
                                                        >
                                                            {unreadCounts[req.id] > 0 && (
                                                                <span className="absolute -top-2 -right-1 flex">
                                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                                    <span className="relative inline-flex rounded-full bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 min-w-[18px] h-[18px] items-center justify-center border border-midnight shadow-lg">
                                                                        {unreadCounts[req.id] > 99 ? '99+' : unreadCounts[req.id]}
                                                                    </span>
                                                                </span>
                                                            )}
                                                            <MaterialIcon name="chat" className="text-sm" />
                                                            Open Chat
                                                        </button>
                                                        
                                                        {mechanicProfile && req.mechanic_id === mechanicProfile.id && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteRequest(req.id);
                                                                }}
                                                                disabled={isDeletingRequest === req.id}
                                                                className="w-12 h-12 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center border border-red-500/20 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                                                            >
                                                                {isDeletingRequest === req.id ? (
                                                                    <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                                                ) : (
                                                                    <MaterialIcon name="delete" className="text-base" />
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="animate-in slide-in-from-right-4 fade-in duration-500 pb-10">
                        {/* Availability Toggle */}
                        <div className={`glass-card rounded-3xl p-6 border transition-all duration-500 mb-8 ${mechanicProfile?.is_available ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${mechanicProfile?.is_available ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                        <MaterialIcon name={mechanicProfile?.is_available ? 'online_prediction' : 'do_not_disturb_on'} className="text-2xl" />
                                    </div>
                                    <div>
                                        <h3 className="text-[10px] font-black text-foreground uppercase tracking-wider">System Status</h3>
                                        <p className={`text-[11px] font-black uppercase tracking-widest ${mechanicProfile?.is_available ? 'text-green-500' : 'text-red-500'}`}>
                                            {mechanicProfile?.is_available ? 'Online' : 'Offline'}
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={toggleAvailability}
                                    disabled={isTogglingAvailability}
                                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-2 ${mechanicProfile?.is_available ? 'bg-green-500 text-midnight hover:bg-green-400' : 'bg-red-500 text-white hover:bg-red-400'}`}
                                >
                                    {isTogglingAvailability && <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                                    {isTogglingAvailability ? 'Updating...' : (mechanicProfile?.is_available ? 'Go Offline' : 'Go Online')}
                                </button>
                            </div>
                        </div>

                        {/* Profile Editor */}
                        <div className="glass-card rounded-3xl p-8 border border-white/5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-electric-blue/10 blur-3xl -mr-16 -mt-16 rounded-full" />
                            
                            <div className="flex justify-between items-start mb-6 relative z-10">
                                <h3 className="text-foreground font-black text-lg tracking-tight uppercase italic underline decoration-electric-blue decoration-2 underline-offset-4">Public Profile</h3>
                                <button 
                                    onClick={() => setIsEditing(!isEditing)}
                                    className="w-10 h-10 glass rounded-xl flex items-center justify-center text-electric-blue border border-electric-blue/20 hover:bg-electric-blue hover:text-midnight transition-all shadow-lg"
                                >
                                    <MaterialIcon name={isEditing ? 'close' : 'edit_square'} className="text-sm" />
                                </button>
                            </div>

                            {!isEditing ? (
                                <div className="space-y-6 relative z-10">
                                    <div>
                                        <label className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-2 block">Display Name</label>
                                        <p className="text-lg font-black text-foreground uppercase italic tracking-tight">{mechanicProfile?.name}</p>
                                    </div>

                                    <div>
                                        <label className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-2 block">Technician Bio</label>
                                        <p className="text-xs text-muted-foreground leading-relaxed">{mechanicProfile?.bio || 'Tells customers why you are the best choice!'}</p>
                                    </div>

                                    <div>
                                        <label className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-3 block text-electric-blue">Expertise Shields</label>
                                        <div className="flex flex-wrap gap-2">
                                            {mechanicProfile?.specializations?.map(spec => (
                                                <span key={spec} className="px-3 py-1.5 bg-midnight-60 border border-white/10 rounded-lg text-[8px] font-black text-foreground uppercase tracking-widest">
                                                    {spec}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Live Rating</label>
                                            <div className="flex items-center gap-1.5 text-turbo-orange font-black text-sm">
                                                <MaterialIcon name="star" className="text-sm" />
                                                {mechanicProfile?.rating.toFixed(1)}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Trust Score</label>
                                            <div className="flex items-center gap-1.5 text-electric-blue font-black text-[10px] uppercase">
                                                <MaterialIcon name="verified_user" className="text-sm" />
                                                Excellent
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-in slide-in-from-bottom-2">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Profile Name</label>
                                        <input 
                                            value={editData.name} 
                                            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                            className="h-12 bg-background/50 border border-foreground/10 rounded-xl px-4 text-sm focus:ring-2 focus:ring-electric-blue outline-none" 
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Technician Bio</label>
                                        <textarea 
                                            value={editData.bio || ''} 
                                            onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                                            className="min-h-[80px] bg-background/50 border border-foreground/10 rounded-xl p-4 text-xs focus:ring-2 focus:ring-electric-blue outline-none resize-none" 
                                            placeholder="Example: 10 years experience in Toyota engines..."
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-3 block">Specializations</label>
                                        <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                                            {SERVICE_TYPES.map(service => (
                                                <button 
                                                    key={service} 
                                                    type="button"
                                                    onClick={() => toggleSpec(service)}
                                                    className={`p-2.5 rounded-xl border text-[8px] font-black uppercase transition-all text-left ${editData.specializations?.includes(service) ? 'bg-electric-blue/10 border-electric-blue text-electric-blue' : 'bg-midnight/40 border-white/5 text-muted-foreground'}`}
                                                >
                                                    {service}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleSaveProfile}
                                        disabled={saving}
                                        className="w-full h-14 bg-electric-blue text-midnight font-black uppercase tracking-widest text-[10px] rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-electric-blue/20"
                                    >
                                        {saving ? (
                                            <div className="w-5 h-5 border-2 border-midnight border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <MaterialIcon name="save" />
                                                Publish Changes
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}


                <div className="flex flex-col gap-4 mt-10">
                    <div className="flex justify-center">
                        <PWAInstallButton />
                    </div>
                    <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="w-full h-14 glass border border-destructive/20 rounded-2xl flex items-center justify-center gap-3 text-destructive font-black uppercase tracking-widest text-[10px] hover:bg-destructive/10 transition-all shadow-lg disabled:opacity-50"
                    >
                        {isLoggingOut ? (
                            <div className="w-4 h-4 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <MaterialIcon name="logout" />
                        )}
                        {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
                    </button>
                </div>
            </main>

            {activeChat && (
                <ServiceChat
                    requestId={activeChat.id}
                    recipientName={mechanicProfile && activeChat.mechanic_id === mechanicProfile.id ? activeChat.customer_name : (activeChat.mechanic_name || 'Mechanic')}
                    recipientAvatarUrl={mechanicProfile && activeChat.mechanic_id === mechanicProfile.id ? activeChat.customer_avatar_url : activeChat.mechanic_image_url}
                    currentUserEmail={user?.email!}
                    currentUserRole={mechanicProfile && activeChat.mechanic_id === mechanicProfile.id ? 'mechanic' : 'customer'}
                    onClose={() => {
                        setActiveChat(null);
                        setActiveChatId(null);
                    }}
                />
            )}

            <BottomNav />
        </div>
    );
}
