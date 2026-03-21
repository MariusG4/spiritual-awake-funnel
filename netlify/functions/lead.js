import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function handler(event) {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const token = body["cf-turnstile-response"];
    const secret = process.env.TURNSTILE_SECRET;

    // 1. Initial Input Validation
    if (!token) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing Turnstile token" })
      };
    }

    if (!secret) {
      console.error("Configuration Error: TURNSTILE_SECRET is missing.");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Internal Server Configuration Error" })
      };
    }

    // 2. Turnstile Verification Call (Using Best Practices format)
    let verify;
    try {
      const response = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            secret: secret,
            response: token,
            remoteip: event.headers["x-nf-client-connection-ip"],
          }),
        }
      );
      verify = await response.json();
    } catch (apiError) {
      // Best Practice: Fallback behavior for API failures
      console.error("Turnstile API request failed:", apiError);
      return {
        statusCode: 502,
        body: JSON.stringify({ error: "Failed to communicate with authentication server" })
      };
    }

    // 3. Evaluate Verification Result
    if (!verify.success) {
      // Best Practice: Properly log errors for debugging without exposing secrets to client
      console.warn("Turnstile verification failed. Error codes:", verify["error-codes"]);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Bot detected or session expired. Please refresh." })
      };
    }

    // Optional Best Practice: Check Token Age (Warn if older than 4 minutes)
    if (verify.challenge_ts) {
      const challengeTime = new Date(verify.challenge_ts);
      const ageMinutes = (new Date() - challengeTime) / (1000 * 60);
      if (ageMinutes > 4) {
        console.warn(`Turnstile Token is ${ageMinutes.toFixed(1)} minutes old`);
      }
    }

    // 4. Proceed with application logic (Insert lead into Supabase)
    const { error } = await supabase.from("leads").insert({
      email: body.email,
      name: body.name,
      source: body.source || "spiritual_stalking_funnel"
    });

    if (error) {
      console.error("Supabase insert error:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to save lead" })
      };
    }

    // Success Response
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    console.error("Function error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" })
    };
  }
}
