
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : null;
const supabaseKey = keyMatch ? keyMatch[1].trim() : null;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const id = 'cc954c7f-e4e6-4d31-96cb-f455a0fdcd91';
  console.log('Checking report ID:', id);
  
  const { data: report, error: reportError } = await supabase
    .from('daily_reports')
    .select('id, unit_id, status, units(name)')
    .eq('id', id)
    .single();

  if (reportError) {
    console.error('REPORT NOT FOUND OR ERROR:', reportError.message);
  } else {
    console.log('Report exists:', report);
  }
}

test();
