import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const password = "Password123!";
const accounts = [
  {
    email: "superadmin@elit.local",
    full_name: "Super Admin",
    role: "super_admin",
    unitCode: null,
  },
  {
    email: "admin@elit.local",
    full_name: "Admin ELBAN",
    role: "admin",
    unitCode: "ELBAN",
  },
  {
    email: "petugas@elit.local",
    full_name: "Petugas ELBAN",
    role: "petugas",
    unitCode: "ELBAN",
  },
  {
    email: "viewer@elit.local",
    full_name: "Viewer ELBAN",
    role: "viewer",
    unitCode: "ELBAN",
  },
];

const { data: unit, error: unitError } = await supabase
  .from("units")
  .select("id")
  .eq("code", "ELBAN")
  .single();

if (unitError) {
  throw new Error(`Could not find Unit ELBAN: ${unitError.message}`);
}

for (const account of accounts) {
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: account.email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: account.full_name,
    },
  });

  let userId = created.user?.id;

  if (createError) {
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      throw new Error(`Failed to list users after create error: ${listError.message}`);
    }

    const existing = users.users.find((user) => user.email?.toLowerCase() === account.email);
    if (!existing) {
      throw new Error(`Failed to create ${account.email}: ${createError.message}`);
    }
    userId = existing.id;
  }

  const { error: profileError } = await supabase.from("users").upsert(
    {
      id: userId,
      email: account.email,
      full_name: account.full_name,
      role: account.role,
      unit_id: account.unitCode ? unit.id : null,
      is_active: true,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    throw new Error(`Failed to upsert profile ${account.email}: ${profileError.message}`);
  }

  console.log(`OK ${account.email} -> ${account.role}`);
}

console.log(`Done. Password for all seeded users: ${password}`);
