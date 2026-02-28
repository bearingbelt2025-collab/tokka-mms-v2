# TOKKA MMS — Maintenance Management System

A mobile-first maintenance management system for Tokka's nail & wire manufacturing plant. Built with Next.js 14, Supabase, and Tailwind CSS.

## Features

- **Machine Registry** — Track all machines with status (running/maintenance due/breakdown), location, photos, and specs
- **Work Orders** — Quick-create in <30 seconds on phone: pick machine, issue type, priority, snap photo
- **Preventive Maintenance** — Recurring schedules per machine with auto-overdue detection
- **Dashboard** — Single-screen view of all key metrics: machine status grid, open WOs, overdue PM, downtime hours
- **Downtime Tracking** — Log when machines go down, live duration counter, automatic status updates
- **Role-Based Access** — Admin (full access) and Technician (assigned work orders, status updates)
- **Real-time Updates** — Live dashboard via Supabase Realtime subscriptions

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Supabase (Postgres, Auth, Realtime, Storage)
- **Deployment**: Vercel

---

## Setup Guide

### 1. Create a Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project
2. Note your **Project URL** and **Anon Key** from: Settings → API

### 2. Run the Database Migration

1. In your Supabase dashboard, go to **SQL Editor** → **New Query**
2. Copy and paste the contents of `supabase/migration.sql`
3. Click **Run** — this creates all tables, indexes, RLS policies, triggers, and enables Realtime

### 3. Create the Storage Bucket

1. In Supabase dashboard, go to **Storage**
2. Click **New Bucket**
3. Name: `photos`, set **Public** to ON
4. Add policies:
   - **INSERT**: Authenticated users can upload → Policy: `(bucket_id = 'photos')`
   - **SELECT**: Anyone can view → Policy: `(bucket_id = 'photos')`

### 4. Configure Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in your Supabase project URL and anon key.

### 5. Install and Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Seed Sample Data (Optional)

Run `supabase/seed.sql` in the Supabase SQL Editor to add sample machines, work orders, and PM schedules.

---

## Project Structure

```
src/
  app/
    (dashboard)/          # Protected dashboard routes
      page.tsx            # Main dashboard
      machines/           # Machine registry
      work-orders/        # Work order management
      pm-schedule/        # Preventive maintenance
      downtime/           # Downtime tracking
    login/                # Auth page
  components/
    ui/                   # shadcn/ui primitives
    machine-card.tsx      # Machine status card
    kpi-card.tsx          # Dashboard KPI card
    status-badge.tsx      # Machine status badge
    priority-badge.tsx    # WO priority badge
  lib/
    supabase/             # Supabase client/server/mutations
    constants.ts          # App-wide constants
  types/
    database.ts           # TypeScript types from Supabase schema
supabase/
  migration.sql           # Full DB schema
  seed.sql                # Sample data
```

---

## Default Login

After running `seed.sql`, use:
- **Admin**: admin@tokka.com / password123
- **Technician**: tech1@tokka.com / password123

> Note: You must create these users in Supabase Auth (Authentication → Users → Add user) with these emails, then the seed script will link them to profiles.
