# Skone Tech Support Ticketing & Asset Tracking

[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=nodedotjs)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-App-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![SQLite](https://img.shields.io/badge/Database-SQLite-07405E?style=for-the-badge&logo=sqlite)](https://www.sqlite.org/)

A practical IT ticketing system with role-based workflows for **Clients**, **Support Engineers**, and **Admins**—built with a **Node.js/Express** backend and a **React** frontend.

---

## Table of Contents

- [Screenshots](#screenshots)
- [Quick Start](#quick-start)
- [How it Works](#how-it-works)
  - [Backend](#backend)
  - [Frontend](#frontend)
- [API Overview](#api-overview)
- [Notes](#notes)
- [Repository](#repository)

---

## Screenshots

Screenshots go in `./assets/`.

Example:

```md
![Skone UI - Screenshot 1](./assets/ss-1.png)
```

See `assets/README_ASSETS.md` for suggested filenames (if available).

---

## Quick Start

### Option 1: Root (run everything)

From the repository root:

```bash
npm install
npm run install-all
node backend/init_db.js
npm start
```

This runs both the backend and frontend together (using the root `start` script).


---

### Option 1b: Windows PowerShell helper

From the repository root:

```powershell
./start-all.ps1
```

This opens two PowerShell windows—one for the backend and one for the frontend.

---

### Option 2: Manual start

1. Open two terminals.

2. **Backend**:

```bash
cd backend
npm install
node init_db.js
npm start
```

3. **Frontend**:

```bash
cd frontend
npm install
npm start
```

---

## How it Works

### Backend

- Uses a local SQLite database file at `backend/skone_ticketing.db`.
- `node backend/init_db.js` creates tables and inserts sample users.
- Provides ticket endpoints and user-related endpoints.

### Frontend

- Supports role-based login for **Client**, **Support Engineer**, and **Admin**.
- Clients can submit new tickets and view their own requests.
- Support/Admin users can view all tickets, update status, and assign technicians.
- The frontend proxies API requests to `http://localhost:4000`.

---

## API Overview

Key backend endpoints:

- `GET /api/users?role=Client` — fetch user accounts by role
- `GET /api/tickets` — fetch tickets with optional filters (`client_id`, `status`, `assigned_tech`)
- `POST /api/tickets` — create a ticket
- `PATCH /api/tickets/:ticket_id` — update ticket status, assigned tech, or description

---

## Notes

- If you want to switch to a MySQL backend later, update `backend/db.js` and provide credentials in `.env`.
- The current local setup works out of the box with SQLite.

---

## Repository

Project repository: https://github.com/sahil-yadav/skone-support-ticketing

