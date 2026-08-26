// Shown to users in place of raw upstream error text (API credit/billing
// errors, provider outages, etc) -- never leak internal error details
// (e.g. "Your credit balance is too low") into the chat UI.
export const GENERIC_CHAT_ERROR = "Server is down, work in progress. Please check back soon.";
