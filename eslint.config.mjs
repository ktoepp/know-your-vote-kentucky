import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**", "public/**", "design-system/**", "next-env.d.ts"],
  },
  ...nextCoreWebVitals,
  {
    // eslint-config-next 16 bundles eslint-plugin-react-hooks 7, whose React Compiler rules did not
    // exist in the Next 15 rule set. WS2-11c keeps the rule set unchanged, so they stay off here.
    // Adopting them is a separate decision: on 2026-11-25 they reported 40 set-state-in-effect,
    // 7 refs, 3 immutability, 2 preserve-manual-memoization and 1 static-components finding.
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/immutability": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/static-components": "off",
    },
  },
];

export default eslintConfig;
