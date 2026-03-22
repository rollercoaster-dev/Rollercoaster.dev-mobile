#!/usr/bin/env bun

import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type PackageJson = {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

type InstallIssue = {
  packageName: string;
  packageDir: string;
  dependency: string;
  reason: string;
  target?: string;
};

const repoRoot = resolve(
  process.env.CHECK_INSTALL_ROOT ??
    resolve(dirname(fileURLToPath(import.meta.url)), ".."),
);
const workspaceRoots = ["apps", "packages"];

function readJson(path: string): PackageJson {
  return JSON.parse(readFileSync(path, "utf8")) as PackageJson;
}

function getPackageDirs(rootDir: string): string[] {
  return readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(rootDir, entry.name))
    .filter((dir) => existsSync(join(dir, "package.json")));
}

function getManifestPaths(): string[] {
  const manifests: string[] = [];
  const rootManifest = join(repoRoot, "package.json");

  if (existsSync(rootManifest)) {
    manifests.push(rootManifest);
  }

  for (const workspaceRoot of workspaceRoots) {
    const rootDir = join(repoRoot, workspaceRoot);
    if (!existsSync(rootDir)) continue;

    for (const packageDir of getPackageDirs(rootDir)) {
      manifests.push(join(packageDir, "package.json"));
    }
  }

  return manifests;
}

function getDependencyPath(packageDir: string, dependency: string): string {
  return join(packageDir, "node_modules", ...dependency.split("/"));
}

function inspectDependency(
  packageName: string,
  packageDir: string,
  dependency: string,
): InstallIssue | null {
  const dependencyPath = getDependencyPath(packageDir, dependency);

  let stat: ReturnType<typeof lstatSync>;

  try {
    stat = lstatSync(dependencyPath);
  } catch {
    return {
      packageName,
      packageDir,
      dependency,
      reason: "missing from node_modules",
    };
  }

  try {
    realpathSync(dependencyPath);
  } catch {
    const issue: InstallIssue = {
      packageName,
      packageDir,
      dependency,
      reason: "symlink target is missing",
    };

    if (stat.isSymbolicLink()) {
      try {
        issue.target = readlinkSync(dependencyPath);
      } catch {
        // Ignore secondary fs errors; the missing target is enough signal.
      }
    }

    return issue;
  }

  return null;
}

const issues: InstallIssue[] = [];

for (const manifestPath of getManifestPaths()) {
  const packageDir = dirname(manifestPath);
  const manifest = readJson(manifestPath);
  const packageName = manifest.name ?? packageDir.replace(`${repoRoot}/`, "");
  const dependencyNames = Object.keys({
    ...(manifest.dependencies ?? {}),
    ...(manifest.devDependencies ?? {}),
  }).sort();

  for (const dependency of dependencyNames) {
    const issue = inspectDependency(packageName, packageDir, dependency);
    if (issue) issues.push(issue);
  }
}

if (issues.length > 0) {
  console.error("Dependency install looks stale or incomplete.");
  console.error(
    "Run `bun install --frozen-lockfile` from the monorepo root, then retry.",
  );
  console.error("");

  for (const issue of issues.slice(0, 20)) {
    console.error(
      `- ${issue.packageName}: ${issue.dependency} is ${issue.reason}`,
    );
    console.error(`  package: ${issue.packageDir}`);
    if (issue.target) {
      console.error(`  target:  ${issue.target}`);
    }
  }

  if (issues.length > 20) {
    console.error(`- ...and ${issues.length - 20} more`);
  }

  process.exit(1);
}

console.log("Workspace install check passed.");
