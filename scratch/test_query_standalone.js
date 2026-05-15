
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : null;
const supabaseKey = keyMatch ? keyMatch[1].trim() : null;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Testing connection to:', supabaseUrl);
  
  const { data: report, error: reportError } = await supabase
    .from('daily_reports')
    .select('id, unit_id')
    .limit(1);

  if (reportError) {
    console.error('BASIC FETCH ERROR:', reportError);
    return;
  }
  
  console.log('Found report:', report[0]?.id);

  if (report[0]) {
    // Test users join hint
    const { data: userTest, error: userError } = await supabase
      .from('daily_reports')
      .select('id, users!daily_reports_created_by_fkey(full_name)')
      .eq('id', report[0].id)
      .single();

    if (userError) {
      console.error('USERS JOIN ERROR:', userError.message);
    } else {
      console.log('USERS JOIN SUCCESS');
    }

    // Test incidents columns
    const { data: incTest, error: incError } = await supabase
      .from('incidents')
      .select('id, result_status, handler_type')
      .limit(1);

    if (incError) {
      console.error('INCIDENTS COLUMNS ERROR:', incError.message);
    } else {
      console.log('INCIDENTS COLUMNS SUCCESS');
    }
    
    // Test incident photos follow_up_id
    const { data: photoTest, error: photoError } = await supabase
      .from('incident_photos')
      .select('id, follow_up_id')
      .limit(1);

    if (photoError) {
      console.error('PHOTO COLUMN ERROR:', photoError.message);
    } else {
      console.log('PHOTO COLUMN SUCCESS');
    }
  }
}

test();
