# NIRNAYA — Frontend Web Application

The NIRNAYA user interface is built with React 19, Next.js App Router, Tailwind CSS, Radix UI primitives, Lucide icons, and Recharts.

## Directory Structure

```text
frontend/
├── app/                  # Next.js App Router
│   ├── api/              # API route proxies connecting to backend services
│   ├── login/            # Authentication view and session creation
│   ├── dashboard-client.tsx # Main policy intelligence dashboard interface
│   ├── globals.css       # Complete design system, themes, and responsive rules
│   ├── layout.tsx        # Root HTML layout with font and metadata
│   └── page.tsx          # Initial entry route with session guard
├── components/           # UI Component Library
│   └── ui/               # Reusable primitives (Buttons, Dialogs, Sliders, Cards)
├── hooks/                # React custom hooks (e.g. use-mobile)
├── lib/                  # Frontend utilities (e.g. cn className merger)
├── public/               # Static assets, SVG icons, government emblems
└── vendor/               # Compiled UI theme bundles
```

## Running the Frontend
```bash
# Start Next.js development server
pnpm dev

# Build production bundle
pnpm build
```
