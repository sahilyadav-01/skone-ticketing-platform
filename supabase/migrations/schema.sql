-- 1. Create public.users table
CREATE TABLE IF NOT EXISTS public.users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Client', 'Support Engineer', 'Admin')) DEFAULT 'Client',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helper function to check roles securely without RLS recursion
CREATE OR REPLACE FUNCTION public.check_user_in_roles(p_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE user_id = auth.uid() AND role = ANY(p_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC for secure username to email lookup (pre-login)
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
RETURNS TEXT AS $$
  SELECT email FROM public.users WHERE username = p_username;
$$ LANGUAGE sql SECURITY DEFINER;

-- Restrict execute on lookup function to anon and authenticated
REVOKE EXECUTE ON FUNCTION public.get_email_by_username(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO anon, authenticated;

-- Enable RLS on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON public.users;
DROP POLICY IF EXISTS "Allow public lookup of email by username" ON public.users;
DROP POLICY IF EXISTS "Allow write access to Admins" ON public.users;

-- RLS Policies for users
CREATE POLICY "Allow read access to authenticated users"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR public.check_user_in_roles(ARRAY['Support Engineer', 'Admin'])
  );

CREATE POLICY "Allow write access to Admins"
  ON public.users
  FOR ALL
  TO authenticated
  USING (
    public.check_user_in_roles(ARRAY['Admin'])
  );

-- 2. Create assets table
CREATE TABLE IF NOT EXISTS public.assets (
  asset_id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  client_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  deployment_date DATE,
  last_maintenance_date DATE,
  status TEXT NOT NULL CHECK (status IN ('Active', 'In Repair', 'Decommissioned')) DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on assets
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow users to read their own assets" ON public.assets;
DROP POLICY IF EXISTS "Allow Admins to manage assets" ON public.assets;

-- RLS Policies for assets
CREATE POLICY "Allow users to read their own assets"
  ON public.assets
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = client_id 
    OR public.check_user_in_roles(ARRAY['Support Engineer', 'Admin'])
  );

CREATE POLICY "Allow Admins to manage assets"
  ON public.assets
  FOR ALL
  TO authenticated
  USING (
    public.check_user_in_roles(ARRAY['Admin'])
  );

-- 3. Create tickets table
CREATE TABLE IF NOT EXISTS public.tickets (
  ticket_id SERIAL PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  asset_id INT REFERENCES public.assets(asset_id) ON DELETE SET NULL,
  issue_type TEXT NOT NULL,
  subject TEXT DEFAULT '',
  priority TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')) DEFAULT 'Low',
  error_code TEXT,
  status TEXT NOT NULL CHECK (status IN ('Open', 'Assigned', 'In Progress', 'Resolved', 'Closed', 'Waiting for Vendor')) DEFAULT 'Open',
  assigned_tech TEXT,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on tickets
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow users to read their own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Allow clients to create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Allow support and admins to update tickets" ON public.tickets;

-- RLS Policies for tickets
CREATE POLICY "Allow users to read their own tickets"
  ON public.tickets
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = client_id 
    OR public.check_user_in_roles(ARRAY['Support Engineer', 'Admin'])
  );

CREATE POLICY "Allow clients to create tickets"
  ON public.tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = client_id
    AND public.check_user_in_roles(ARRAY['Client'])
  );

CREATE POLICY "Allow support and admins to update tickets"
  ON public.tickets
  FOR UPDATE
  TO authenticated
  USING (
    public.check_user_in_roles(ARRAY['Support Engineer', 'Admin'])
  );

-- Function and trigger for automatically updating updated_at
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_public_tickets_updated_at ON public.tickets;
CREATE TRIGGER set_public_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Triggers for syncing auth.users -> public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (user_id, username, email, role, created_at)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email,
    'Client', -- Always default to Client role for security on creation
    COALESCE(new.created_at, now())
  )
  ON CONFLICT (user_id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_update_user()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users SET
    username = COALESCE(new.raw_user_meta_data->>'username', public.users.username),
    email = COALESCE(new.email, public.users.email)
    -- Explicitly do NOT update role from new.raw_user_meta_data to prevent client role self-escalation
  WHERE user_id = new.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_update_user();

-- RPC function for KPI summary
CREATE OR REPLACE FUNCTION public.get_ticket_summary(p_client_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  v_role TEXT;
  v_open_count INT;
  v_pending_count INT;
  v_resolved_today INT;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get user role
  SELECT role INTO v_role FROM public.users WHERE user_id = v_user_id;

  -- If client, force filter to user's tickets
  IF v_role = 'Client' THEN
    p_client_id := v_user_id;
  END IF;

  -- Count open tickets
  SELECT COUNT(*) INTO v_open_count
  FROM public.tickets
  WHERE status = 'Open'
    AND (p_client_id IS NULL OR client_id = p_client_id);

  -- Count pending tickets
  SELECT COUNT(*) INTO v_pending_count
  FROM public.tickets
  WHERE status IN ('Assigned', 'In Progress', 'Waiting for Vendor')
    AND (p_client_id IS NULL OR client_id = p_client_id);

  -- Count resolved today
  SELECT COUNT(*) INTO v_resolved_today
  FROM public.tickets
  WHERE status = 'Resolved'
    AND timezone('utc', updated_at)::date = CURRENT_DATE
    AND (p_client_id IS NULL OR client_id = p_client_id);

  RETURN json_build_object(
    'open_count', v_open_count,
    'pending_count', v_pending_count,
    'resolved_today', v_resolved_today
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restrict execute permission to authenticated users only
REVOKE EXECUTE ON FUNCTION public.get_ticket_summary(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ticket_summary(UUID) TO authenticated;

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_tickets_client_id ON public.tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_tech ON public.tickets(assigned_tech);
CREATE INDEX IF NOT EXISTS idx_assets_client_id ON public.assets(client_id);

-- 4. Create ticket_comments table
CREATE TABLE IF NOT EXISTS public.ticket_comments (
  id SERIAL PRIMARY KEY,
  ticket_id INT NOT NULL REFERENCES public.tickets(ticket_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on ticket_comments
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow read access to ticket comments" ON public.ticket_comments;
DROP POLICY IF EXISTS "Allow insert access to ticket comments" ON public.ticket_comments;

-- RLS Policies for ticket_comments
CREATE POLICY "Allow read access to ticket comments"
  ON public.ticket_comments
  FOR SELECT
  TO authenticated
  USING (
    public.check_user_in_roles(ARRAY['Support Engineer', 'Admin'])
    OR EXISTS (
      SELECT 1 FROM public.tickets
      WHERE tickets.ticket_id = ticket_comments.ticket_id
        AND tickets.client_id = auth.uid()
    )
  );

CREATE POLICY "Allow insert access to ticket comments"
  ON public.ticket_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.check_user_in_roles(ARRAY['Support Engineer', 'Admin'])
    OR (
      auth.uid() = user_id
      AND EXISTS (
        SELECT 1 FROM public.tickets
        WHERE tickets.ticket_id = ticket_comments.ticket_id
          AND tickets.client_id = auth.uid()
      )
    )
  );

-- 5. Create ticket_history table
CREATE TABLE IF NOT EXISTS public.ticket_history (
  id SERIAL PRIMARY KEY,
  ticket_id INT NOT NULL REFERENCES public.tickets(ticket_id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on ticket_history
ALTER TABLE public.ticket_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow read access to ticket history" ON public.ticket_history;

-- RLS Policies for ticket_history
CREATE POLICY "Allow read access to ticket history"
  ON public.ticket_history
  FOR SELECT
  TO authenticated
  USING (
    public.check_user_in_roles(ARRAY['Support Engineer', 'Admin'])
    OR EXISTS (
      SELECT 1 FROM public.tickets
      WHERE tickets.ticket_id = ticket_history.ticket_id
        AND tickets.client_id = auth.uid()
    )
  );

-- Trigger for logging ticket updates
CREATE OR REPLACE FUNCTION public.log_ticket_history()
RETURNS TRIGGER AS $$
DECLARE
  v_changed_by UUID;
BEGIN
  v_changed_by := auth.uid();
  IF v_changed_by IS NULL THEN
    v_changed_by := NEW.client_id;
  END IF;

  -- Status update log
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.ticket_history (ticket_id, action, old_value, new_value, changed_by)
    VALUES (NEW.ticket_id, 'Status Update', OLD.status, NEW.status, v_changed_by);
  END IF;

  -- Tech assignment log
  IF OLD.assigned_tech IS DISTINCT FROM NEW.assigned_tech THEN
    INSERT INTO public.ticket_history (ticket_id, action, old_value, new_value, changed_by)
    VALUES (NEW.ticket_id, 'Tech Assignment', COALESCE(OLD.assigned_tech, 'Unassigned'), COALESCE(NEW.assigned_tech, 'Unassigned'), v_changed_by);
  END IF;

  -- Priority log
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO public.ticket_history (ticket_id, action, old_value, new_value, changed_by)
    VALUES (NEW.ticket_id, 'Priority Change', OLD.priority, NEW.priority, v_changed_by);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_ticket_history ON public.tickets;
CREATE TRIGGER trigger_log_ticket_history
  AFTER UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.log_ticket_history();

-- Add Indexes for Comments and History performance
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON public.ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket_id ON public.ticket_history(ticket_id);

