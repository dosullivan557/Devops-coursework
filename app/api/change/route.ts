import { query } from "@/app/lib/db";
import { ensurePlatformSchema } from "@/app/lib/platform-schema";

export const dynamic = "force-dynamic";

type ChangeSchemaRow = {
  hasTitle: boolean;
  hasChangeType: boolean;
  hasChgNumber: boolean;
  hasUserId: boolean;
  usersExists: boolean;
};

type ChangeRow = {
  id: number;
  teamId: number;
  changeNumber: string | null;
  title: string;
  description: string | null;
  requester: string;
  status: string;
  createdAt: string;
};

type InsertChangeRow = {
  id: number;
  teamId: number;
  changeNumber: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: string;
};

const getChangeSchema = async () => {
  const [schema] = await query<ChangeSchemaRow>(`
    SELECT
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'changes'
          AND column_name = 'title'
      ) AS "hasTitle",
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'changes'
          AND column_name = 'change_type'
      ) AS "hasChangeType",
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'changes'
          AND column_name = 'chg_number'
      ) AS "hasChgNumber",
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'changes'
          AND column_name = 'user_id'
      ) AS "hasUserId",
      to_regclass('public.users') IS NOT NULL AS "usersExists"
  `);

  return schema;
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

    const schema = await getChangeSchema();

    const titleExpr = schema?.hasTitle
      ? "c.title"
      : schema?.hasChangeType
        ? "c.change_type"
        : "'Untitled change'";
    const includeUsersJoin = Boolean(schema?.usersExists && schema?.hasUserId);
    const usersJoin = includeUsersJoin
      ? "LEFT JOIN users u ON u.id = c.user_id"
      : "";
    const requesterExpr = includeUsersJoin
      ? "COALESCE(u.name, t.name, 'Unknown')"
      : "COALESCE(t.name, 'Unknown')";

    const rows = await query<ChangeRow>(
      `
      SELECT
        c.id,
        c.team_id AS "teamId",
        ${
          schema?.hasChgNumber ? "c.chg_number::text" : "NULL::text"
        } AS "changeNumber",
        ${titleExpr} AS title,
        c.description,
        ${requesterExpr} AS requester,
        c.status,
        c.created_at::text AS "createdAt"
      FROM changes c
      LEFT JOIN teams t ON t.id = c.team_id
      ${usersJoin}
      ${hasPlatformFilter ? "WHERE t.platform_id = $1" : ""}
      ORDER BY c.created_at DESC, c.id DESC
    `,
      hasPlatformFilter ? [parsedPlatformId] : [],
    );

    return Response.json(rows);
  } catch (error) {
    console.error("Failed to fetch changes:", error);
    return Response.json(
      { error: "Failed to fetch change requests" },
      { status: 500 },
    );
  }
};

export const POST = async (request: Request) => {
  try {
    const body = (await request.json()) as {
      teamId?: number | string;
      changeNumber?: string;
      title?: string;
      description?: string | null;
      status?: string;
    };

    const teamId = Number(body.teamId);
    const changeNumber = body.changeNumber?.trim();
    const title = body.title?.trim();
    const description = body.description?.trim() || null;
    const normalizedRawStatus = body.status?.trim().toLowerCase() || "pending";
    const status =
      normalizedRawStatus === "rolled_back"
        ? "rolled back"
        : normalizedRawStatus;

    if (!Number.isInteger(teamId) || teamId <= 0) {
      return Response.json(
        { error: "A valid team is required" },
        { status: 400 },
      );
    }

    if (!title) {
      return Response.json(
        { error: "Change request title is required" },
        { status: 400 },
      );
    }

    if (!changeNumber) {
      return Response.json(
        { error: "Change number is required" },
        { status: 400 },
      );
    }

    if (
      !["pending", "approved", "complete", "rejected", "rolled back"].includes(
        status,
      )
    ) {
      return Response.json(
        {
          error:
            "Status must be pending, approved, complete, rejected, or rolled back",
        },
        { status: 400 },
      );
    }

    const schema = await getChangeSchema();
    const titleColumn = schema?.hasTitle
      ? "title"
      : schema?.hasChangeType
        ? "change_type"
        : null;

    if (!titleColumn) {
      return Response.json(
        { error: "Changes table does not support a title column" },
        { status: 500 },
      );
    }
    if (!schema?.hasChgNumber) {
      return Response.json(
        {
          error:
            "Changes table is missing chg_number. Run: ALTER TABLE changes ADD COLUMN IF NOT EXISTS chg_number VARCHAR(100) UNIQUE;",
        },
        { status: 500 },
      );
    }

    const [newChange] = await query<InsertChangeRow>(
      `
      INSERT INTO changes (team_id, chg_number, ${titleColumn}, description, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id,
        team_id AS "teamId",
        chg_number::text AS "changeNumber",
        ${titleColumn} AS title,
        description,
        status,
        created_at::text AS "createdAt"
    `,
      [teamId, changeNumber, title, description, status],
    );

    return Response.json(newChange, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) {
      const pgError = error as { code?: string };
      if (pgError.code === "23503") {
        return Response.json(
          { error: "Selected team was not found" },
          { status: 400 },
        );
      }
      if (pgError.code === "23505") {
        return Response.json(
          { error: "Change number already exists" },
          { status: 409 },
        );
      }
    }

    console.error("Failed to create change request:", error);
    return Response.json(
      { error: "Failed to create change request" },
      { status: 500 },
    );
  }
};
