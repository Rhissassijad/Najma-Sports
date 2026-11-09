const raw =
  process.argv[2] || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
(async () => {
  let base;
  try {
    base = new URL(raw);
    if (
      !["http:", "https:"].includes(base.protocol) ||
      base.username ||
      base.password
    )
      throw Error();
  } catch {
    console.error("Provide an HTTP(S) API URL without credentials.");
    process.exitCode = 1;
    return;
  }
  const origin = base
    .toString()
    .replace(/\/+$/, "")
    .replace(/\/api$/, "");
  try {
    const response = await fetch(origin + "/api/health", {
      signal: AbortSignal.timeout(5000),
    });
    const body = await response.json().catch(() => null);
    const required = ["teamSports", "following", "socialInteractions"];
    if (
      !response.ok ||
      !body ||
      required.some((key) => body.features?.[key] !== true)
    )
      throw Error("This process is an older or different backend.");
    if (body.status !== "ready")
      throw Error("The API code is current but its database is not ready.");
    console.log(
      "API check passed: team sports, following, and social interactions are available.",
    );
  } catch (e) {
    console.error(
      "API check failed. " +
        (e.message === "This process is an older or different backend." ||
        e.message === "The API code is current but its database is not ready."
          ? e.message
          : "The configured API could not be reached."),
    );
    console.error(
      "From the Najma-Sports root: git pull origin main; stop the old backend terminal with Ctrl+C; run npm run server. Restart the frontend too. If port 8080 is busy, identify its existing process before restarting.",
    );
    process.exitCode = 1;
  }
})();
