import { query } from "@/app/lib/db";

export const dynamic = "force-dynamic";

type TeamExistsRow = {
  exists: boolean;
};

type InsertMemberRow = {
  id: number;
  teamId: number;
  name: string;
  email: string;
  createdAt: string;
};

export const POST = async (
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
      email?: string;
    };

    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();

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

    const [teamExists] = await query<TeamExistsRow>(
      `SELECT EXISTS (SELECT 1 FROM teams WHERE id = $1) AS exists`,
      [parsedTeamId],
    );

    if (!teamExists?.exists) {
      return Response.json({ error: "Team not found" }, { status: 404 });
    }

    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const [newMember] = await query<InsertMemberRow>(
      `
      INSERT INTO users (team_id, name, email)
      VALUES ($1, $2, $3)
      RETURNING
        id,
        team_id AS "teamId",
        name,
        email,
        created_at::text AS "createdAt"
    `,
      [parsedTeamId, name, email],
    );

    return Response.json(newMember, { status: 201 });
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

    console.error("Failed to create member:", error);
    return Response.json({ error: "Failed to create member" }, { status: 500 });
  }
};
