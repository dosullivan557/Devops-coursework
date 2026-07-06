import { query } from "@/app/lib/db";

export const dynamic = "force-dynamic";

type TeamExistsRow = {
  exists: boolean;
};

type UpdatedUserRow = {
  id: number;
  teamId: number;
  name: string;
  email: string;
};

export const PATCH = async (
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) => {
  try {
    const { userId } = await params;
    const parsedUserId = Number(userId);

    if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
      return Response.json({ error: "Invalid user id" }, { status: 400 });
    }

    const body = (await request.json()) as {
      name?: string;
      email?: string;
      teamId?: number | string;
    };

    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const teamId = Number(body.teamId);

    if (!name) {
      return Response.json(
        { error: "Member name is required" },
        { status: 400 },
      );
    }

    if (!email) {
      return Response.json(
        { error: "Member email is required" },
        { status: 400 },
      );
    }

    if (!Number.isInteger(teamId) || teamId <= 0) {
      return Response.json(
        { error: "A valid team is required" },
        { status: 400 },
      );
    }

    const [teamExists] = await query<TeamExistsRow>(
      `SELECT EXISTS (SELECT 1 FROM teams WHERE id = $1) AS exists`,
      [teamId],
    );

    if (!teamExists?.exists) {
      return Response.json({ error: "Team not found" }, { status: 404 });
    }

    const [updatedUser] = await query<UpdatedUserRow>(
      `
      UPDATE users
      SET name = $2, email = $3, team_id = $4
      WHERE id = $1
      RETURNING id, team_id AS "teamId", name, email
    `,
      [parsedUserId, name, email, teamId],
    );

    if (!updatedUser) {
      return Response.json({ error: "Member not found" }, { status: 404 });
    }

    return Response.json(updatedUser);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) {
      const pgError = error as { code?: string };
      if (pgError.code === "23505") {
        return Response.json(
          { error: "A member with this email already exists" },
          { status: 409 },
        );
      }
    }

    console.error("Failed to update member:", error);
    return Response.json({ error: "Failed to update member" }, { status: 500 });
  }
};
