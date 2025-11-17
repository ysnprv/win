"use client";

import { useState } from "react";
import { User, Lock, Image, CreditCard, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ProfileInfoTab } from "./profile-info-tab";
import { ProfileAvatarTab } from "./profile-avatar-tab";
import { SecurityTab } from "./security-tab";
import { SubscriptionTab } from "./subscription-tab";
import { DangerZoneTab } from "./danger-zone-tab";
import type { Database } from "@/types/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface ProfileTabsProps {
  profile: Profile;
  userEmail: string;
  isOAuthUser: boolean;
}

const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "avatar", label: "Avatar", icon: Image },
  { id: "security", label: "Security", icon: Lock },
  { id: "subscription", label: "Subscription", icon: CreditCard },
  { id: "danger", label: "Danger Zone", icon: AlertTriangle, isDanger: true },
];

export function ProfileTabs({ profile, userEmail, isOAuthUser }: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <>
      {/* Sidebar */}
      <aside className="w-full lg:w-64 shrink-0">
        <Card className="sticky top-8">
          <CardContent className="p-4">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3",
                      tab.isDanger && activeTab === tab.id && "text-destructive",
                      tab.isDanger && activeTab !== tab.id && "hover:text-destructive"
                    )}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </Button>
                );
              })}
            </nav>
          </CardContent>
        </Card>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <Card>
          <CardContent className="p-6 sm:p-8">
            {activeTab === "profile" && <ProfileInfoTab profile={profile} />}
            {activeTab === "avatar" && <ProfileAvatarTab profile={profile} />}
            {activeTab === "security" && <SecurityTab userEmail={userEmail} isOAuthUser={isOAuthUser} />}
            {activeTab === "subscription" && <SubscriptionTab profile={profile} />}
            {activeTab === "danger" && <DangerZoneTab />}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
