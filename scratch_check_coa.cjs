const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://mxkorxmazthagjaqwrfk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14a29yeG1henRoYWdqYXF3cmZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNTEzMzUsImV4cCI6MjA4NzgyNzMzNX0.f7NF0r9uYefl3VCQm6t123jpiaYZGYq3642M0YlhG3k";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function check() {
  const { data, error } = await supabase.from('chart_of_accounts').select('id, name, type');
  console.log('Chart of Accounts:', JSON.stringify(data, null, 2));
  if (error) console.error('Error:', error);
}
check();
