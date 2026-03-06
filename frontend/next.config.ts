import type { NextConfig } from "next";

type SvgRule = {
  test?: { test: (value: string) => boolean };
  issuer?: unknown;
  resourceQuery?: { not?: unknown[] };
  exclude?: RegExp;
};

function isRuleWithTest(rule: unknown): rule is SvgRule & { test: { test: (value: string) => boolean } } {
  if (!rule || typeof rule !== "object" || !("test" in rule)) {
    return false;
  }

  const testCandidate = (rule as { test?: unknown }).test;
  return (
    !!testCandidate &&
    typeof testCandidate === "object" &&
    "test" in testCandidate &&
    typeof (testCandidate as { test?: unknown }).test === "function"
  );
}

function getResourceQueryNot(rule: SvgRule | undefined): unknown[] {
  if (!rule?.resourceQuery || typeof rule.resourceQuery !== "object") {
    return [];
  }

  return Array.isArray(rule.resourceQuery.not) ? rule.resourceQuery.not : [];
}

const nextConfig: NextConfig = {
  reactStrictMode: true,


  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
  webpack(config) {
    const fileLoaderRule = config.module.rules.find((rule: unknown): rule is SvgRule =>
      isRuleWithTest(rule) ? rule.test.test(".svg") : false,
    );

    config.module.rules.push(
      {
        ...fileLoaderRule,
        test: /\.svg$/i,
        resourceQuery: /url/,
      },
      {
        test: /\.svg$/i,
        issuer: fileLoaderRule?.issuer,
        resourceQuery: {
          not: [...getResourceQueryNot(fileLoaderRule), /url/],
        },
        use: ["@svgr/webpack"],
      },
    );

    if (fileLoaderRule) {
      fileLoaderRule.exclude = /\.svg$/i;
    }

    return config;
  },
};

export default nextConfig;
