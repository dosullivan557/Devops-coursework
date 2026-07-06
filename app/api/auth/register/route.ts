import { query } from "@/app/lib/db";
import { createPasswordHash } from "@/app/lib/password";
import { ensureUserAuthSchema } from "@/app/lib/user-auth-schema";

export const dynamic = "force-dynamic";

type TeamExistsRow = {
  exists: boolean;
};

type InsertUserRow = {
  id: number;
  teamId: number;
  name: string;
  email: string;
};

export const POST = async (request: Request) => {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
      teamId?: string | number;
    };

    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";
    const teamId = Number(body.teamId);

    if (!name) {
      return Response.json({ error: "Name is required" }, { status: 400 });
    }

    if (!email) {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    if (password.length < 8) {
      return Response.json(
        { error: "Password must be at least 8 characters" },
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
      return Response.json(
        { error: "Selected team was not found" },
        { status: 400 },
      );
    }

    await ensureUserAuthSchema();

    const { passwordHash, salt } = createPasswordHash(password);

    const [newUser] = await query<InsertUserRow>(
      `
      INSERT INTO users (team_id, name, email, password_hash, salt)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, team_id AS "teamId", name, email
    `,
      [teamId, name, email, passwordHash, salt],
    );

    return Response.json(newUser, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) {
      const pgError = error as { code?: string };
      if (pgError.code === "23505") {
        return Response.json(
          { error: "An account with this email already exists" },
          { status: 409 },
        );
      }
    }

    console.error("Failed to register user:", error);
    return Response.json({ error: "Failed to register user" }, { status: 500 });
  }
};
