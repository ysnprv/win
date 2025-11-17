import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { ThemeToggle } from "@/components/theme-toggle";

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {/* Theme Toggle - Top Left */}
      <div className="absolute top-4 left-4 z-50">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-xl">
        <ResetPasswordForm />
      </div>
    </div>
  );
}
