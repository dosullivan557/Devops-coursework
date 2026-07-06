import { query } from "@/app/lib/db";

export const dynamic = "force-dynamic";

type ChangeSchemaRow = {
  hasChgNumber: boolean;
  hasUpdatedAt: boolean;
  hasTitle: boolean;
  hasChangeType: boolean;
};

type ExistingChangeRow = {
  id: number;
  status: string;
};

type UpdatedChangeRow = {
  id: number;
  changeNumber?: string | null;
  teamId?: number;
  title?: string;
  description?: string | null;
  status: string;
  updatedAt: string | null;
};

type TeamExistsRow = {
  exists: boolean;
};

const normalizeStatus = (value: string) => value.trim().toLowerCase();

const allowedTransitions: Record<string, string[]> = {
  pending: ["approved", "rejected"],
  approved: ["complete", "rejected", "rolled back"],
  complete: ["rolled back"],
  rejected: [],
  "rolled back": [],
};

export const PATCH = async (
  request: Request,
  { params }: { params: Promise<{ changeId: string }> },
) => {
  try {
    const { changeId } = await params;
    const parsedId = Number(changeId);
    const isNumericId = Number.isInteger(parsedId) && parsedId > 0;

    const [schema] = await query<ChangeSchemaRow>(`
      SELECT
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'changes'
            AND column_name = 'title'
        ) AS "hasTitle",
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'changes'
            AND column_name = 'change_type'
        ) AS "hasChangeType",
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'changes'
            AND column_name = 'chg_number'
        ) AS "hasChgNumber",
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'changes'
            AND column_name = 'updated_at'
        ) AS "hasUpdatedAt"
    `);

    const whereClause = isNumericId
      ? "id = $1"
      : schema?.hasChgNumber
        ? "LOWER(chg_number::text) = LOWER($1)"
        : "";

    if (!whereClause) {
      return Response.json(
        { error: "Change request not found" },
        { status: 404 },
      );
    }

    const body = (await request.json()) as { status?: string };
    const requestedStatusRaw = body.status?.trim().toLowerCase();
    const requestedStatus =
      requestedStatusRaw === "rolled_back"
        ? "rolled back"
        : requestedStatusRaw || "";

    if (!requestedStatus || !(requestedStatus in allowedTransitions)) {
      return Response.json(
        { error: "Invalid target status for transition" },
        { status: 400 },
      );
    }

    const [existing] = await query<ExistingChangeRow>(
      `SELECT id, status FROM changes WHERE ${whereClause}`,
      [isNumericId ? parsedId : changeId],
    );

    if (!existing) {
      return Response.json(
        { error: "Change request not found" },
        { status: 404 },
      );
    }

    const currentStatus = normalizeStatus(existing.status);
    const allowedNext = allowedTransitions[currentStatus] || [];

    if (!allowedNext.includes(requestedStatus)) {
      return Response.json(
        {
          error: `Invalid transition from ${currentStatus} to ${requestedStatus}`,
        },
        { status: 400 },
      );
    }

    const [updated] = await query<UpdatedChangeRow>(
      `
      UPDATE changes
      SET
        status = $2
        ${schema?.hasUpdatedAt ? ", updated_at = CURRENT_TIMESTAMP" : ""}
      WHERE ${whereClause}
      RETURNING
        id,
        status,
        ${schema?.hasUpdatedAt ? "updated_at::text" : "NULL::text"} AS "updatedAt"
    `,
      [isNumericId ? parsedId : changeId, requestedStatus],
    );

    return Response.json(updated);
  } catch (error) {
    console.error("Failed to transition change request:", error);
    return Response.json(
      { error: "Failed to transition change request" },
      { status: 500 },
    );
  }
};

export const PUT = async (
  request: Request,
  { params }: { params: Promise<{ changeId: string }> },
) => {
  try {
    const { changeId } = await params;
    const parsedId = Number(changeId);
    const isNumericId = Number.isInteger(parsedId) && parsedId > 0;

    const [schema] = await query<ChangeSchemaRow>(`
      SELECT
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'changes'
            AND column_name = 'title'
        ) AS "hasTitle",
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'changes'
            AND column_name = 'change_type'
        ) AS "hasChangeType",
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'changes'
            AND column_name = 'chg_number'
        ) AS "hasChgNumber",
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'changes'
            AND column_name = 'updated_at'
        ) AS "hasUpdatedAt"
    `);

    const whereClause = isNumericId
      ? "id = $1"
      : schema?.hasChgNumber
        ? "LOWER(chg_number::text) = LOWER($1)"
        : "";

    if (!whereClause) {
      return Response.json(
        { error: "Change request not found" },
        { status: 404 },
      );
    }

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
    const normalizedStatusRaw = body.status?.trim().toLowerCase() || "pending";
    const status =
      normalizedStatusRaw === "rolled_back"
        ? "rolled back"
        : normalizedStatusRaw;

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

    const [updated] = await query<UpdatedChangeRow>(
      `
      UPDATE changes
      SET
        team_id = $2,
        chg_number = $3,
        ${titleColumn} = $4,
        description = $5,
        status = $6
        ${schema?.hasUpdatedAt ? ", updated_at = CURRENT_TIMESTAMP" : ""}
      WHERE ${whereClause}
      RETURNING
        id,
        team_id AS "teamId",
        chg_number::text AS "changeNumber",
        ${titleColumn} AS title,
        description,
        status,
        ${schema?.hasUpdatedAt ? "updated_at::text" : "NULL::text"} AS "updatedAt"
    `,
      [
        isNumericId ? parsedId : changeId,
        teamId,
        changeNumber,
        title,
        description,
        status,
      ],
    );

    if (!updated) {
      return Response.json(
        { error: "Change request not found" },
        { status: 404 },
      );
    }

    return Response.json(updated);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) {
      const pgError = error as { code?: string };
      if (pgError.code === "23505") {
        return Response.json(
          { error: "Change number already exists" },
          { status: 409 },
        );
      }
      if (pgError.code === "23503") {
        return Response.json(
          { error: "Selected team was not found" },
          { status: 400 },
        );
      }
    }

    console.error("Failed to update change request:", error);
    return Response.json(
      { error: "Failed to update change request" },
      { status: 500 },
    );
  }
};
