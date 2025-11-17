import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserNav } from "@/components/user-nav";
import { calculateProfileCompletion } from "@/lib/profile/completion";

export default async function ServicesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Protect the route - redirect to login if not authenticated
    const supabase = await createClient();
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user) {
        redirect("/login");
    }

    // Fetch user profile data
    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    const userData = {
        name: profile?.name || user.user_metadata?.name || "User",
        email: profile?.email || user.email || "",
        avatar:
            (profile?.avatar_url as string) ||
            user.user_metadata?.avatar_url ||
            "",
        profileCompletion: calculateProfileCompletion(profile),
    };

    return (
        <SidebarProvider>
            <AppSidebar />
            <main className="flex-1 w-full">
                <div className="border-b h-16 px-4 flex items-center justify-between bg-slate-100 dark:bg-neutral-950 shadow-sm z-10 relative">
                    <SidebarTrigger />
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <UserNav user={userData} />
                    </div>
                </div>
                <div className="shadow-[inset_0_4px_6px_-1px_rgba(0,0,0,0.06),inset_0_2px_4px_-2px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_4px_6px_-1px_rgba(0,0,0,0.3),inset_0_2px_4px_-2px_rgba(0,0,0,0.2)]">
                    {children}
                </div>
            </main>
        </SidebarProvider>
    );
}
