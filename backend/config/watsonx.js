/**
 * IBM watsonx.ai Configuration
 * ─────────────────────────────────────────────────────────────
 * Set these values in your .env file — never hard-code them.
 *
 *   WATSONX_API_KEY      → Your IBM Cloud API key
 *   WATSONX_PROJECT_ID   → watsonx.ai project ID
 *   WATSONX_ENDPOINT     → Regional ML endpoint
 *   WATSONX_MODEL_ID     → Foundation model to use
 *   WATSONX_IAM_URL      → IBM IAM token endpoint
 */

const watsonxConfig = {
  apiKey:     process.env.WATSONX_API_KEY     || '',
  projectId:  process.env.WATSONX_PROJECT_ID  || '',
  endpoint:   process.env.WATSONX_ENDPOINT    || 'https://us-south.ml.cloud.ibm.com',
  modelId:    process.env.WATSONX_MODEL_ID    || 'ibm/granite-13b-chat-v2',
  iamUrl:     process.env.WATSONX_IAM_URL     || 'https://iam.cloud.ibm.com/identity/token',

  // Generation parameters sent with every request
  parameters: {
    decoding_method:   'greedy',
    max_new_tokens:    800,
    min_new_tokens:    50,
    stop_sequences:    [],
    repetition_penalty: 1.1
  }
};

/**
 * Returns true when the minimum required credentials are present.
 */
watsonxConfig.isConfigured = function () {
  return Boolean(this.apiKey && this.projectId);
};

/**
 * URL for the text-generation endpoint.
 */
watsonxConfig.generateUrl = function () {
  return `${this.endpoint}/ml/v1/text/generation?version=2023-05-29`;
};

/**
 * Validate that all required env vars are set.
 * Throws a descriptive error during startup if not.
 */
watsonxConfig.validate = function () {
  const missing = [];
  if (!this.apiKey)    missing.push('WATSONX_API_KEY');
  if (!this.projectId) missing.push('WATSONX_PROJECT_ID');

  if (missing.length) {
    console.warn(
      `\n⚠️  watsonx.ai not fully configured. Missing: ${missing.join(', ')}.\n` +
      `   AI features will return mock responses until credentials are added.\n`
    );
  }
  return missing.length === 0;
};

module.exports = watsonxConfig;
