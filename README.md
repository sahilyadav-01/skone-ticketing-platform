# Skone Tech Support Ticketing & Asset Tracking

[![React](https://img.shields.io/badge/React-App-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)

A modern, role-based IT ticketing system with workflows for **Clients**, **Support Engineers**, and **Admins**—fully migrated to a serverless **Supabase** backend.

---

## Table of Contents

- [Screenshots](#screenshots)
- [Quick Start](#quick-start)
- [How it Works](#how-it-works)
  - [Database & Auth](#database--auth)
  - [Edge Functions](#edge-functions)
  - [Frontend](#frontend)
- [Verification & Tests](#verification--tests)
- [Repository](#repository)

---

## Screenshots

Screenshots are stored in `./assets/`.

---

## Quick Start

### 1. Environment Configuration

Create a `.env` file inside the `frontend/` directory (or set them in your system environment):

```env
REACT_APP_SUPABASE_URL=https://rbfaziqtvupdcvdvxxye.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here
```

### 2. Run the Application

From the repository root:

```bash
npm install
npm run install-all
npm start
```

This will automatically install frontend dependencies and start the React development server locally at `http://localhost:3000`.

---

## How it Works

### Database & Auth

- Uses **Supabase Auth** for secure password logins, token generation, and session management.
- Integrates a **PostgreSQL** database on Supabase with tables for `public.users`, `public.assets`, and `public.tickets`.
- Implements **Row Level Security (RLS)** policies on all tables so clients can only view/create their own records, while support engineers and admins can triage and manage tickets.
- Features a PostgreSQL trigger (`on_auth_user_created`) to automatically sync user signup records from `auth.users` to `public.users`.
- Uses a PostgreSQL RPC function (`get_ticket_summary`) to aggregate KPI counts in a single network call.

### Edge Functions

- An admin-level Deno Edge Function (`manage-users`) manages administrative actions (user creation, updates, deletion) securely using the `service_role` client in the cloud.

### Frontend

- Written in React.
- Communicates directly with Supabase via `@supabase/supabase-js` client SDK.
- Restricts views and sidebars according to the authenticated user's role (Client, Support Engineer, or Admin).

---

## Repository

Project repository: https://github.com/sahilyadav-01/skone-ticketing-platform
