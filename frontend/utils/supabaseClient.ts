import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL environment variable. Please create a .env.local file in the frontend directory with:\n' +
    'NEXT_PUBLIC_SUPABASE_URL=https://hknnpdodkxaizhkxztis.supabase.co\n' +
    'NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrbm5wZG9ka3hhaXpoa3h6dGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNTE5MjgsImV4cCI6MjA2NzkyNzkyOH0.8NYHU344_aNwDCvvNRcfSeEqmHh1xqc-lnzg0nd4nGs'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable. Please create a .env.local file in the frontend directory with:\n' +
    'NEXT_PUBLIC_SUPABASE_URL=https://hknnpdodkxaizhkxztis.supabase.co\n' +
    'NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrbm5wZG9ka3hhaXpoa3h6dGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNTE5MjgsImV4cCI6MjA2NzkyNzkyOH0.8NYHU344_aNwDCvvNRcfSeEqmHh1xqc-lnzg0nd4nGs'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 