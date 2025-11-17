"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";
import type { Database } from "@/types/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface SubscriptionTabProps {
  profile: Profile;
}

export function SubscriptionTab({ profile }: SubscriptionTabProps) {
  const subscription = profile.subscription || "Starter";
  const endDate = profile.subscription_end_date;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription Plan</CardTitle>
        <CardDescription>Manage your subscription and billing</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-6 rounded-lg border-2 bg-gradient-to-br from-primary/5 to-primary/10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              <p className="text-lg font-semibold">Current Plan</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={subscription === "Starter" ? "secondary" : "default"} className="text-lg px-3 py-1">
                {subscription}
              </Badge>
              {endDate && (
                <span className="text-sm text-muted-foreground">
                  Valid until {new Date(endDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          
          {subscription === "Starter" && (
            <Button size="lg">
              Upgrade Plan
            </Button>
          )}
        </div>

        {/* Placeholder for subscription management */}
        <div className="space-y-4 p-6 rounded-lg border bg-muted/50">
          <h3 className="font-semibold">Subscription Management</h3>
          <p className="text-sm text-muted-foreground">
            Subscription management features will be available soon. You'll be able to:
          </p>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li>Upgrade or downgrade your plan</li>
            <li>View billing history</li>
            <li>Update payment methods</li>
            <li>Cancel subscription</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
