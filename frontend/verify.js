const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rbfaziqtvupdcvdvxxye.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZmF6aXF0dnVwZGN2ZHZ4eHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0MDkzMDMsImV4cCI6MjA5Njk4NTMwM30.AaieHo2dhgDRn4LpRSTaNO2oawir6rcNtgSJpMO5Mfo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function check() {
  try {
    console.log("Checking username lookup...");
    const { data: user, error: lookupError } = await supabase
      .from('users')
      .select('email')
      .eq('username', 'admin')
      .maybeSingle();

    if (lookupError) {
      console.error("Lookup error:", lookupError);
    } else {
      console.log("Lookup result:", user);
    }

    if (user) {
      console.log("Attempting signInWithPassword for:", user.email);
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: 'pass'
      });

      if (authError) {
        console.error("Auth error:", authError);
      } else {
        console.log("Auth success! User ID:", authData.user.id);
      }
    }
  } catch (e) {
    console.error("Unexpected error:", e);
  }
}

check();
