
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Testing connection to:', supabaseUrl);
  
  // Test basic fetch
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
    // Test complex join
    const { data: complex, error: complexError } = await supabase
      .from('daily_reports')
      .select(`
        id,
        users!daily_reports_created_by_fkey (full_name),
        incidents (
          id, result_status, handler_type
        )
      `)
      .eq('id', report[0].id)
      .single();

    if (complexError) {
      console.error('COMPLEX JOIN ERROR:', complexError);
    } else {
      console.log('COMPLEX JOIN SUCCESS');
    }
  }
}

test();
