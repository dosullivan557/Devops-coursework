import { Pool, type QueryResultRow } from "pg";

declare global {
  var pgPool: Pool | undefined;
}

let pool: Pool | undefined;

type PoolConfig = {
  connectionString: string;
  ssl?: {
    rejectUnauthorized: boolean;
  };
};

type DatabaseSecret = {
  DATABASE_URL?: unknown;
  connectionString?: unknown;
  url?: unknown;
  username?: unknown;
  user?: unknown;
  password?: unknown;
  host?: unknown;
  port?: unknown;
  dbname?: unknown;
  database?: unknown;
};

const parseDatabaseSecret = (rawConnectionString: string) => {
  try {
    return JSON.parse(rawConnectionString) as DatabaseSecret;
  } catch {
    const [firstJsonObject] = rawConnectionString.match(/\{[^{}]*\}/) ?? [];

    if (!firstJsonObject) {
      return undefined;
    }

    try {
      return JSON.parse(firstJsonObject) as DatabaseSecret;
    } catch {
      return undefined;
    }
  }
};

const buildConnectionString = (secret: DatabaseSecret) => {
  const host = typeof secret.host === "string" ? secret.host : undefined;
  const username =
    typeof secret.username === "string"
      ? secret.username
      : typeof secret.user === "string"
        ? secret.user
        : undefined;
  const password =
    typeof secret.password === "string" ? secret.password : undefined;
  const database =
    typeof secret.dbname === "string"
      ? secret.dbname
      : typeof secret.database === "string"
        ? secret.database
        : undefined;

  if (!host || !username || !password || !database) {
    return undefined;
  }

  const port = typeof secret.port === "number" ? secret.port : 5432;

  return `postgresql://${encodeURIComponent(username)}:${encodeURIComponent(
    password,
  )}@${host}:${port}/${encodeURIComponent(database)}`;
};

const encodeConnectionStringComponent = (value: string) => {
  try {
    return encodeURIComponent(decodeURIComponent(value));
  } catch {
    return encodeURIComponent(value);
  }
};

const normalizePostgresConnectionString = (connectionString: string) => {
  if (!/^postgres(?:ql)?:\/\//i.test(connectionString)) {
    return connectionString;
  }

  try {
    new URL(connectionString);
    return connectionString;
  } catch {
    const connectionUrlMatch = connectionString.match(
      /^(postgres(?:ql)?:\/\/)(.*)@([^/?#]+)(.*)$/i,
    );

    if (!connectionUrlMatch) {
      return connectionString;
    }

    const [, protocol, auth, host, suffix] = connectionUrlMatch;
    const separatorIndex = auth.indexOf(":");

    if (separatorIndex === -1) {
      return connectionString;
    }

    const username = auth.slice(0, separatorIndex);
    const password = auth.slice(separatorIndex + 1);

    return `${protocol}${encodeConnectionStringComponent(
      username,
    )}:${encodeConnectionStringComponent(password)}@${host}${suffix}`;
  }
};

const getConnectionString = () => {
  const rawConnectionString = process.env.DATABASE_URL;

  if (!rawConnectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const secret = parseDatabaseSecret(rawConnectionString);

  if (secret) {
    const nestedConnectionString =
      typeof secret.DATABASE_URL === "string"
        ? secret.DATABASE_URL
        : typeof secret.connectionString === "string"
          ? secret.connectionString
          : typeof secret.url === "string"
            ? secret.url
            : buildConnectionString(secret);

    if (nestedConnectionString) {
      return normalizePostgresConnectionString(nestedConnectionString);
    }
  }

  // Not JSON, so use DATABASE_URL as a normal Postgres connection string.
  return normalizePostgresConnectionString(rawConnectionString);
};

const getDatabaseHost = () => {
  const connectionString = getConnectionString();

  try {
    return new URL(connectionString).hostname;
  } catch {
    const hostMatch = connectionString.match(
      /(?:^|\s)host=("[^"]+"|'[^']+'|\S+)/,
    );
    if (hostMatch?.[1]) {
      return hostMatch[1].replace(/^['"]|['"]$/g, "");
    }

    return "unparseable DATABASE_URL";
  }
};

const redactConnectionString = (connectionString: string) => {
  try {
    const url = new URL(connectionString);

    if (url.password) {
      url.password = "*****";
    }

    return url.toString();
  } catch {
    return connectionString.replace(
      /(postgres(?:ql)?:\/\/[^:\s]+:)([^@\s]+)(@)/i,
      "$1*****$3",
    );
  }
};

const getPool = () => {
  const existingPool = globalThis.pgPool ?? pool;

  if (existingPool) {
    return existingPool;
  }

  const connectionString = getConnectionString();
  const { NODE_ENV } = process.env;
  const isProduction = NODE_ENV === "production";
  const poolConfig: PoolConfig = {
    connectionString,
  };

  if (isProduction) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }
  pool = new Pool(poolConfig);

  if (process.env.NODE_ENV !== "production") {
    globalThis.pgPool = pool;
  }

  return pool;
};

export const query = async <T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> => {
  try {
    const result = await getPool().query<T>(text, params);
    return result.rows;
  } catch (error) {
    const connectionString = getConnectionString();

    console.error("Database query failed", {
      databaseHost: getDatabaseHost(),
      databaseUrl: redactConnectionString(connectionString),
      error,
    });
    throw error;
  }
};
