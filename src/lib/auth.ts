import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AppRole = "employee" | "owner";

export async function requireUserWithRole() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (!profile) {
        await supabase.auth.signOut();
        redirect("/login");
    }

    const role: AppRole = profile.role === "owner" ? "owner" : "employee";
    return { user, role, supabase };
}
