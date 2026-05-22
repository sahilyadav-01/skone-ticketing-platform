# Skone Tech Support Ticketing & Asset Tracking

This workspace contains an IT ticketing system with a Node.js/Express backend and a React frontend.

## Structure

- `backend/` — Express API with ticket endpoints and local SQLite database support
- `frontend/` — React app for role-based ticket submission and support management

## Quick start

### Option 1: root workspace helper

1. From the repository root:
   ```bash
   npm install
   npm run install-all
   node backend/init_db.js
   npm start
   ```

This runs both the backend and frontend together using a single root-level command.

### Option 1b: Windows PowerShell helper

From the repository root, run:
```powershell
./start-all.ps1
```

This opens two PowerShell windows, one for the backend and one for the frontend.

### Option 2: manual start

1. Open two terminals.
2. Backend:
   ```bash
   cd backend
   npm install
   node init_db.js
   npm start
   ```
3. Frontend:
   ```bash
   cd frontend
   npm install
   npm start
   ```

## Backend behavior

- Uses a local SQLite database file at `backend/skone_ticketing.db`.
- `node init_db.js` creates tables and inserts sample users.
- API endpoints include:
  - `GET /api/users?role=Client` — fetch user accounts by role
  - `GET /api/tickets` — fetch tickets with optional `client_id`, `status`, or `assigned_tech` filters
  - `POST /api/tickets` — create a ticket
  - `PATCH /api/tickets/:ticket_id` — update ticket status, assigned tech, or description

## Frontend behavior

- The app supports role-based login for `Client`, `Support Engineer`, and `Admin`.
- Clients can submit new tickets and view their own requests.
- Support/Admin users can view all tickets, update status, and assign technicians.
- The frontend proxies API requests to `http://localhost:4000`.

## Notes

- If you want to switch to a MySQL backend later, update `backend/db.js` and provide credentials in `.env`.
- The current local setup works out of the box with SQLite.

## Screenshots

Screenshots go in `./assets/`.

Example:

```md
![Skone UI - Screenshot 1](./assets/ss-1.png)
```

See `assets/README_ASSETS.md` for suggested filenames.

