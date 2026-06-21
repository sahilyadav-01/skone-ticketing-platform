const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rbfaziqtvupdcvdvxxye.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZmF6aXF0dnVwZGN2ZHZ4eHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0MDkzMDMsImV4cCI6MjA5Njk4NTMwM30.AaieHo2dhgDRn4LpRSTaNO2oawir6rcNtgSJpMO5Mfo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const ticket = {
    client_id: '13e1825a-410c-459c-89b4-44949798e28b', // bob
    issue_type: 'Network',
    subject: 'wifi not working',
    priority: 'High',
    status: 'Assigned',
    assigned_tech: 'tech1',
    description: 'Unable to connect to office wifi. It keeps disconnecting.'
  };

  const { data, error } = await supabase.from('tickets').insert([ticket]).select();
  if (error) {
    console.error('Error inserting ticket:', error);
  } else {
    console.log('Inserted ticket:', JSON.stringify(data, null, 2));
  }
}

run();
