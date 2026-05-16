import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function debug() {
  console.log("--- MENGECEK TABEL UNITS ---");
  const { data: units, error: unitsError } = await supabase.from("units").select("*");
  if (unitsError) console.error("Error units:", unitsError);
  else console.table(units);

  console.log("\n--- MENGECEK USER AKTIF (Alif Alpian SM) ---");
  const { data: users, error: userError } = await supabase
    .from("users")
    .select("id, full_name, unit_id, role")
    .eq("full_name", "Alif Alpian SM");
  
  if (userError) console.error("Error users:", userError);
  else {
    console.table(users);
    if (users[0]?.unit_id) {
      const match = units.find(u => u.id === users[0].unit_id);
      console.log(`\nApakah Unit ID ${users[0].unit_id} ada di tabel units?`, match ? "YA: " + match.name : "TIDAK ADA");
    }
  }
}

debug();
