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
import { RegisterForm } from "@/app/register/register-form";

export const metadata = {
  title: "Register",
  description: "Create an account for the Change Audit Workspace",
};

const RegisterPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) => {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/");
  }

  const { callbackUrl = "/" } = await searchParams;

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-20 md:px-6">
        <div className="grid w-full gap-10 lg:grid-cols-[1.2fr_420px] lg:items-center">
          <div className="space-y-4">
            <Badge variant="secondary">New Account</Badge>
            <h1 className="font-heading text-4xl md:text-5xl">
              Create your Change Audit Workspace account
            </h1>
            <p className="max-w-2xl text-muted-foreground">
              Register with your team so your requests and ownership stay tied
              to the right operational context.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Register</CardTitle>
              <CardDescription>
                Create an account with your name, team, and password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RegisterForm callbackUrl={callbackUrl} />
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
};

export default RegisterPage;
