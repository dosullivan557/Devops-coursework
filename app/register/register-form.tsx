"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type TeamOption = {
  id: number;
  name: string;
};

type RegisterFormProps = {
  callbackUrl: string;
};

export function RegisterForm({ callbackUrl }: RegisterFormProps) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [teamId, setTeamId] = useState("");
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTeams = async () => {
      try {
        const response = await fetch("/api/teams", { cache: "no-store" });
        if (!response.ok) {
          setError("Unable to load teams.");
          return;
        }

        const data = (await response.json()) as TeamOption[];
        setTeams(data);
      } catch {
        setError("Unable to load teams.");
      } finally {
        setIsLoadingTeams(false);
      }
    };

    void loadTeams();
  }, []);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!teamId) {
      setError("Please select a team.");
      return;
    }

    setIsSubmitting(true);

    try {
      const registerResponse = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          teamId: Number(teamId),
        }),
      });

      if (!registerResponse.ok) {
        const body = (await registerResponse.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(body.error || "Unable to create account.");
        setIsSubmitting(false);
        return;
      }

      const signInResult = await signIn("credentials", {
        email: email.trim(),
        password,
        callbackUrl,
        redirect: false,
      });

      if (!signInResult || signInResult.error) {
        setError("Account created, but automatic sign-in failed.");
        setIsSubmitting(false);
        return;
      }

      router.push(signInResult.url || callbackUrl);
      router.refresh();
    } catch {
      setError("Unexpected error while creating account.");
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="register-name">
          Name
        </label>
        <Input
          id="register-name"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={isSubmitting}
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="register-email">
          Email
        </label>
        <Input
          id="register-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={isSubmitting}
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="register-team">
          Team
        </label>
        <select
          id="register-team"
          value={teamId}
          onChange={(event) => setTeamId(event.target.value)}
          disabled={isSubmitting || isLoadingTeams}
          required
          className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">
            {isLoadingTeams ? "Loading teams..." : "Select team"}
          </option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="register-password">
          Password
        </label>
        <Input
          id="register-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={isSubmitting}
          required
        />
      </div>

      <div className="space-y-2">
        <label
          className="text-sm font-medium"
          htmlFor="register-confirm-password"
        >
          Confirm Password
        </label>
        <Input
          id="register-confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          disabled={isSubmitting}
          required
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button
        className="w-full"
        type="submit"
        disabled={isSubmitting || isLoadingTeams}
      >
        {isSubmitting ? "Creating Account..." : "Create Account"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          className="text-foreground underline underline-offset-4"
          href="/login"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
