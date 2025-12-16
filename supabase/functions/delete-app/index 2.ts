// supabase/functions/delete-app/index.ts
// Edge Function to fully delete a user account + data

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[delete-app] Missing env vars");
      return new Response("Server not configured", { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      console.error("[delete-app] No auth token");
      return new Response("Unauthorised", { status: 401 });
    }

    // Look up the user from the JWT
    const { data: userResult, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userResult?.user) {
      console.error("[delete-app] getUser error", userError);
      return new Response("Unauthorised", { status: 401 });
    }

    const user = userResult.user;
    const userId = user.id;

    console.log("[delete-app] Deleting user", userId, user.email);

    // 1. Delete related data in your own tables
    // Adjust table names/columns here to match your schema.
    // If a table does not exist, comment out that line.

    // Example: standard Supabase "profiles" table keyed by user id
    const { error: profilesError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profilesError) {
      console.error("[delete-app] profiles delete error", profilesError);
    }

    // Add more deletes if needed, for example:
    // await supabase.from("astro_history").delete().eq("user_id", userId);

    // 2. Delete the auth user itself (admin API)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("[delete-app] auth delete error", deleteError);
      return new Response(
        "Delete failed: " + (deleteError.message ?? "unknown error"),
        { status: 400 },
      );
    }

    console.log("[delete-app] User deleted successfully", userId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("[delete-app] Unexpected error", err);
    return new Response("Internal error: " + (err?.message ?? "unknown"), {
      status: 500,
    });
  }
});
