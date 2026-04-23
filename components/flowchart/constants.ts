import { Edge, Node } from '@xyflow/react';

export const initialNodes: Node[] = [
  // --- Security & Auth Segment ---
  {
    id: 'auth-start',
    type: 'input',
    data: { label: 'User Entry Point' },
    position: { x: 500, y: 0 },
    className: 'bg-slate-800 text-white border-2 border-primary rounded-full px-6 py-2 shadow-lg',
  },
  {
    id: 'auth-login',
    data: { label: 'Auth Middleware (NextAuth/Supabase)' },
    position: { x: 450, y: 100 },
    className: 'bg-slate-900 text-slate-200 border border-slate-700 rounded-lg px-4 py-3 w-64',
  },
  {
    id: 'auth-decision',
    data: { label: 'Is Authenticated?' },
    position: { x: 500, y: 200 },
    className: 'bg-amber-900/20 text-amber-200 border border-amber-500/50 rounded-lg px-4 py-2 w-48 text-center',
  },
  {
    id: 'auth-login-page',
    data: { label: 'Redirect to Login' },
    position: { x: 300, y: 200 },
    className: 'bg-red-900/20 text-red-200 border border-red-500/50 rounded-md px-4 py-2',
  },
  {
    id: 'auth-role-split',
    data: { label: 'Check User Role' },
    position: { x: 500, y: 300 },
    className: 'bg-emerald-900/20 text-emerald-200 border border-emerald-500/50 rounded-lg px-4 py-2 w-48 text-center',
  },

  // --- Admin Flow (Purple) ---
  {
    id: 'admin-group',
    data: { label: 'ADMIN FLOW' },
    position: { x: -300, y: 400 },
    style: { width: 450, height: 600, backgroundColor: 'rgba(124, 58, 237, 0.05)', border: '1px solid rgba(124, 58, 237, 0.3)', borderRadius: '12px' },
    selectable: false,
    draggable: false,
  },
  {
    id: 'admin-dash',
    data: { label: 'Admin Dashboard' },
    position: { x: -200, y: 450 },
    parentId: 'admin-group',
    className: 'bg-violet-900/40 text-violet-100 border border-violet-500 rounded-md p-2 w-40 text-center',
  },
  {
    id: 'admin-users',
    data: { label: 'Manage Users/Shops' },
    position: { x: -50, y: 550 },
    parentId: 'admin-group',
    className: 'bg-violet-950 text-violet-200 border border-violet-800 rounded-md p-2 w-40 text-center',
  },
  {
    id: 'admin-requests',
    data: { label: 'Approve Service Estimates' },
    position: { x: -200, y: 550 },
    parentId: 'admin-group',
    className: 'bg-violet-950 text-violet-200 border border-violet-800 rounded-md p-2 w-40 text-center',
  },
  {
    id: 'admin-analytics',
    data: { label: 'Platform Analytics' },
    position: { x: -350, y: 550 },
    parentId: 'admin-group',
    className: 'bg-violet-950 text-violet-200 border border-violet-800 rounded-md p-2 w-40 text-center',
  },

  // --- Customer Flow (Blue) ---
  {
    id: 'cust-group',
    data: { label: 'CUSTOMER FLOW' },
    position: { x: 250, y: 400 },
    style: { width: 450, height: 600, backgroundColor: 'rgba(14, 165, 233, 0.05)', border: '1px solid rgba(14, 165, 233, 0.3)', borderRadius: '12px' },
    selectable: false,
    draggable: false,
  },
  {
    id: 'cust-dash',
    data: { label: 'Customer Dashboard' },
    position: { x: 350, y: 450 },
    className: 'bg-sky-900/40 text-sky-100 border border-sky-500 rounded-md p-2 w-40 text-center',
  },
  {
    id: 'cust-book',
    data: { label: 'Book New Service' },
    position: { x: 350, y: 550 },
    className: 'bg-sky-950 text-sky-200 border border-sky-800 rounded-md p-2 w-40 text-center',
  },
  {
    id: 'cust-track',
    data: { label: 'Track Real-time Status' },
    position: { x: 500, y: 650 },
    className: 'bg-sky-950 text-sky-200 border border-sky-800 rounded-md p-2 w-40 text-center',
  },
  {
    id: 'cust-pay',
    data: { label: 'Payment & Invoicing' },
    position: { x: 350, y: 750 },
    className: 'bg-sky-950 text-sky-200 border border-sky-800 rounded-md p-2 w-40 text-center',
  },

  // --- Mechanic Flow (Green) ---
  {
    id: 'mech-group',
    data: { label: 'MECHANIC FLOW' },
    position: { x: 800, y: 400 },
    style: { width: 450, height: 600, backgroundColor: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '12px' },
    selectable: false,
    draggable: false,
  },
  {
    id: 'mech-dash',
    data: { label: 'Mechanic Dashboard' },
    position: { x: 900, y: 450 },
    className: 'bg-emerald-900/40 text-emerald-100 border border-emerald-500 rounded-md p-2 w-40 text-center',
  },
  {
    id: 'mech-jobs',
    data: { label: 'View Queue / Claims' },
    position: { x: 900, y: 550 },
    className: 'bg-emerald-950 text-emerald-200 border border-emerald-800 rounded-md p-2 w-40 text-center',
  },
  {
    id: 'mech-update',
    data: { label: 'Status Update (Supabase)' },
    position: { x: 1050, y: 650 },
    className: 'bg-emerald-950 text-emerald-200 border border-emerald-800 rounded-md p-2 w-40 text-center',
  },

  // --- Database Flow (Bottom) ---
  {
    id: 'db-section',
    data: { label: 'CORE DATABASE (Supabase Real-time)' },
    position: { x: -100, y: 1100 },
    style: { width: 1400, height: 200, backgroundColor: 'rgba(30, 41, 59, 0.5)', border: '2px dashed #475569', borderRadius: '16px' },
    selectable: false,
    draggable: false,
  },
  {
    id: 'db-users',
    data: { label: 'Users Table' },
    position: { x: 100, y: 1150 },
    className: 'bg-slate-800 text-slate-300 border border-slate-600 rounded-lg p-2 w-40 text-center font-mono',
  },
  {
    id: 'db-services',
    data: { label: 'Service_Requests' },
    position: { x: 350, y: 1150 },
    className: 'bg-slate-800 text-slate-300 border border-slate-600 rounded-lg p-2 w-40 text-center font-mono',
  },
  {
    id: 'db-shops',
    data: { label: 'Shops / Mechanics' },
    position: { x: 600, y: 1150 },
    className: 'bg-slate-800 text-slate-300 border border-slate-600 rounded-lg p-2 w-40 text-center font-mono',
  },
  {
    id: 'db-messages',
    data: { label: 'Messages / Notifications' },
    position: { x: 850, y: 1150 },
    className: 'bg-slate-800 text-slate-300 border border-slate-600 rounded-lg p-2 w-40 text-center font-mono',
  },
  {
    id: 'db-wallets',
    data: { label: 'Wallets / Payments' },
    position: { x: 1100, y: 1150 },
    className: 'bg-slate-800 text-slate-300 border border-slate-600 rounded-lg p-2 w-40 text-center font-mono',
  },
];

