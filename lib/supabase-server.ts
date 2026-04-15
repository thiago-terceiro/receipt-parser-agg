import { createClient } from "@supabase/supabase-js";

const prefixedEnvPrefixes = ["receipt_agg_", "RECEIPT_AGG_"];

const resolveEnvValue = (names: readonly string[]) => {
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

const supabaseUrl = resolveEnvValue(["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"]);
const supabaseServiceRoleKey = resolveEnvValue(["SUPABASE_SERVICE_ROLE_KEY"]);

export const hasSupabaseServerConfig = Boolean(
    supabaseUrl && supabaseServiceRoleKey,
);

if (!hasSupabaseServerConfig && (supabaseUrl || supabaseServiceRoleKey)) {
    console.warn(
        "Supabase server access is disabled because the URL or service role key is missing.",
    );
}

export const getSupabaseServerClient = () => {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
        throw new Error(
            "Supabase server access is not configured. Define SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
        );
    }

    return createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
        global: {
            headers: {
                "X-Client-Info": "receipt-ai/shared-boards",
            },
        },
    });
};