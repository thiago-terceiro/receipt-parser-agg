import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
    reactStrictMode: true,
    turbopack: {
        root: projectRoot,
    },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
