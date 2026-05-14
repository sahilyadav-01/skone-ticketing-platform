# Skone Tech Support Ticketing & Asset Tracking

This workspace contains an initial boilerplate for an IT ticketing system with a Node.js/Express backend and a React frontend.

## Structure

- `backend/` — Express API with MySQL schema and ticket endpoints
- `frontend/` — React app for ticket submission and listing

## Quick start

1. Open two terminals.
2. Backend:
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # update .env with your MySQL credentials
   npm start
   ```
3. Frontend:
   ```bash
   cd frontend
   npm install
   npm start
   ```

## Notes

- The backend uses MySQL via `mysql2`.
- The frontend proxies API requests to `http://localhost:4000`.
