import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const testUsers = [
      { email: "admin@devsync.io", password: "admin123456", name: "Ana Silva", role: "admin" },
      { email: "lead@devsync.io", password: "lead123456", name: "Carlos Lima", role: "lead" },
      { email: "dev@devsync.io", password: "dev123456", name: "Pedro Santos", role: "developer" },
    ];

    const results = [];

    for (const u of testUsers) {
      // Create user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { name: u.name },
      });

      if (authError) {
        // User may already exist
        if (authError.message?.includes("already been registered")) {
          results.push({ email: u.email, status: "already_exists" });
          
          // Still update role if user exists
          const { data: existingUsers } = await supabase.auth.admin.listUsers();
          const existing = existingUsers?.users?.find((eu: any) => eu.email === u.email);
          if (existing && u.role !== "developer") {
            await supabase.from("user_roles")
              .update({ role: u.role })
              .eq("user_id", existing.id);
          }
          continue;
        }
        results.push({ email: u.email, status: "error", error: authError.message });
        continue;
      }

      const userId = authData.user!.id;

      // Update role if not developer (default)
      if (u.role !== "developer") {
        await supabase.from("user_roles")
          .update({ role: u.role })
          .eq("user_id", userId);
      }

      results.push({ email: u.email, status: "created", userId });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
