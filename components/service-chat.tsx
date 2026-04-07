'use client';

import { useState, useEffect, useRef } from 'react';
import { MaterialIcon } from './material-icon';
import { getMessages, sendChatMessage, updateServiceRequestStatus, sendServiceQuote, respondToQuote, submitReview, uploadChatImage, getSignedUrls } from '@/lib/actions';
import type { ChatMessage, ServiceRequest } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

interface ServiceChatProps {
    requestId: string;
    recipientName: string;
    recipientAvatarUrl?: string | null;
    currentUserEmail: string;
    currentUserRole: 'admin' | 'customer' | 'mechanic';
    onClose: () => void;
}

export function ServiceChat({ requestId, recipientName, recipientAvatarUrl, currentUserEmail, currentUserRole, onClose }: ServiceChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [status, setStatus] = useState<ServiceRequest['status']>('pending');
    const [pendingStatus, setPendingStatus] = useState<ServiceRequest['status'] | null>(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [requestData, setRequestData] = useState<ServiceRequest | null>(null);
    const [quoteAmount, setQuoteAmount] = useState('');
    const [quoteDescription, setQuoteDescription] = useState('');
    const [isSendingQuote, setIsSendingQuote] = useState(false);
    const [showQuoteForm, setShowQuoteForm] = useState(false);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [isRespondingToQuote, setIsRespondingToQuote] = useState(false);
    const [isSendingMessage, setIsSendingMessage] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    const [notificationAudio, setNotificationAudio] = useState<HTMLAudioElement | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
        setNotificationAudio(audio);
    }, []);

    useEffect(() => {
        loadMessages();
        loadRequestData();

        // Subscribe to messages
        const messageChannel = supabase
            .channel(`chat:${requestId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'service_request_messages',
                    filter: `request_id=eq.${requestId}`
                },
                (payload) => {
                    const newMsg = payload.new as ChatMessage;
                    setMessages((prev) => [...prev, newMsg]);

                    // Play sound if not from current user
                    if (newMsg.sender_email !== currentUserEmail) {
                        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
                        audio.play().catch(e => console.log('Sound blocked'));
                    }
                }
            )
            .subscribe();

        // Subscribe to status updates
        const statusChannel = supabase
            .channel(`status:${requestId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'service_requests',
                    filter: `id=eq.${requestId}`
                },
                (payload) => {
                    const newData = payload.new as ServiceRequest;
                    setRequestData(newData);
                    setStatus(newData.status);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(messageChannel);
            supabase.removeChannel(statusChannel);
        };
    }, [requestId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    async function loadMessages() {
        setIsLoading(true);
        const data = await getMessages(requestId);
        setMessages(data as ChatMessage[]);
        setIsLoading(false);
    }

    async function loadRequestData() {
        const { data } = await supabase.from('service_requests').select('*').eq('id', requestId).single();
        if (data) {
            setRequestData(data as ServiceRequest);
            setStatus(data.status as ServiceRequest['status']);
        }
    }

    useEffect(() => {
        const fetchSignedUrls = async () => {
            const pathsToFetch = messages
                .filter(m => m.image_url && !m.storage_purged && !signedUrls[m.image_url])
                .map(m => m.image_url as string);
            
            if (pathsToFetch.length > 0) {
                const results = await getSignedUrls(pathsToFetch);
                if (results.length > 0) {
                    setSignedUrls(prev => {
                        const next = { ...prev };
                        results.forEach(res => {
                            if (res.signedUrl && res.path) next[res.path] = res.signedUrl;
                        });
                        return next;
                    });
                }
            }
        };

        fetchSignedUrls();
    }, [messages]);

    const handleStatusUpdate = async (newStatus: ServiceRequest['status']) => {
        setPendingStatus(newStatus);
        setIsUpdatingStatus(true);
        const result = await updateServiceRequestStatus(requestId, newStatus);
        if (result.success) {
            setStatus(newStatus); // Update local state immediately
            await sendChatMessage(requestId, `Status updated to: ${newStatus.replace(/_/g, ' ')}`, 'admin', 'system@tarafix.com');
        } else {
            alert(result.error);
        }
        setIsUpdatingStatus(false);
        setPendingStatus(null);
    };

    const handleSendQuote = async () => {
        if (!quoteAmount || isNaN(Number(quoteAmount))) {
            alert("Please enter a valid amount.");
            return;
        }
        setIsSendingQuote(true);
        const result = await sendServiceQuote(requestId, Number(quoteAmount), quoteDescription);
        if (result.success) {
            await sendChatMessage(requestId, `Price Estimate Sent: ₱${quoteAmount}`, 'admin', 'system@tarafix.com');
            setShowQuoteForm(false);
            setQuoteAmount('');
            setQuoteDescription('');
            await loadRequestData();
        } else {
            alert(result.error);
        }
        setIsSendingQuote(false);
    };

    const handleQuoteResponse = async (response: 'accepted' | 'rejected') => {
        setIsRespondingToQuote(true);
        const result = await respondToQuote(requestId, response);
        if (result.success) {
            await sendChatMessage(requestId, `Quote ${response === 'accepted' ? 'Accepted' : 'Rejected'}`, 'admin', 'system@tarafix.com');
            await loadRequestData();
        } else {
            alert(result.error);
        }
        setIsRespondingToQuote(false);
    };

    const handleReviewSubmit = async () => {
        if (rating === 0) {
            alert("Please select a rating.");
            return;
        }
        if (!requestData) return;

        setIsSubmittingReview(true);
        const result = await submitReview({
            requestId,
            mechanicId: requestData.mechanic_id,
            customerName: requestData.customer_name,
            customerAvatarUrl: requestData.customer_avatar_url,
            rating,
            comment
        });

        if (result.success) {
            await sendChatMessage(requestId, `Customer left a ${rating}-star review!`, 'admin', 'system@tarafix.com');
            await loadRequestData();
        } else {
            alert(result.error);
        }
        setIsSubmittingReview(false);
    };

    const getStatusStep = (currentStatus: string) => {
        const steps = ['pending', 'accepted', 'on_my_way', 'arrived', 'in_progress', 'completed'];
        return steps.indexOf(currentStatus);
    };

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if ((!newMessage.trim() && !selectedImage) || isSendingMessage || isUploadingImage) return;

        const content = newMessage;
        const imageFile = selectedImage;
        
        setIsSendingMessage(true);
        setNewMessage('');
        setSelectedImage(null);
        setImagePreview(null);

        let imageUrl = null;
        if (imageFile) {
            setIsUploadingImage(true);
            const uploadResult = await uploadChatImage(requestId, imageFile, imageFile.name);
            if (uploadResult.success) {
                imageUrl = uploadResult.path;
            } else {
                alert(uploadResult.error);
                setIsUploadingImage(false);
                setIsSendingMessage(false);
                return;
            }
            setIsUploadingImage(false);
        }

        const result = await sendChatMessage(requestId, content, currentUserRole, currentUserEmail, imageUrl);
        if (!result.success) {
            alert(result.error);
        }
        setIsSendingMessage(false);
    }

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // basic validation
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            alert("Only JPG, PNG and WebP images are allowed.");
            return;
        }

        // Limit to 5MB original size
        if (file.size > 5 * 1024 * 1024) {
            alert("File is too large. Max 5MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                // Client-side compression using canvas
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Max dimensions 1200px
                const MAX_DIM = 1200;
                if (width > height) {
                    if (width > MAX_DIM) {
                        height *= MAX_DIM / width;
                        width = MAX_DIM;
                    }
                } else {
                    if (height > MAX_DIM) {
                        width *= MAX_DIM / height;
                        height = MAX_DIM;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
                            type: 'image/webp',
                            lastModified: Date.now(),
                        });
                        setSelectedImage(compressedFile);
                        setImagePreview(URL.createObjectURL(blob));
                    }
                }, 'image/webp', 0.8); // 0.8 quality
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const getImageUrl = (path: string) => {
        return signedUrls[path] || null;
    };

    return (
        <div className="fixed inset-0 z-[3000] flex items-end sm:items-center justify-center p-4 sm:p-6 bg-midnight/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-slate-deep w-full max-w-lg h-[80vh] sm:h-[600px] flex flex-col rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
                {/* Header */}
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-turbo-orange/20 rounded-full flex items-center justify-center text-turbo-orange border border-turbo-orange/30 overflow-hidden">
                            {recipientAvatarUrl ? (
                                <img src={recipientAvatarUrl} alt={recipientName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                                <MaterialIcon name={currentUserRole === 'admin' ? "person" : currentUserRole === 'mechanic' ? "person" : "engineering"} />
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <h3 className="text-sm font-black text-foreground uppercase tracking-tight">{recipientName}</h3>
                                <div className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border ${
                                    status === 'completed' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                    status === 'cancelled' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                    status === 'pending' ? 'bg-white/10 text-white/40 border-white/10' :
                                    'bg-turbo-orange/10 text-turbo-orange border-turbo-orange/20 animate-pulse'
                                }`}>
                                    {status.replace(/_/g, ' ')}
                                </div>
                            </div>
                            <p className="text-[10px] font-black text-turbo-orange uppercase tracking-widest">
                                {currentUserRole === 'admin' ? 'Customer Message' : currentUserRole === 'customer' ? 'Mechanic Message' : 'Customer Message'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-white/5 transition-all"
                    >
                        <MaterialIcon name="close" />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-midnight/30">
                    {isLoading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-turbo-orange border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30">
                            <MaterialIcon name="chat" className="text-4xl mb-3" />
                            <p className="text-xs font-bold uppercase tracking-widest leading-relaxed"> No messages yet.<br />Start the conversation!</p>
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const isMe = msg.sender_role === currentUserRole || msg.sender_email === currentUserEmail;
                            return (
                                <div
                                    key={msg.id}
                                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                                >
                                    <div
                                        className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${isMe
                                            ? 'bg-turbo-orange text-midnight font-bold rounded-tr-none shadow-lg shadow-turbo-orange/10'
                                            : 'bg-white/10 text-foreground rounded-tl-none border border-white/5'
                                            }`}
                                    >
                                        {msg.image_url && !msg.storage_purged && (
                                            <div className="mb-2 rounded-xl overflow-hidden border border-white/10 bg-midnight/20 min-h-[150px] min-w-[200px] flex items-center justify-center relative group">
                                                {getImageUrl(msg.image_url) ? (
                                                    <img 
                                                        src={getImageUrl(msg.image_url)!} 
                                                        alt="Attachment" 
                                                        className="w-full h-auto max-h-80 object-cover cursor-pointer hover:scale-105 transition-transform duration-500"
                                                        onClick={() => window.open(getImageUrl(msg.image_url!)!, '_blank')}
                                                    />
                                                ) : (
                                                    <div className="flex flex-col items-center gap-2 opacity-20">
                                                        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                        <span className="text-[8px] font-black uppercase tracking-widest">Loading Photo...</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {msg.storage_purged && msg.image_url && (
                                            <div className="mb-2 p-3 bg-white/5 rounded-xl border border-white/5 text-[9px] font-black uppercase text-center opacity-40 italic">
                                                Image Expired (Job Completed)
                                            </div>
                                        )}
                                        {msg.content}
                                    </div>
                                    <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mt-1.5 px-1">
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Phase 3: Job Order / Receipt Card (When status is completed) */}
                {status === 'completed' && requestData?.quote_amount && (
                    <div className="mx-6 mb-4 p-5 bg-green-500 text-midnight rounded-2xl flex flex-col gap-3 relative overflow-hidden shadow-2xl shadow-green-500/20 animate-in zoom-in-95 duration-500">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 blur-3xl rounded-full -mr-16 -mt-16" />
                        <div className="flex items-center justify-between relative z-10 border-b border-midnight/10 pb-2">
                             <div className="flex items-center gap-2">
                                <MaterialIcon name="receipt_long" className="text-lg" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Job Order Summary</span>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest bg-midnight/10 px-2 py-0.5 rounded">Paid</span>
                        </div>
                        <div className="relative z-10">
                            <h4 className="text-xs font-black uppercase tracking-widest text-midnight/60 mb-1">Total Agreed Price</h4>
                            <p className="text-4xl font-black italic tracking-tighter leading-none">₱{requestData.quote_amount.toLocaleString()}</p>
                            <div className="mt-4 flex flex-col gap-1">
                                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest opacity-60">
                                    <span>Work Type</span>
                                    <span>{requestData.service_type || 'General Repair'}</span>
                                </div>
                                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest opacity-60">
                                    <span>Completed At</span>
                                    <span>{new Date().toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Phase 2: Quote Card (Hide when completed) */}
                {requestData?.quote_amount && status !== 'completed' && (
                    <div className="mx-6 mb-4 p-4 bg-white/5 border border-turbo-orange/20 rounded-2xl flex flex-col gap-3 relative overflow-hidden group animate-in slide-in-from-bottom-4 duration-300">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-turbo-orange/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-turbo-orange/10 transition-colors" />
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-2">
                                <MaterialIcon name="payments" className="text-turbo-orange text-sm" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-turbo-orange">Official Price Estimate</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                {requestData.quote_status === 'accepted' ? (
                                    <div className="flex items-center gap-1 bg-green-500/10 text-green-500 text-[8px] font-black px-2 py-0.5 rounded border border-green-500/20 uppercase tracking-widest">
                                        <MaterialIcon name="verified" className="text-[10px]" />
                                        Approved
                                    </div>
                                ) : requestData.quote_status === 'rejected' ? (
                                    <div className="bg-red-500/10 text-red-500 text-[8px] font-black px-2 py-0.5 rounded border border-red-500/20 uppercase tracking-widest">
                                        Declined
                                    </div>
                                ) : (
                                    <div className="bg-turbo-orange/10 text-turbo-orange text-[8px] font-black px-2 py-0.5 rounded border border-turbo-orange/20 uppercase tracking-widest animate-pulse">
                                        Pending Approval
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="relative z-10 flex items-end justify-between">
                            <div>
                                <p className="text-3xl font-black text-foreground italic tracking-tighter leading-none">₱{requestData.quote_amount.toLocaleString()}</p>
                                {requestData.quote_description && (
                                    <p className="text-[10px] text-muted-foreground mt-1 font-medium">{requestData.quote_description}</p>
                                )}
                            </div>
                        </div>

                        {currentUserRole === 'customer' && requestData.quote_status === 'pending' && (
                            <div className="flex gap-2 relative z-10 mt-1">
                                <button 
                                    onClick={() => handleQuoteResponse('accepted')}
                                    disabled={isRespondingToQuote}
                                    className="flex-1 bg-green-500 text-midnight text-[10px] font-black uppercase tracking-widest py-3 rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-green-500/10 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isRespondingToQuote ? (
                                        <div className="w-3 h-3 border-2 border-midnight border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <MaterialIcon name="check" className="text-sm" />
                                    )}
                                    {isRespondingToQuote ? 'Accepting...' : 'Accept Quote'}
                                </button>
                                <button 
                                    onClick={() => handleQuoteResponse('rejected')}
                                    disabled={isRespondingToQuote}
                                    className="bg-white/5 text-red-500 text-[10px] font-black uppercase tracking-widest px-5 py-3 rounded-xl hover:bg-red-500/10 active:scale-95 transition-all border border-white/5 disabled:opacity-50"
                                >
                                    {isRespondingToQuote ? '...' : 'Decline'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Status Timeline / Mechanic Controls */}
                {currentUserRole === 'mechanic' && status !== 'completed' && status !== 'cancelled' && (
                    <div className="px-4 py-3 bg-white/5 border-b border-white/5 flex flex-col gap-2">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Control Panel</p>
                        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                            {status === 'pending' && (
                                <button
                                    type="button"
                                    onClick={() => handleStatusUpdate('accepted')}
                                    disabled={isUpdatingStatus}
                                    className="whitespace-nowrap bg-blue-500 text-midnight px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-400 transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {pendingStatus === 'accepted' ? (
                                        <div className="w-3 h-3 border-2 border-midnight border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <MaterialIcon name="check_circle" className="text-sm" />
                                    )}
                                    {pendingStatus === 'accepted' ? 'Accepting...' : 'Accept Request'}
                                </button>
                            )}
                            
                            {/* Send Quote Button */}
                            {currentUserRole === 'mechanic' && (status as string) !== 'completed' && (status as string) !== 'cancelled' && (
                                <button
                                    type="button"
                                    onClick={() => setShowQuoteForm(true)}
                                    className="whitespace-nowrap bg-white/10 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all flex items-center gap-2 border border-white/10"
                                >
                                    <MaterialIcon name="request_quote" className="text-sm text-turbo-orange" />
                                    {requestData?.quote_amount ? 'Update Estimate' : 'Send Estimate'}
                                </button>
                            )}

                            {status === 'accepted' && (
                                <button
                                    type="button"
                                    onClick={() => handleStatusUpdate('on_my_way')}
                                    disabled={isUpdatingStatus}
                                    className="whitespace-nowrap bg-turbo-orange text-midnight px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {pendingStatus === 'on_my_way' ? (
                                        <div className="w-3 h-3 border-2 border-midnight border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <MaterialIcon name="directions_car" className="text-sm" />
                                    )}
                                    {pendingStatus === 'on_my_way' ? 'Updating...' : 'On My Way'}
                                </button>
                            )}
                            {status === 'on_my_way' && (
                                <button
                                    type="button"
                                    onClick={() => handleStatusUpdate('arrived')}
                                    disabled={isUpdatingStatus}
                                    className="whitespace-nowrap bg-green-500 text-midnight px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {pendingStatus === 'arrived' ? (
                                        <div className="w-3 h-3 border-2 border-midnight border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <MaterialIcon name="location_on" className="text-sm" />
                                    )}
                                    {pendingStatus === 'arrived' ? 'Updating...' : 'I Have Arrived'}
                                </button>
                            )}
                            {status === 'arrived' && (
                                <button
                                    type="button"
                                    onClick={() => handleStatusUpdate('in_progress')}
                                    disabled={isUpdatingStatus}
                                    className="whitespace-nowrap bg-turbo-orange text-midnight px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {pendingStatus === 'in_progress' ? (
                                        <div className="w-3 h-3 border-2 border-midnight border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <MaterialIcon name="engineering" className="text-sm" />
                                    )}
                                    {pendingStatus === 'in_progress' ? 'Updating...' : 'Start Fixing'}
                                </button>
                            )}
                            {status === 'in_progress' && (
                                <button
                                    type="button"
                                    onClick={() => handleStatusUpdate('completed')}
                                    disabled={isUpdatingStatus}
                                    className="whitespace-nowrap bg-green-500 text-midnight px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {pendingStatus === 'completed' ? (
                                        <div className="w-3 h-3 border-2 border-midnight border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <MaterialIcon name="verified" className="text-sm" />
                                    )}
                                    {pendingStatus === 'completed' ? 'Finalizing...' : 'Finish Job'}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    if(confirm('Are you sure you want to cancel this request?')) {
                                        handleStatusUpdate('cancelled');
                                    }
                                }}
                                disabled={isUpdatingStatus}
                                className="whitespace-nowrap bg-red-500/20 text-red-500 border border-red-500/30 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all ml-auto flex items-center justify-center gap-2"
                            >
                                {pendingStatus === 'cancelled' && <div className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />}
                                {pendingStatus === 'cancelled' ? 'Cancelling...' : 'Cancel'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Status Timeline for Customers */}
                {currentUserRole === 'customer' && (status as string) !== 'completed' && (status as string) !== 'cancelled' && (
                    <div className="px-5 py-3 bg-white/5 border-b border-white/5">
                         <div className="flex items-center justify-between gap-1">
                            {['pending', 'accepted', 'on_my_way', 'arrived', 'in_progress', 'completed'].map((step, idx) => {
                                const currentIdx = getStatusStep(status);
                                const isDone = idx <= currentIdx;
                                const isCurrent = idx === currentIdx;
                                
                                return (
                                    <div key={step} className="flex flex-col items-center gap-1.5 flex-1 relative">
                                        <div className={`w-2 h-2 rounded-full z-10 ${
                                            isDone ? 'bg-turbo-orange scale-125' : 'bg-white/10'
                                        } ${isCurrent ? 'animate-pulse ring-4 ring-turbo-orange/20' : ''}`} />
                                        <span className={`text-[6px] font-black uppercase tracking-tighter text-center ${
                                            isDone ? 'text-turbo-orange' : 'text-white/20'
                                        }`}>
                                            {step.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                );
                            })}
                         </div>
                    </div>
                )}

                {/* Input Area */}
                <form onSubmit={handleSubmit} className="p-4 bg-white/5 border-t border-white/5">
                    {imagePreview && (
                        <div className="mb-4 p-2 bg-white/5 rounded-2xl flex items-center gap-3 border border-turbo-orange/20 animate-in slide-in-from-bottom-2">
                            <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/10">
                                <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                                <button 
                                    onClick={() => { setImagePreview(null); setSelectedImage(null); }}
                                    className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-lg"
                                >
                                    <MaterialIcon name="close" className="text-xs" />
                                </button>
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-black text-turbo-orange uppercase tracking-widest">Photo Attached</p>
                                <p className="text-[9px] text-muted-foreground uppercase truncate max-w-[150px]">{selectedImage?.name}</p>
                            </div>
                        </div>
                    )}
                    <div className="relative flex gap-2">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageSelect}
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-14 h-14 bg-white/5 text-turbo-orange rounded-2xl flex items-center justify-center hover:bg-white/10 transition-all border border-white/5"
                        >
                            <MaterialIcon name="add_a_photo" />
                        </button>
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder={imagePreview ? "Add a caption..." : "Type a message..."}
                            className="flex-1 h-14 bg-midnight/50 border border-white/10 rounded-2xl px-6 py-2 text-sm focus:ring-2 focus:ring-turbo-orange outline-none transition-all placeholder:text-muted-foreground/30"
                        />
                        <button
                            type="submit"
                            disabled={(!newMessage.trim() && !selectedImage) || isUploadingImage || isSendingMessage}
                            className="w-14 h-14 bg-turbo-orange text-midnight rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                        >
                            {(isUploadingImage || isSendingMessage) ? (
                                <div className="w-5 h-5 border-2 border-midnight border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <MaterialIcon name="send" />
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Quote Form Modal */}
            {showQuoteForm && (
                <div className="fixed inset-0 z-[4000] flex items-center justify-center p-6 bg-midnight/90 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-slate-deep w-full max-w-sm p-6 rounded-3xl border border-turbo-orange/20 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-turbo-orange/20 rounded-2xl flex items-center justify-center text-turbo-orange">
                                <MaterialIcon name="payments" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-foreground italic uppercase tracking-tight">Price Estimate</h3>
                                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Phase 2: Digital Quote</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-turbo-orange uppercase tracking-[0.2em] mb-2 block">Amount (₱)</label>
                                <input 
                                    type="number"
                                    value={quoteAmount}
                                    onChange={(e) => setQuoteAmount(e.target.value)}
                                    placeholder="e.g. 500"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-lg font-black text-foreground focus:outline-none focus:border-turbo-orange/50 transition-all placeholder:text-white/10"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-turbo-orange uppercase tracking-[0.2em] mb-2 block">Work Description</label>
                                <textarea 
                                    value={quoteDescription}
                                    onChange={(e) => setQuoteDescription(e.target.value)}
                                    placeholder="Explain what the price includes..."
                                    rows={3}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-turbo-orange/50 transition-all resize-none placeholder:text-white/10"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button 
                                onClick={handleSendQuote}
                                disabled={isSendingQuote}
                                className="flex-1 bg-turbo-orange text-midnight font-black py-4 rounded-xl text-xs uppercase tracking-[0.15em] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-turbo-orange/20 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSendingQuote && <div className="w-4 h-4 border-2 border-midnight border-t-transparent rounded-full animate-spin" />}
                                {isSendingQuote ? 'Sending...' : 'Confirm & Send'}
                            </button>
                            <button 
                                onClick={() => setShowQuoteForm(false)}
                                className="px-6 bg-white/5 text-muted-foreground font-black py-4 rounded-xl text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Phase 3: Rating Modal overlay (For customers only) */}
            {currentUserRole === 'customer' && status === 'completed' && !requestData?.is_reviewed && (
                <div className="fixed inset-0 z-[5000] flex items-center justify-center p-6 bg-midnight/95 backdrop-blur-xl animate-in fade-in duration-500 text-center">
                    <div className="bg-slate-deep w-full max-w-sm p-8 rounded-[40px] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-500">
                        <div className="w-20 h-20 bg-turbo-orange/20 rounded-full flex items-center justify-center text-turbo-orange mx-auto mb-6 shadow-inner shadow-turbo-orange/20">
                            <MaterialIcon name="verified" className="text-4xl" />
                        </div>
                        <h2 className="text-2xl font-black text-foreground italic uppercase tracking-tighter leading-tight mb-2">Job Accomplished!</h2>
                        <p className="text-xs text-muted-foreground font-medium mb-8 leading-relaxed">How was your experience with <span className="text-turbo-orange font-black uppercase italic">{recipientName}</span>?</p>
                        
                        {/* Star Rating */}
                        <div className="flex justify-center gap-2 mb-8">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => setRating(star)}
                                    className="focus:outline-none transition-transform active:scale-90"
                                >
                                    <MaterialIcon 
                                        name="star" 
                                        filled={rating >= star}
                                        className={`text-4xl ${rating >= star ? 'text-turbo-orange scale-110 drop-shadow-[0_0_10px_rgba(255,100,0,0.4)]' : 'text-white/10'}`} 
                                    />
                                </button>
                            ))}
                        </div>

                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Share your feedback (optional)..."
                            rows={3}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-foreground focus:outline-none focus:border-turbo-orange/50 transition-all resize-none placeholder:text-white/10 mb-6"
                        />

                        <button
                            onClick={handleReviewSubmit}
                            disabled={isSubmittingReview || rating === 0}
                            className="w-full bg-turbo-orange text-midnight font-black py-4 rounded-2xl text-sm uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-turbo-orange/20 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSubmittingReview && <div className="w-4 h-4 border-2 border-midnight border-t-transparent rounded-full animate-spin" />}
                            {isSubmittingReview ? 'Submitting...' : 'Submit Feedback'}
                        </button>
                        
                        <button 
                            onClick={onClose}
                            className="mt-4 text-[10px] font-black text-white/20 uppercase tracking-[0.2em] hover:text-white transition-all"
                        >
                            Skip for now
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
