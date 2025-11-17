import { LoginForm } from "@/components/auth/login-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      {/* Theme Toggle - Top Left */}
      <div className="absolute top-4 left-4 z-50">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm md:max-w-4xl">
        <Suspense fallback={<div>Loading...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
