const axios = require('axios');

async function test() {
  const apiKey    = process.env.WATSONX_API_KEY;
  const projectId = process.env.WATSONX_PROJECT_ID;
  const iamUrl    = process.env.WATSONX_IAM_URL || "https://iam.cloud.ibm.com/identity/token";
  const endpoint  = (process.env.WATSONX_ENDPOINT || "https://us-south.ml.cloud.ibm.com") +
                    "/ml/v1/text/generation?version=2023-05-29";
  const modelId   = process.env.WATSONX_MODEL_ID || "ibm/granite-13b-chat-v2";

  console.log("API Key   :", apiKey ? apiKey.substring(0,8) + "..." : "MISSING");
  console.log("Project ID:", projectId || "MISSING");
  console.log("Endpoint  :", endpoint);
  console.log("Model     :", modelId);
  console.log("");

  console.log("Step 1 — Getting IAM token...");
  const params = new URLSearchParams({
    grant_type: "urn:ibm:params:oauth:grant-type:apikey",
    apikey: apiKey
  });

  const tokenResp = await axios.post(iamUrl, params.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 20000
  });

  const token = tokenResp.data.access_token;
  console.log("   IAM token OK ✓ (expires in", tokenResp.data.expires_in, "seconds)");

  console.log("Step 2 — Calling watsonx.ai text generation...");
  const payload = {
    model_id:   modelId,
    project_id: projectId,
    input:      "You are a health assistant. What is a healthy fasting blood sugar level? Answer in one sentence.",
    parameters: { decoding_method: "greedy", max_new_tokens: 80, min_new_tokens: 5 }
  };

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json"
  };

  // Try primary endpoint first
  let text;
  try {
    const resp = await axios.post(endpoint, payload, { headers, timeout: 25000 });
    text = resp.data?.results?.[0]?.generated_text;
    console.log("   watsonx.ai response ✓ (primary endpoint)");
  } catch (primaryErr) {
    console.log("   Primary endpoint failed:", primaryErr.response?.data?.errors?.[0]?.message || primaryErr.message);
    console.log("   Trying alternative model: ibm/granite-3-8b-instruct...");
    payload.model_id = "ibm/granite-3-8b-instruct";
    try {
      const resp2 = await axios.post(endpoint, payload, { headers, timeout: 25000 });
      text = resp2.data?.results?.[0]?.generated_text;
      console.log("   watsonx.ai response ✓ (granite-3-8b-instruct)");
      console.log("   NOTE: Update WATSONX_MODEL_ID=ibm/granite-3-8b-instruct in .env");
    } catch (altErr) {
      throw altErr;
    }
  }

  console.log("   Generated text:", text?.trim());
  console.log("\n✅ IBM watsonx.ai is FULLY CONNECTED and working!");
}

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
test().catch(err => {
  const details = err.response?.data;
  console.error("\n❌ ERROR:", err.message);
  if (details) console.error("   API details:", JSON.stringify(details, null, 2));
  process.exit(1);
});
