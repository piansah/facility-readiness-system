
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : null;
const supabaseKey = keyMatch ? keyMatch[1].trim() : null;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Checking incident_follow_ups table...');
  
  const { data, error } = await supabase
    .from('incident_follow_ups')
    .select('id')
    .limit(1);

  if (error) {
    console.error('TABLE ERROR:', error.message);
  } else {
    console.log('Table exists, records:', data.length);
  }
}

test();
