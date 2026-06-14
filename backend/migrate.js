const sqlite3 = require('sqlite3').verbose();
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config();

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL || 'https://rbfaziqtvupdcvdvxxye.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Please set SUPABASE_SERVICE_ROLE_KEY in your env variables or .env file.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const dbPath = path.join(__dirname, 'skone_ticketing.db');
const db = new sqlite3.Database(dbPath);

function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function run() {
  try {
    console.log("Starting migration to Supabase...");

    // 1. Fetch all users from SQLite
    const oldUsers = await allAsync("SELECT * FROM users");
    console.log(`Found ${oldUsers.length} users to migrate.`);

    const userMap = {}; // old_id -> new_uuid

    for (const u of oldUsers) {
      console.log(`Migrating user: ${u.username} (${u.email})`);
      // Check if user already exists in Supabase Auth
      const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) throw listError;
      
      let targetUser = existingUsers.users.find(eu => eu.email === u.email);
      
      if (!targetUser) {
        // Create user
        const { data: created, error: createError } = await supabase.auth.admin.createUser({
          email: u.email,
          password: 'pass', // Default password as per init_db.js
          email_confirm: true,
          user_metadata: { username: u.username, role: u.role }
        });
        if (createError) throw createError;
        targetUser = created.user;
        console.log(`Created user ${u.username} with ID ${targetUser.id}`);
      } else {
        console.log(`User ${u.username} already exists with ID ${targetUser.id}`);
        // Ensure metadata role and username are set
        const { error: updateError } = await supabase.auth.admin.updateUserById(targetUser.id, {
          user_metadata: { username: u.username, role: u.role }
        });
        if (updateError) throw updateError;
      }

      userMap[u.user_id] = targetUser.id;
    }

    // 2. Fetch all assets from SQLite
    const oldAssets = await allAsync("SELECT * FROM assets");
    console.log(`Found ${oldAssets.length} assets to migrate.`);

    const assetMap = {}; // old_id -> new_id

    for (const a of oldAssets) {
      const newClientId = userMap[a.client_id];
      if (!newClientId) {
        console.warn(`Skipping asset ${a.name} because client_id ${a.client_id} was not migrated.`);
        continue;
      }

      // Check if asset already exists
      const { data: existingAssets, error: assetQueryError } = await supabase
        .from('assets')
        .select('asset_id')
        .eq('name', a.name)
        .eq('client_id', newClientId);
      
      if (assetQueryError) throw assetQueryError;

      if (existingAssets && existingAssets.length > 0) {
        assetMap[a.asset_id] = existingAssets[0].asset_id;
        console.log(`Asset ${a.name} already exists. Mapping old ID ${a.asset_id} to new ID ${existingAssets[0].asset_id}`);
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('assets')
          .insert({
            name: a.name,
            client_id: newClientId,
            deployment_date: a.deployment_date || null,
            last_maintenance_date: a.last_maintenance_date || null,
            status: a.status || 'Active',
            created_at: a.created_at || new Date().toISOString()
          })
          .select();
        
        if (insertError) throw insertError;
        
        assetMap[a.asset_id] = inserted[0].asset_id;
        console.log(`Migrated asset ${a.name}: mapped old ID ${a.asset_id} -> new ID ${inserted[0].asset_id}`);
      }
    }

    // 3. Fetch all tickets from SQLite
    const oldTickets = await allAsync("SELECT * FROM tickets");
    console.log(`Found ${oldTickets.length} tickets to migrate.`);

    for (const t of oldTickets) {
      const newClientId = userMap[t.client_id];
      const newAssetId = t.asset_id ? assetMap[t.asset_id] : null;

      if (!newClientId) {
        console.warn(`Skipping ticket ${t.ticket_id} because client_id ${t.client_id} was not migrated.`);
        continue;
      }

      // Check if ticket already exists
      const { data: existingTickets, error: ticketQueryError } = await supabase
        .from('tickets')
        .select('ticket_id')
        .eq('client_id', newClientId)
        .eq('description', t.description)
        .eq('created_at', t.created_at);
      
      if (ticketQueryError) throw ticketQueryError;

      if (existingTickets && existingTickets.length > 0) {
        console.log(`Ticket ${t.ticket_id} already exists.`);
      } else {
        const { error: insertError } = await supabase
          .from('tickets')
          .insert({
            client_id: newClientId,
            asset_id: newAssetId,
            issue_type: t.issue_type,
            subject: t.subject || '',
            priority: t.priority || 'Low',
            error_code: t.error_code || null,
            status: t.status || 'Open',
            assigned_tech: t.assigned_tech || null,
            description: t.description,
            created_at: t.created_at || new Date().toISOString(),
            updated_at: t.updated_at || new Date().toISOString()
          });

        if (insertError) throw insertError;
        console.log(`Migrated ticket: ${t.subject || 'No Subject'} (${t.ticket_id})`);
      }
    }

    console.log("Migration completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    db.close();
  }
}

run();
