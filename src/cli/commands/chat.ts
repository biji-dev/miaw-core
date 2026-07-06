/**
 * Chat Management Commands (v1.7.0)
 *
 * Archive, pin, mute, mark read/unread, clear, and delete chats via chatModify.
 */

import { MiawClient } from "../../index.js";
import { ensureConnected } from "../utils/session.js";
import { formatMessage } from "../utils/formatter.js";

/** Run a chat-management operation and report the result. */
async function runChatOp(
  client: MiawClient,
  jid: string,
  gerund: string,
  op: () => Promise<{ success: boolean; error?: string }>
): Promise<boolean> {
  const conn = await ensureConnected(client);
  if (!conn.success) {
    console.log(`❌ Not connected: ${conn.reason}`);
    return false;
  }

  console.log(`💬 ${gerund} ${jid}...`);
  const res = await op();

  if (res.success) {
    console.log(formatMessage(true, `${gerund} done`));
    return true;
  }
  console.log(formatMessage(false, `Failed: ${gerund.toLowerCase()}`, res.error));
  return false;
}

export const cmdChatArchive = (client: MiawClient, args: { jid: string }) =>
  runChatOp(client, args.jid, "Archiving", () => client.archiveChat(args.jid));

export const cmdChatUnarchive = (client: MiawClient, args: { jid: string }) =>
  runChatOp(client, args.jid, "Unarchiving", () => client.unarchiveChat(args.jid));

export const cmdChatPin = (client: MiawClient, args: { jid: string }) =>
  runChatOp(client, args.jid, "Pinning", () => client.pinChat(args.jid));

export const cmdChatUnpin = (client: MiawClient, args: { jid: string }) =>
  runChatOp(client, args.jid, "Unpinning", () => client.unpinChat(args.jid));

export const cmdChatMute = (client: MiawClient, args: { jid: string; duration?: number }) =>
  runChatOp(client, args.jid, "Muting", () => client.muteChat(args.jid, args.duration));

export const cmdChatUnmute = (client: MiawClient, args: { jid: string }) =>
  runChatOp(client, args.jid, "Unmuting", () => client.unmuteChat(args.jid));

export const cmdChatRead = (client: MiawClient, args: { jid: string }) =>
  runChatOp(client, args.jid, "Marking read", () => client.markChatRead(args.jid));

export const cmdChatUnread = (client: MiawClient, args: { jid: string }) =>
  runChatOp(client, args.jid, "Marking unread", () => client.markChatUnread(args.jid));

export const cmdChatClear = (client: MiawClient, args: { jid: string }) =>
  runChatOp(client, args.jid, "Clearing", () => client.clearChat(args.jid));

export const cmdChatDelete = (client: MiawClient, args: { jid: string }) =>
  runChatOp(client, args.jid, "Deleting", () => client.deleteChat(args.jid));
