// supabase/functions/delete-app/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    // Verify Auth
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    const { data: user, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user?.user) {
      return new Response("Unauthorised", { status: 401 });
    }

    const userId = user.user.id;

    // Delete all user-owned data
    await supabase.from("profiles").delete().eq("id", userId);
    await supabase.from("astro_history").delete().eq("user_id", userId);

    // Finally delete the Supabase user account
    const { error: delError } = await supabase.auth.admin.deleteUser(userId);

    if (delError) {
      return new Response(`Delete failed: ${delError.message}`, { status: 400 });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    return new Response("Internal error: " + err.message, { status: 500 });
  }
});
