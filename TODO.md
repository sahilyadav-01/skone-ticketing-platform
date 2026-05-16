# TODO

- [x] Inspect auth + portal render logic
- [x] Inspect frontend API auth header behavior
- [ ] Implement UI + backend bypass (dev)
  - [ ] Update frontend/src/App.js to support ?bypass=1 (skip LoginReal + set user state + localStorage)
  - [ ] Update frontend/src/api.js to send X-DEV-BYPASS when bypass flag is enabled
  - [ ] Update backend/middleware/auth.js to allow bypass and set req.user from headers/query
  - [ ] Quick smoke test: run frontend/backend and verify tickets load with ?bypass=1

