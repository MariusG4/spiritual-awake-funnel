// netlify/functions/scheduled-deploy.js
const fs = require("node:fs/promises");
const path = require("node:path");

function getTodayDateString() {
  // Optional timezone override, e.g. "Europe/Bucharest"
  const timeZone = process.env.DEPLOY_CHECK_TIMEZONE;
  if (timeZone) {
    // en-CA format is YYYY-MM-DD
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }

  // Default: UTC date
  return new Date().toISOString().slice(0, 10);
}

function extractFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? match[1] : null;
}

function extractPubDate(frontmatter) {
  if (!frontmatter) return null;
  const match = frontmatter.match(
    /^\s*pubDate\s*:\s*["']?(\d{4}-\d{2}-\d{2})["']?\s*$/m,
  );
  return match ? match[1] : null;
}

async function hasPostPublishedToday(blogDir, today) {
  let files = [];
  try {
    files = await fs.readdir(blogDir, { withFileTypes: true });
  } catch (err) {
    console.error("Could not read blog directory:", blogDir, err);
    return false;
  }

  const markdownFiles = files
    .filter(
      (entry) =>
        entry.isFile() &&
        (entry.name.endsWith(".md") || entry.name.endsWith(".mdx")),
    )
    .map((entry) => path.join(blogDir, entry.name));

  for (const filePath of markdownFiles) {
    try {
      const raw = await fs.readFile(filePath, "utf8");
      const frontmatter = extractFrontmatter(raw);
      const pubDate = extractPubDate(frontmatter);

      if (pubDate === today) {
        console.log(
          "Found post scheduled for today:",
          path.basename(filePath),
          "pubDate:",
          pubDate,
        );
        return true;
      }
    } catch (err) {
      console.error("Failed reading/parsing file:", filePath, err);
    }
  }

  return false;
}

exports.handler = async function () {
  const today = getTodayDateString();
  const blogDir = path.join(process.cwd(), "src", "content", "blog");

  const shouldDeploy = await hasPostPublishedToday(blogDir, today);

  if (!shouldDeploy) {
    console.log("No posts published today (" + today + "). Skipping deploy.");
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "No new posts for today. Deploy skipped.",
        today,
      }),
    };
  }

  const buildHookUrl = process.env.BUILD_HOOK_URL;
  if (!buildHookUrl) {
    console.error("Missing BUILD_HOOK_URL environment variable");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Missing BUILD_HOOK_URL" }),
    };
  }

  try {
    const response = await fetch(buildHookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      console.log(
        "Deploy triggered successfully at " + new Date().toISOString(),
      );
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Deploy triggered",
          today,
        }),
      };
    }

    const responseBody = await response.text();
    console.error(
      "Build hook returned " + response.status + ": " + responseBody,
    );
    return {
      statusCode: response.status,
      body: JSON.stringify({
        error: "Build hook failed",
        details: responseBody,
      }),
    };
  } catch (error) {
    console.error("Error calling build hook:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
