export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "test",
        "refactor",
        "ci",
        "chore",
        "perf",
        "style",
        "build",
        "revert",
      ],
    ],
    "subject-case": [0],
    "body-max-line-length": [0],
  },
};
