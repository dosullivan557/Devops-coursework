import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import Link from "next/link";
import { ArrowRight, Layers, ListChecks } from "lucide-react";

import { authOptions } from "@/app/lib/auth";
import { LoginForm } from "@/app/login/login-form";
import { RegisterForm } from "@/app/register/register-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreatePlatformModal } from "@/app/create-platform-modal";

export const metadata = {
  title: "Home",
  description: "Welcome to the Cloud Change Platform",
};

type Platform = {
  id: number;
  name: string;
  description: string | null;
  teams: number;
  changes: number;
};

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <main className="min-h-screen bg-background">
        <section className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-20 md:px-6">
          <div className="grid w-full gap-10 lg:grid-cols-[1.2fr_minmax(0,420px)_minmax(0,420px)] lg:items-start">
            <div className="space-y-4">
              <Badge variant="secondary">Cloud Change Platform</Badge>
              <h1 className="font-heading text-4xl leading-tight md:text-5xl">
                Change Audit Workspace
              </h1>
              <p className="max-w-2xl text-muted-foreground">
                Track teams, platforms, and cloud change requests from one
                place. Sign in to continue, or create an account if you are new
                to the workspace.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Login</CardTitle>
                <CardDescription>
                  Sign in with the email and password stored for your account.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LoginForm callbackUrl="/" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Register</CardTitle>
                <CardDescription>
                  Create an account and connect it to the right team.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RegisterForm callbackUrl="/" />
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    );
  }

  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";

  if (!host) {
    throw new Error("Unable to determine host for platform API request");
  }

  const platformResponse = await fetch(`${protocol}://${host}/api/platforms`, {
    cache: "no-store",
  });

  if (!platformResponse.ok) {
    throw new Error("Failed to fetch platforms");
  }

  const platforms = (await platformResponse.json()) as Platform[];

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-20 md:px-6">
        <div className="space-y-4">
          <Badge variant="secondary">Cloud Change Platform</Badge>
          <h1 className="font-heading text-4xl leading-tight md:text-5xl">
            Change Audit Workspace
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Organize your cloud estate by platform, then drill into the teams
            and change requests that belong to each one.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <CreatePlatformModal />
          <Button asChild size="lg" variant="outline">
            <Link href="/teams">All Teams</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/change">All Change Requests</Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {platforms.map((platform) => (
            <Link key={platform.id} href={`/platforms/${platform.id}`}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>{platform.name}</CardTitle>
                  <CardDescription>
                    {platform.description || "No description available."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Teams</span>
                    <span className="font-medium">{platform.teams}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Changes</span>
                    <span className="font-medium">{platform.changes}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    Open Platform
                    <ArrowRight className="size-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {platforms.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Platforms Yet</CardTitle>
              <CardDescription>
                Create a platform to start organizing teams and change requests.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="size-4" />
                Platform Changes
              </CardTitle>
              <CardDescription>
                Browse every change request across your platforms when you need
                a global view.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="secondary">
                <Link href="/change">Open Global Changes</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="size-4" />
                Platform Teams
              </CardTitle>
              <CardDescription>
                Jump to the full team directory when you want to compare teams
                across platforms.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="secondary">
                <Link href="/teams">Open Global Teams</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
