"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LoginFormProps = {
  callbackUrl: string;
  initialError?: string;
};

const getErrorMessage = (error?: string) => {
  switch (error) {
    case "CredentialsSignin":
      return "Invalid email or password.";
    default:
      return error ? "Unable to sign in." : null;
  }
};

export function LoginForm({ callbackUrl, initialError }: LoginFormProps) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(
    getErrorMessage(initialError),
  );

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl,
      redirect: false,
    });

    if (!result || result.error) {
      setError(
        getErrorMessage(result?.error ?? undefined) || "Unable to sign in.",
      );
      setIsSubmitting(false);
      return;
    }

    router.push(result.url || callbackUrl);
    router.refresh();
  };

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="email">
          Email
        </label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={isSubmitting}
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="password">
          Password
        </label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={isSubmitting}
          required
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button className="w-full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Signing In..." : "Sign In"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Need an account?{" "}
        <Link
          className="text-foreground underline underline-offset-4"
          href="/register"
        >
          Register
        </Link>
      </p>
    </form>
  );
}
