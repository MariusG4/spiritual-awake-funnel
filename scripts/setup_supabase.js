import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || 'https://qcfjzpiefejwwdvynice.supabase.co';
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjZmp6cGllZmVqd3dkdnluaWNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2ODkxNjEsImV4cCI6MjA4OTI2NTE2MX0.c2QVqKKfTbYNWHLuiG_AduWkhxf8scOscyIYSwum-Iw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  console.log('Since we only have the anon key, we cannot easily run raw DDL via the JS client unless RLS allows it or we use the REST endpoint/RPC.');
  console.log('To set up the tables appropriately, you must run this SQL in your Supabase SQL Editor:');
  console.log(`
    -- Create Leads Table
    CREATE TABLE IF NOT EXISTS public.leads (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      email TEXT NOT NULL,
      name TEXT,
      source TEXT
    );

    -- Create Scarcity Table
    CREATE TABLE IF NOT EXISTS public.scarcity (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      spots_remaining INTEGER NOT NULL DEFAULT 100,
      total_spots INTEGER NOT NULL DEFAULT 100
    );

    -- Insert initial scarcity row if empty
    INSERT INTO public.scarcity (spots_remaining, total_spots)
    SELECT 100, 100
    WHERE NOT EXISTS (SELECT 1 FROM public.scarcity);

    -- Enable Row Level Security (RLS)
    ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.scarcity ENABLE ROW LEVEL SECURITY;

    -- Create Policies
    -- Allow anonymous users to INSERT into leads
    CREATE POLICY "Allow anonymous inserts to leads" ON public.leads
      FOR INSERT TO anon
      WITH CHECK (true);

    -- Allow anonymous users to SELECT from scarcity
    CREATE POLICY "Allow anonymous selects from scarcity" ON public.scarcity
      FOR SELECT TO anon
      USING (true);
      
    -- (Optional) If we want the client to decrement scarcity temporarily before webhook hits:
    -- We can either update it directly (less secure) or let the webhook handle it. We will just SELECT for now.
  `);
}

setupDatabase();
