"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateEmail, updatePassword } from "@/lib/profile/actions";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";

const emailSchema = z.object({
    newEmail: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
});

const passwordSchema = z
    .object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: z
            .string()
            .min(8, "Password must be at least 8 characters"),
        confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
    });

type EmailFormValues = z.infer<typeof emailSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

interface SecurityTabProps {
    userEmail: string;
    isOAuthUser: boolean;
}

export function SecurityTab({ userEmail, isOAuthUser }: SecurityTabProps) {
    const router = useRouter();
    const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    const emailForm = useForm<EmailFormValues>({
        resolver: zodResolver(emailSchema),
        defaultValues: {
            newEmail: "",
            password: "",
        },
    });

    const passwordForm = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        },
    });

    const onEmailSubmit = async (data: EmailFormValues) => {
        setIsUpdatingEmail(true);

        try {
            const result = await updateEmail(data.newEmail, data.password);

            if (result.success) {
                toast.success(result.message || "Email updated successfully", {
                    description:
                        "You'll be redirected to login with your new email",
                });
                router.push("/login");
            } else {
                toast.error(result.error || "Failed to update email");
            }
        } catch (error) {
            toast.error("An unexpected error occurred");
        } finally {
            setIsUpdatingEmail(false);
        }
    };

    const onPasswordSubmit = async (data: PasswordFormValues) => {
        setIsUpdatingPassword(true);

        try {
            const result = await updatePassword(
                data.currentPassword,
                data.newPassword
            );

            if (result.success) {
                toast.success(
                    result.message || "Password updated successfully",
                    {
                        description:
                            "You'll be redirected to login with your new password",
                    }
                );
                router.push("/login");
            } else {
                toast.error(result.error || "Failed to update password");
            }
        } catch (error) {
            toast.error("An unexpected error occurred");
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    return (
        <div className="space-y-6">
            {isOAuthUser && (
                <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
                    <CardHeader>
                        <CardTitle className="text-blue-900 dark:text-blue-100">
                            OAuth Account
                        </CardTitle>
                        <CardDescription className="text-blue-700 dark:text-blue-300">
                            Email and password management is handled by your
                            OAuth provider.
                        </CardDescription>
                    </CardHeader>
                </Card>
            )}

            {/* Change Email - Disabled for OAuth users */}
            <Card className={isOAuthUser ? "opacity-60" : ""}>
                <CardHeader>
                    <CardTitle>Change Email</CardTitle>
                    <CardDescription>
                        {isOAuthUser
                            ? "Email is managed by your OAuth provider (Google, LinkedIn, etc.)"
                            : "Update your email address. You'll be signed out from all devices for security."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isOAuthUser ? (
                        <div className="rounded-lg bg-muted p-4">
                            <p className="text-sm font-medium">Current Email</p>
                            <p className="text-sm text-muted-foreground">
                                {userEmail}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                                To change your email, please update it in your
                                OAuth provider's settings.
                            </p>
                        </div>
                    ) : (
                        <Form {...emailForm}>
                            <form
                                onSubmit={emailForm.handleSubmit(onEmailSubmit)}
                                className="space-y-4"
                            >
                                <div className="rounded-lg bg-muted p-4">
                                    <p className="text-sm font-medium">
                                        Current Email
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {userEmail}
                                    </p>
                                </div>

                                <FormField
                                    control={emailForm.control}
                                    name="newEmail"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>New Email</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="email"
                                                    placeholder="new@example.com"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                You'll receive a verification
                                                email at your new address
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={emailForm.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Current Password
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="password"
                                                    placeholder="••••••••"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Confirm your password to
                                                continue
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Button
                                    type="submit"
                                    disabled={isUpdatingEmail}
                                >
                                    {isUpdatingEmail
                                        ? "Updating..."
                                        : "Update Email"}
                                </Button>
                            </form>
                        </Form>
                    )}
                </CardContent>
            </Card>

            {/* Change Password - Disabled for OAuth users */}
            <Card className={isOAuthUser ? "opacity-60" : ""}>
                <CardHeader>
                    <CardTitle>Change Password</CardTitle>
                    <CardDescription>
                        {isOAuthUser
                            ? "Password is managed by your OAuth provider (Google, LinkedIn, etc.)"
                            : "Update your password. You'll be signed out from all devices for security."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isOAuthUser ? (
                        <div className="rounded-lg bg-muted p-4">
                            <p className="text-sm text-muted-foreground">
                                Your account uses OAuth authentication. Password
                                management is handled by your provider.
                            </p>
                        </div>
                    ) : (
                        <Form {...passwordForm}>
                            <form
                                onSubmit={passwordForm.handleSubmit(
                                    onPasswordSubmit
                                )}
                                className="space-y-4"
                            >
                                <FormField
                                    control={passwordForm.control}
                                    name="currentPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Current Password
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="password"
                                                    placeholder="••••••••"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Separator />

                                <FormField
                                    control={passwordForm.control}
                                    name="newPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>New Password</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="password"
                                                    placeholder="••••••••"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Must be at least 8 characters
                                                with letters and numbers
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={passwordForm.control}
                                    name="confirmPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Confirm New Password
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="password"
                                                    placeholder="••••••••"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Button
                                    type="submit"
                                    disabled={isUpdatingPassword}
                                >
                                    {isUpdatingPassword
                                        ? "Updating..."
                                        : "Update Password"}
                                </Button>
                            </form>
                        </Form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
