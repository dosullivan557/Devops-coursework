import { query } from "@/app/lib/db";
import { ensurePlatformSchema } from "@/app/lib/platform-schema";

export const dynamic = "force-dynamic";

type PlatformRow = {
  id: number;
  name: string;
  description: string | null;
  teams: number;
  changes: number;
};

type InsertPlatformRow = {
  id: number;
  name: string;
  description: string | null;
};

export const GET = async () => {
  try {
    await ensurePlatformSchema();

    const rows = await query<PlatformRow>(`
      SELECT
        p.id,
        p.name,
        p.description,
        COUNT(DISTINCT t.id)::int AS teams,
        COUNT(c.id)::int AS changes
      FROM platform p
      LEFT JOIN teams t ON t.platform_id = p.id
      LEFT JOIN changes c ON c.team_id = t.id
      GROUP BY p.id
      ORDER BY p.name ASC
    `);

    return Response.json(rows);
  } catch (error) {
    console.error("Failed to fetch platforms:", error);
    return Response.json(
      { error: "Failed to fetch platforms" },
      { status: 500 },
    );
  }
};

export const POST = async (request: Request) => {
  try {
    await ensurePlatformSchema();

    const body = (await request.json()) as {
      name?: string;
      description?: string | null;
    };

    const name = body.name?.trim();
    const description = body.description?.trim() || null;

    if (!name) {
      return Response.json(
        { error: "Platform name is required" },
        { status: 400 },
      );
    }

    const [platform] = await query<InsertPlatformRow>(
      `
      INSERT INTO platform (name, description)
      VALUES ($1, $2)
      RETURNING id, name, description
    `,
      [name, description],
    );

    return Response.json(platform, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) {
      const pgError = error as { code?: string };
      if (pgError.code === "23505") {
        return Response.json(
          { error: "A platform with this name already exists" },
          { status: 409 },
        );
      }
    }

    console.error("Failed to create platform:", error);
    return Response.json(
      { error: "Failed to create platform" },
      { status: 500 },
    );
  }
};
