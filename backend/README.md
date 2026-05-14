# Backend — Skone IT Ticketing

## Setup

1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```
2. Copy the environment template:
   ```bash
   copy .env.example .env
   ```
3. Update `.env` with your MySQL credentials.
4. Initialize the database:
   ```bash
   mysql -u root -p < schema.sql
   ```
5. Start the server:
   ```bash
   npm start
   ```

## API Endpoints

- `GET /api/tickets` — list tickets
- `POST /api/tickets` — create a ticket
- `GET /api/health` — health check
