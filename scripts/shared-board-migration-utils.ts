import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Redis } from "@upstash/redis";

const prefixedEnvPrefixes = ["receipt_agg_", "RECEIPT_AGG_"] as const;
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDirectory, "..");

export const DEFAULT_BOARD_NAME = "My groceries";

const namespaces = ["groceries", "receipt-extractions"] as const;

type StorageNamespace = (typeof namespaces)[number];
type StorageSourceKind = "userId" | "email";

type ProfileLookupRecord = {
  id: string;
};

type ExistingBoardRecord = {
  id: string;
};

type CreatedBoardRecord = {
  id: string;
};

export type ParsedStorageKey = {
  key: string;
  month: string;
  namespace: StorageNamespace;
  sourceKind: StorageSourceKind;
  token: string;
};

export type ResolvedStorageRecord = ParsedStorageKey & {
  email: string | null;
  userId: string;
};

type JsonObject = Record<string, unknown>;

const stripWrappingQuotes = (value: string) => {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
};

const parseEnvLine = (line: string) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const equalsIndex = trimmed.indexOf("=");
  if (equalsIndex <= 0) {
    return null;
  }

  const key = trimmed.slice(0, equalsIndex).trim();
  const rawValue = trimmed.slice(equalsIndex + 1).trim();
  if (!key) {
    return null;
  }

  return {
    key,
    value: stripWrappingQuotes(rawValue),
  };
};

const loadEnvFileIfPresent = (filePath: string) => {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (!parsed || process.env[parsed.key]) {
      continue;
    }

    process.env[parsed.key] = parsed.value;
  }
};

const loadScriptEnv = () => {
  loadEnvFileIfPresent(path.join(frontendRoot, ".env.local"));
  loadEnvFileIfPresent(path.join(frontendRoot, ".env"));
};

loadScriptEnv();

export const resolveEnvValue = (names: readonly string[]) => {
  const candidates = [
    ...names,
    ...prefixedEnvPrefixes.flatMap((prefix) =>
      names.map((name) => `${prefix}${name}`),
    ),
  ];

  for (const name of candidates) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }

  return null;
};

export const createRedisClientOrThrow = () => {
  const url = resolveEnvValue(["UPSTASH_REDIS_REST_URL", "KV_REST_API_URL"]);
  const token = resolveEnvValue([
    "UPSTASH_REDIS_REST_TOKEN",
    "KV_REST_API_TOKEN",
  ]);

  if (!url || !token) {
    throw new Error(
      "Redis migration requires UPSTASH_REDIS_REST_URL or KV_REST_API_URL and UPSTASH_REDIS_REST_TOKEN or KV_REST_API_TOKEN.",
    );
  }

  return new Redis({
    url,
    token,
    automaticDeserialization: false,
  });
};

