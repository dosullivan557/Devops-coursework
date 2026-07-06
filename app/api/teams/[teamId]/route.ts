import { query } from "@/app/lib/db";

export const dynamic = "force-dynamic";

type UpdatedTeamRow = {
  id: number;
  name: string;
  description: string | null;
};

export const PATCH = async (
  request: Request,
  { params }: { params: Promise<{ teamId: string }> },
) => {
  try {
    const { teamId } = await params;
    const parsedTeamId = Number(teamId);

    if (!Number.isInteger(parsedTeamId) || parsedTeamId <= 0) {
      return Response.json({ error: "Invalid team id" }, { status: 400 });
    }

    const body = (await request.json()) as {
      name?: string;
      description?: string | null;
    };

    const name = body.name?.trim();
    const description = body.description?.trim() || null;

    if (!name) {
      return Response.json({ error: "Team name is required" }, { status: 400 });
    }

    const [updatedTeam] = await query<UpdatedTeamRow>(
      `
      UPDATE teams
      SET name = $2, description = $3
      WHERE id = $1
      RETURNING id, name, description
    `,
      [parsedTeamId, name, description],
    );

    if (!updatedTeam) {
      return Response.json({ error: "Team not found" }, { status: 404 });
    }

    return Response.json(updatedTeam);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) {
      const pgError = error as { code?: string };
      if (pgError.code === "23505") {
        return Response.json(
          { error: "A team with this name already exists" },
          { status: 409 },
        );
      }
    }

    console.error("Failed to update team:", error);
    return Response.json({ error: "Failed to update team" }, { status: 500 });
  }
};
