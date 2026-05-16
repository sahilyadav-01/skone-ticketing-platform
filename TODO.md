# TODO - Admin work

## Plan (approved/next steps)
- [x] Add backend RBAC + auth middleware; restrict /api/users and /api/tickets operations by role

- [ ] Add Admin endpoints for user management (create/list/update/delete users)
- [ ] Add Admin-only ticket actions if needed (e.g., allow additional statuses/bulk operations)
- [ ] Update frontend to:
  - [ ] Separate Admin UI from Support portal
  - [ ] Add admin user-management screen
  - [ ] Add admin ticket bulk actions / enhanced filtering
  - [ ] Hide/disable restricted actions based on role
- [ ] Update frontend api.js with new endpoints
- [ ] Add/adjust styles in ui.css
- [ ] Run backend + frontend and test role flows

