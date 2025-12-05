import { createClient } from '@supabase/supabase-js';

// Use the correct Supabase project ID from your context
const SUPABASE_URL = "https://bdyyfohbwbkbybjrzole.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkeXlmb2hid2JrYnlianJ6b2xlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NzQzMjgsImV4cCI6MjA4MDQ1MDMyOH0.uJnOhLhUTQH8NRn8_SHd-OUtR2QnY47Oq6IWMgO2IfY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);