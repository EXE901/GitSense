import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Segment isolation: dashboards and operational surfaces must stay
  // free of marketing-only motion engines.
  {
    files: [
      "src/app/(app)/**/*.{ts,tsx}",
      "src/components/dashboard/**/*.{ts,tsx}",
      "src/components/topbar/**/*.{ts,tsx}",
      "src/components/settings/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "lenis",
              message:
                "Lenis is restricted to landing/auth segments. Dashboards must use native scroll.",
            },
            {
              name: "framer-motion",
              message:
                "Framer Motion is reserved for landing/auth cinematic surfaces. Use CSS + IO primitives on dashboards.",
            },
            {
              name: "motion",
              message:
                "Motion One is reserved for landing/auth cinematic surfaces. Use CSS + IO primitives on dashboards.",
            },
            {
              name: "@/components/motion/lenis-provider",
              message:
                "LenisProvider must not be imported from operational/dashboard surfaces.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
