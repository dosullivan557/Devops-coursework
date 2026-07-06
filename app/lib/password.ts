import {
  createHash,
  pbkdf2Sync,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "crypto";

export const createPasswordHash = (password: string) => {
  const salt = randomBytes(16).toString("hex");
  const passwordHash = scryptSync(password, salt, 64).toString("hex");

  return { salt, passwordHash };
};

const safeEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
};

const buildPasswordCandidates = (password: string, salt: string) => {
  const sha256PasswordSalt = createHash("sha256")
    .update(`${password}${salt}`)
    .digest("hex");
  const sha256SaltPassword = createHash("sha256")
    .update(`${salt}${password}`)
    .digest("hex");
  const pbkdf2Hex = pbkdf2Sync(password, salt, 100000, 64, "sha512").toString(
    "hex",
  );
  const pbkdf2Base64 = pbkdf2Sync(
    password,
    salt,
    100000,
    64,
    "sha512",
  ).toString("base64");
  const scryptHex = scryptSync(password, salt, 64).toString("hex");
  const scryptBase64 = scryptSync(password, salt, 64).toString("base64");

  return [
    password,
    sha256PasswordSalt,
    sha256SaltPassword,
    pbkdf2Hex,
    pbkdf2Base64,
    scryptHex,
    scryptBase64,
  ];
};

export const verifyPassword = (
  password: string,
  passwordHash: string,
  salt: string,
) => {
  return buildPasswordCandidates(password, salt).some((candidate) =>
    safeEqual(candidate, passwordHash),
  );
};
