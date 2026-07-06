import { query } from "@/app/lib/db";
import { ensurePlatformSchema } from "@/app/lib/platform-schema";

export const dynamic = "force-dynamic";

type TeamSchemaCheckRow = {
  usersExists: boolean;
};

type TeamRow = {
  id: number;
  name: string;
  description: string | null;
  members: number;
  platformId: number | null;
  platformName: string | null;
};

type InsertTeamRow = {
  id: number;
  name: string;
  description: string | null;
  platformId: number | null;
};

type PlatformExistsRow = {
  exists: boolean;
};

export const GET = async (request: Request) => {
  try {
    await ensurePlatformSchema();

    const { searchParams } = new URL(request.url);
    const platformIdParam = searchParams.get("platformId");
    const parsedPlatformId = platformIdParam ? Number(platformIdParam) : null;
    const hasPlatformFilter =
      parsedPlatformId !== null &&
      Number.isInteger(parsedPlatformId) &&
      parsedPlatformId > 0;

    const [schema] = await query<TeamSchemaCheckRow>(
      `SELECT to_regclass('public.users') IS NOT NULL AS "usersExists"`,
    );

    const rows = schema?.usersExists
      ? await query<TeamRow>(
          `
          SELECT
            t.id,
            t.name,
            t.description,
            t.platform_id AS "platformId",
            p.name AS "platformName",
            COUNT(u.id)::int AS members
          FROM teams t
          LEFT JOIN platform p ON p.id = t.platform_id
          LEFT JOIN users u ON u.team_id = t.id
          ${hasPlatformFilter ? "WHERE t.platform_id = $1" : ""}
          GROUP BY t.id, t.platform_id, p.name
          ORDER BY t.id ASC
        `,
          hasPlatformFilter ? [parsedPlatformId] : [],
        )
      : await query<TeamRow>(
          `
          SELECT
            t.id,
            t.name,
            t.description,
            t.platform_id AS "platformId",
            p.name AS "platformName",
            0::int AS members
          FROM teams t
          LEFT JOIN platform p ON p.id = t.platform_id
          ${hasPlatformFilter ? "WHERE t.platform_id = $1" : ""}
          ORDER BY t.id ASC
        `,
          hasPlatformFilter ? [parsedPlatformId] : [],
        );

    return Response.json(rows);
  } catch (error) {
    console.error("Failed to fetch teams:", error);
    return Response.json({ error: "Failed to fetch teams" }, { status: 500 });
  }
};

export const POST = async (request: Request) => {
  try {
    const body = (await request.json()) as {
      name?: string;
      description?: string | null;
      platformId?: number | string;
    };

    const name = body.name?.trim();
    const description = body.description?.trim() || null;
    const platformId = Number(body.platformId);

    if (!name) {
      return Response.json({ error: "Team name is required" }, { status: 400 });
    }

    if (!Number.isInteger(platformId) || platformId <= 0) {
      return Response.json(
        { error: "A valid platform is required" },
        { status: 400 },
      );
    }

    await ensurePlatformSchema();

    const [platformExists] = await query<PlatformExistsRow>(
      `SELECT EXISTS (SELECT 1 FROM platform WHERE id = $1) AS exists`,
      [platformId],
    );

    if (!platformExists?.exists) {
      return Response.json(
        { error: "Selected platform was not found" },
        { status: 400 },
      );
    }

    const [newTeam] = await query<InsertTeamRow>(
      `
      INSERT INTO teams (name, description, platform_id)
      VALUES ($1, $2, $3)
      RETURNING id, name, description, platform_id AS "platformId"
    `,
      [name, description, platformId],
    );

    return Response.json(newTeam, { status: 201 });
  } catch (error) {
    console.error("Failed to create team:", error);
    return Response.json({ error: "Failed to create team" }, { status: 500 });
  }
};
