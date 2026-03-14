# TaraFix

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=leaflet&logoColor=white)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-000000?style=for-the-badge&logo=shadcnui&logoColor=white)
![Radix UI](https://img.shields.io/badge/Radix_UI-161618?style=for-the-badge&logo=radix-ui&logoColor=white)
![Lucide](https://img.shields.io/badge/Lucide-FDE047?style=for-the-badge&logo=lucide&logoColor=black)
![Zod](https://img.shields.io/badge/Zod-3068B7?style=for-the-badge&logo=zod&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![PNPM](https://img.shields.io/badge/pnpm-%234a4a4a.svg?style=for-the-badge&logo=pnpm&logoColor=f69220)

</div>

**TaraFix** is a premier hyperlocal ecosystem designed to revolutionize how vehicle owners in the Philippines maintain their transport. More than just a directory, TaraFix is a comprehensive bridge connecting motorists with a vetted network of automotive professionals—from expert mechanics and vulcanizing shops to specialized oil change centers and car washes.

Built to address the lack of reliable, real-time service information, TaraFix empowers users to find immediate help while providing shop owners a digital platform to grow their business through a verified, trust-based system.

## The TaraFix Mission

To provide every Filipino vehicle owner with the peace of mind that expert automotive help is always just a tap away, while professionalizing the local auto-service industry through digital verification and quality standards.

## Key Features

- **Intelligent Hyperlocal Map**: High-precision geolocation (via Leaflet & OpenStreetMap) that displays the nearest available shops based on your live coordinates.
- **Verified Professional Network**: Every shop undergoes a manual verification process to ensure business legitimacy, accurate location data, and service quality.
- **Shop Growth Platform**: "Join Network" feature allows brick-and-mortar shop owners to digitize their business, reach local customers, and manage their service requests.
- **Real-time Service Discovery**: Instant filtering by service category (Engine, Brakes, Tires, Electrical, Detailing) to find the exact specialist you need.
- **Secure Admin Ecosystem**: A robust back-office for administrators to review business applications, manage shop listings, and maintain system integrity.
- **Premium Turbo UI**: A state-of-the-art, glassmorphic dark interface optimized for high-speed performance and mobile-first accessibility.
- **Direct Privacy-First Communication**: Integrated messaging and booking systems designed to respect user privacy while facilitating seamless service coordination.

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Library**: [React 19](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL + RLS)
- **Maps**: [React Leaflet](https://react-leaflet.js.org/) & [Leaflet](https://leafletjs.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/), [Radix UI](https://www.radix-ui.com/), [Lucide React](https://lucide.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Forms & Validation**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)
- **Deployment**: [Vercel](https://vercel.com/)
- **Package Manager**: [PNPM](https://pnpm.io/)

## Getting Started

### Prerequisites

*   Node.js 18+
*   npm or pnpm
*   A Supabase project

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/JavierSiliacay/TaraFix.git
    cd TaraFix
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Setup:**
    Create a `.env.local` file in the root directory:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
    ```

4.  **Database Setup:**
    Run the SQL scripts located in `scripts/` in your Supabase SQL Editor:
    *   `scripts/001_create_schema.sql`: Sets up the main tables.
    *   `scripts/002_add_join_network.sql`: Adds the shop request system and RLS policies.

5.  **Run the development server:**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) to view the app.

## Admin Access

The `/admin` dashboard is restricted to authorized personnel only. To access:
1.  Navigate to `/login`.
2.  Sign in with an authorized email address.
3.  You will be redirected to the Admin Queue to manage shop requests.

## License

This project is proprietary and developed for TaraFix.
