import { createClient } from "@supabase/supabase-js";

const supabaseUrl = 'https://szrrhfmqzmisshnoklgw.supabase.co';
const serviceRoleKey = 'sb_secret_ZV4n2zqwctxA_MbShLjZNg_Ifga1ECu';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function check() {
  console.log("Checking database...");
  const { data, error } = await supabase
    .from('daily_reports')
    .select('id, report_date, shift, unit_id')
    .limit(10);

  if (error) {
    console.error("Error:", error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log("NO REPORTS FOUND IN DATABASE.");
    return;
  }

  console.log("Found Reports in Database:");
  console.table(data);
}

check();
