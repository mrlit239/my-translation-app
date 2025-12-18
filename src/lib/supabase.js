import { createClient } from '@supabase/supabase-js';

// These will be populated by the user later
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://eojnarkzxjvhmqatrhvq.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvam5hcmt6eGp2aG1xYXRyaHZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNjk1NTQsImV4cCI6MjA3OTc0NTU1NH0.K3K5Ay1Z9Vz8dJeO012NBLDa6YwAaeqhyEt3uu1s3R4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = () => {
    return supabaseUrl.length > 0 && supabaseAnonKey.length > 0;
};
