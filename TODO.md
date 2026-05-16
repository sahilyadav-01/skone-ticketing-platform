# TODO - UI + Real Ticket Portal

## Plan steps
- [x] Update backend: add `PATCH /api/tickets/:ticket_id` support workflow.

- [x] Update backend: add optional ticket filtering (status/assigned_tech/client_id).

- [x] Frontend: create role-based login portal (Client/Support/Admin) and update `App.js` routing logic.

- [x] Frontend: implement ticket detail page (`TicketDetails`) and navigation from `TicketCard`.

- [x] Frontend: implement support ticket update UI (status + assigned tech).

- [ ] Frontend: add ticket list filtering for support portal.

- [ ] Frontend: polish header/layout and extend CSS/badges.

- [x] Verification: run backend + frontend and test end-to-end flows.

## Zoho type update
- [x] Add `tickets.zoho_type` column + support reading/writing it
- [x] Update ticket create flow to accept Zoho Type from frontend
- [x] Apply mapping Zoho Type → `issue_type` on create (currently 1:1)
- [x] Show Zoho Type in ticket UI (Card + Details)
- [x] Verification: run backend + frontend and test creating a ticket with Zoho type


