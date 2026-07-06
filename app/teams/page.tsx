import { headers } from "next/headers";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateTeamModal } from "@/app/teams/create-team-modal";

export const dynamic = "force-dynamic";

type Team = {
  id: number;
  name: string;
  description: string | null;
  members: number;
  platformId: number | null;
  platformName: string | null;
};

const Teams = async () => {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";

  if (!host) {
    throw new Error("Unable to determine host for teams API request");
  }

  const teamsResponse = await fetch(`${protocol}://${host}/api/teams`, {
    cache: "no-store",
  });

  if (!teamsResponse.ok) {
    throw new Error("Failed to fetch teams");
  }

  const teams = (await teamsResponse.json()) as Team[];

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto w-full max-w-6xl space-y-8 px-4 py-20 md:px-6">
        <div className="space-y-3">
          <Badge variant="secondary">Teams</Badge>
          <h1 className="font-heading text-4xl md:text-5xl">
            Global Team Directory
          </h1>
          <p className="max-w-3xl text-muted-foreground">
            Compare teams across every platform and inspect the ownership model
            behind your change workflow.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Link key={team.id} href={`/teams/${team.id}`}>
              <Card key={team.id}>
                <CardHeader>
                  <CardTitle>{team.name}</CardTitle>
                  <CardDescription>
                    {team.description || "No description available."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {team.platformName ? (
                    <Badge className="mb-3" variant="secondary">
                      {team.platformName}
                    </Badge>
                  ) : null}
                  <Badge variant="outline">
                    {team.members} member{team.members === 1 ? "" : "s"}
                  </Badge>
                </CardContent>
                <CardFooter className="justify-between">
                  <span className="text-sm text-muted-foreground">
                    Team ID: {team.id}
                  </span>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>

        {teams.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Teams Yet</CardTitle>
              <CardDescription>
                Add rows to the `teams` table to see them appear here.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        <div className="flex items-center gap-3">
          <CreateTeamModal />
          <Button asChild variant="link">
            <Link href="/">Go to Platforms</Link>
          </Button>
          <Button asChild variant="link">
            <Link href="/change">Go to Change Requests</Link>
          </Button>
        </div>
      </section>
    </main>
  );
};
export default Teams;
