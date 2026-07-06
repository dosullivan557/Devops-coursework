import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/lib/auth";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/app/login/login-form";

export const metadata = {
  title: "Login",
  description: "Sign in to the Change Audit Workspace",
};

const LoginPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) => {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/");
  }

  const { callbackUrl = "/", error } = await searchParams;

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-20 md:px-6">
        <div className="grid w-full gap-10 lg:grid-cols-[1.2fr_420px] lg:items-center">
          <div className="space-y-4">
            <Badge variant="secondary">Secure Access</Badge>
            <h1 className="font-heading text-4xl md:text-5xl">
              Sign in to the Change Audit Workspace
            </h1>
            <p className="max-w-2xl text-muted-foreground">
              Access team ownership, change workflows, and request history from
              a single authenticated workspace.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Login</CardTitle>
              <CardDescription>
                Use the email and password stored in the users table.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LoginForm callbackUrl={callbackUrl} initialError={error} />
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
};

export default LoginPage;
