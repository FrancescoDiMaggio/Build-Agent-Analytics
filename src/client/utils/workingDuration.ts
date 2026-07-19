/**
 * Implementation duration utilities.
 *
 * Primary metric: sum of per-turn working time.
 * A "turn" starts with a user message and ends with the last Build Agent
 * (assistant) message before the next user message. The duration of each turn
 * is: last_assistant_timestamp − user_message_timestamp.
 *
 * This avoids counting idle time between sessions — if a user reopens an old
 * conversation hours later, that gap is not included.
 */

import { parseMessageContent, isUserMessage } from "./fields.ts";

// ─── Date Parsing ────────────────────────────────────────────────────────────

/**
 * Parse a ServiceNow date string into a Date object.
 * Accepts "YYYY-MM-DD HH:mm:ss" or ISO format.
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const normalized = dateStr.replace(" ", "T");
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

// ─── Implementation Duration (Turn-based) ───────────────────────────────────

/**
 * Extract the value from a ServiceNow display_value/value field.
 */
function fieldValue(field: any): string {
  if (typeof field === "string") return field;
  return field?.value || "";
}

interface TimestampedMessage {
  sender: "user" | "assistant";
  timestamp: number;
}

/**
 * Given an array of message records (with `content` and `sys_created_on` fields),
 * compute the implementation duration as the sum of per-turn working intervals,
 * in milliseconds.
 *
 * Algorithm:
 * 1. Parse all messages extracting sender and timestamp
 * 2. Sort chronologically
 * 3. Identify "turns": each turn starts with a user message
 * 4. For each turn, find the last assistant message before the next user message
 * 5. Turn duration = last_assistant_timestamp − user_message_timestamp
 * 6. Sum all turn durations
 */
export function calculateImplDurationMs(messages: any[]): number {
  // Collect all messages with their sender type and timestamp
  const parsed: TimestampedMessage[] = [];

  for (const msg of messages) {
    const content = parseMessageContent(msg.content);
    if (!content) continue;

    const dateStr = fieldValue(msg.sys_created_on);
    const date = parseDate(dateStr);
    if (!date) continue;

    if (isUserMessage(content.sender)) {
      parsed.push({ sender: "user", timestamp: date.getTime() });
    } else {
      parsed.push({ sender: "assistant", timestamp: date.getTime() });
    }
  }

  // Sort chronologically
  parsed.sort((a, b) => a.timestamp - b.timestamp);

  // Walk through messages and compute per-turn duration
  let totalMs = 0;
  let currentTurnStart: number | null = null;
  let lastAssistantInTurn: number | null = null;

  for (const entry of parsed) {
    if (entry.sender === "user") {
      // Close the previous turn if we had one with an assistant response
      if (currentTurnStart !== null && lastAssistantInTurn !== null) {
        totalMs += lastAssistantInTurn - currentTurnStart;
      }
      // Start a new turn
      currentTurnStart = entry.timestamp;
      lastAssistantInTurn = null;
    } else {
      // Assistant message — track as latest response in the current turn
      if (currentTurnStart !== null) {
        lastAssistantInTurn = entry.timestamp;
      }
    }
  }

  // Close the last turn if it ended with an assistant response
  if (currentTurnStart !== null && lastAssistantInTurn !== null) {
    totalMs += lastAssistantInTurn - currentTurnStart;
  }

  return totalMs;
}

/**
 * Format milliseconds as a human-readable duration string (hours and minutes only).
 * Examples: "3h 45m", "0h 12m", "< 1m"
 */
export function formatDurationMs(ms: number): string {
  if (ms <= 0) return "—";

  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 1) return "< 1m";

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/**
 * Calculate impl duration from an array of message arrays (one per conversation),
 * returning a formatted string.
 */
export function formatImplDuration(allMessages: any[][]): string {
  let totalMs = 0;
  for (const msgs of allMessages) {
    totalMs += calculateImplDurationMs(msgs);
  }
  return formatDurationMs(totalMs);
}

/**
 * Calculate total implementation minutes from an array of message arrays.
 * Used for ROI calculations where raw numeric value is needed.
 */
export function getImplMinutes(allMessages: any[][]): number {
  let totalMs = 0;
  for (const msgs of allMessages) {
    totalMs += calculateImplDurationMs(msgs);
  }
  return Math.round(totalMs / 60000);
}
