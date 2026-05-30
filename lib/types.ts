// Shared types used by both the UI and the API route.

export type Role = "user" | "assistant";

/** An image attached to a user message (base64 data URL). */
export interface Attachment {
  type: "image";
  mediaType: string; // e.g. "image/png"
  dataUrl: string; // full data URL for preview
  base64: string; // raw base64 (no prefix) for the API
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  attachments?: Attachment[];
  /** Web sources Claude cited, if web search was used. */
  sources?: { title: string; url: string }[];
  createdAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  model: string;
  createdAt: number;
}

/** Payload the client POSTs to /api/chat */
export interface ChatRequest {
  model: string;
  webSearch: boolean;
  messages: {
    role: Role;
    content: string;
    attachments?: { mediaType: string; base64: string }[];
  }[];
}