export const initialEdges: Edge[] = [
  { id: 'e1-2', source: 'auth-start', target: 'auth-login', animated: true },
  { id: 'e2-3', source: 'auth-login', target: 'auth-decision' },
  { id: 'e3-4', source: 'auth-decision', target: 'auth-login-page', label: 'No', labelStyle: { fill: '#f87171' } },
  { id: 'e3-5', source: 'auth-decision', target: 'auth-role-split', label: 'Yes', labelStyle: { fill: '#34d399' } },
  
  // Dashboard routing
  { id: 'e5-admin', source: 'auth-role-split', target: 'admin-dash', label: 'Admin', type: 'smoothstep' },
  { id: 'e5-cust', source: 'auth-role-split', target: 'cust-dash', label: 'Customer', type: 'smoothstep' },
  { id: 'e5-mech', source: 'auth-role-split', target: 'mech-dash', label: 'Mechanic', type: 'smoothstep' },

  // Admin Internals
  { id: 'ea-1', source: 'admin-dash', target: 'admin-users' },
  { id: 'ea-2', source: 'admin-dash', target: 'admin-requests' },
  { id: 'ea-3', source: 'admin-dash', target: 'admin-analytics' },

  // Customer Internals
  { id: 'ec-1', source: 'cust-dash', target: 'cust-book' },
  { id: 'ec-2', source: 'cust-book', target: 'cust-track', animated: true },
  { id: 'ec-3', source: 'cust-track', target: 'cust-pay' },

  // Mechanic Internals
  { id: 'em-1', source: 'mech-dash', target: 'mech-jobs' },
  { id: 'em-2', source: 'mech-jobs', target: 'mech-update', animated: true },

  // Database Connections (Logic)
  { id: 'db-a', source: 'admin-users', target: 'db-users', style: { strokeDasharray: '5,5' } },
  { id: 'db-c', source: 'cust-book', target: 'db-services', style: { strokeDasharray: '5,5' } },
  { id: 'db-m', source: 'mech-update', target: 'db-services', style: { strokeDasharray: '5,5' } },
  { id: 'db-p', source: 'cust-pay', target: 'db-wallets', style: { strokeDasharray: '5,5' } },
];