export const createSupabaseAdminClientOrThrow = () => {
  const url = resolveEnvValue(["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"]);
  const serviceRoleKey = resolveEnvValue(["SUPABASE_SERVICE_ROLE_KEY"]);

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Redis migration requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

export const parseStorageKey = (key: string): ParsedStorageKey | null => {
  for (const namespace of namespaces) {
    const userIdMatch = key.match(
      new RegExp(`^${namespace}:uid:(.+):(\\d{4}-\\d{2})$`),
    );

    if (userIdMatch) {
      return {
        key,
        month: userIdMatch[2],
        namespace,
        sourceKind: "userId",
        token: userIdMatch[1],
      };
    }

    const emailMatch = key.match(
      new RegExp(`^${namespace}:(?!uid:)(.+):(\\d{4}-\\d{2})$`),
    );

    if (emailMatch) {
      return {
        key,
        month: emailMatch[2],
        namespace,
        sourceKind: "email",
        token: emailMatch[1].toLowerCase(),
      };
    }
  }

  return null;
};

export const scanAllKeys = async (redis: Redis, match: string) => {
  let cursor = "0";
  const keys: string[] = [];

  do {
    const [nextCursor, batch] = await redis.scan(cursor, {
      match,
      count: 200,
    });
    cursor = nextCursor;
    keys.push(...(batch as string[]));
  } while (cursor !== "0");

  return keys.sort();
};

export const parseRedisList = async (redis: Redis, key: string) => {
  const items = (await redis.lrange(key, 0, -1)) as string[];
  const parsed: JsonObject[] = [];

  for (const item of items) {
    try {
      parsed.push(JSON.parse(item) as JsonObject);
    } catch (error) {
      console.warn(`Skipping malformed Redis entry in ${key}.`, error);
    }
  }

  return parsed;
};

const resolveUserIdForRecord = async (
  supabase: SupabaseClient,
  record: ParsedStorageKey,
  cache: Map<string, string | null>,
) => {
  const cacheKey = `${record.sourceKind}:${record.token}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey) ?? null;
  }

  if (record.sourceKind === "userId") {
    cache.set(cacheKey, record.token);
    return record.token;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", record.token)
    .maybeSingle<ProfileLookupRecord>();

  if (error) {
    throw new Error(
      error.message || `Unable to resolve profile for ${record.token}.`,
    );
  }

  const resolvedUserId = data?.id ?? null;
  cache.set(cacheKey, resolvedUserId);
  return resolvedUserId;
};

export const collectResolvedStorageRecords = async (
  redis: Redis,
  supabase: SupabaseClient,
) => {
  const rawKeys: string[] = [];
  const userIdCache = new Map<string, string | null>();

  for (const namespace of namespaces) {
    const keys = await scanAllKeys(redis, `${namespace}*`);
    rawKeys.push(...keys);
  }

  const selected = new Map<string, ResolvedStorageRecord>();
  const unresolved: ParsedStorageKey[] = [];

  for (const key of rawKeys) {
    const parsed = parseStorageKey(key);
    if (!parsed) {
      continue;
    }

    const userId = await resolveUserIdForRecord(supabase, parsed, userIdCache);
    if (!userId) {
      unresolved.push(parsed);
      continue;
    }

    const selectedKey = `${parsed.namespace}:${userId}:${parsed.month}`;
    const nextRecord: ResolvedStorageRecord = {
      ...parsed,
      email: parsed.sourceKind === "email" ? parsed.token : null,
      userId,
    };
    const current = selected.get(selectedKey);

    if (
      !current ||
      (current.sourceKind === "email" && parsed.sourceKind === "userId")
    ) {
      selected.set(selectedKey, nextRecord);
    }
  }

  return {
    records: Array.from(selected.values()).sort((left, right) =>
      `${left.userId}:${left.namespace}:${left.month}`.localeCompare(
        `${right.userId}:${right.namespace}:${right.month}`,
      ),
    ),
    unresolved,
  };
};

export const ensureProfile = async (
  supabase: SupabaseClient,
  userId: string,
  email: string | null = null,
) => {
  const payload: { id: string; email?: string } = {
    id: userId,
  };

  if (email !== null) {
    payload.email = email;
  }

  const { error } = await supabase.from("profiles").upsert(payload, {
    ignoreDuplicates: email === null,
    onConflict: "id",
  });

  if (error) {
    throw new Error(error.message || `Unable to ensure profile ${userId}.`);
  }
};

export const ensureOwnerBoard = async (
  supabase: SupabaseClient,
  userId: string,
  cache: Map<string, string>,
) => {
  if (cache.has(userId)) {
    return cache.get(userId) as string;
  }

  const { data: existingBoard, error: existingBoardError } = await supabase
    .from("boards")
    .select("id")
    .eq("owner_user_id", userId)
    .is("archived_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<ExistingBoardRecord>();

  if (existingBoardError) {
    throw new Error(
      existingBoardError.message || `Unable to load boards for ${userId}.`,
    );
  }

  if (existingBoard?.id) {
    cache.set(userId, existingBoard.id);
    return existingBoard.id;
  }

  const { data: createdBoard, error: createError } = await supabase
    .rpc("create_board_for_user", {
      p_name: DEFAULT_BOARD_NAME,
      p_user_id: userId,
    })
    .single<CreatedBoardRecord>();

  if (createError || !createdBoard?.id) {
    throw new Error(
      createError?.message || `Unable to create board for ${userId}.`,
    );
  }

  cache.set(userId, createdBoard.id);
  return createdBoard.id;
};

export const chunk = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

export const getMonthRange = (monthKey: string) => {
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const nextMonthStart = new Date(Date.UTC(year, monthIndex + 1, 1));

  return {
    start: start.toISOString(),
    nextMonthStart: nextMonthStart.toISOString(),
  };
};

export const roundCurrency = (value: number | string | null | undefined) =>
  Number(Number(value || 0).toFixed(2));