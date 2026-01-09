/**
 * Command Router
 *
 * Routes commands to appropriate handlers
 */

import { getOrCreateClient } from "../utils/client-cache.js";
import {
  // Instance commands
  cmdInstanceList,
  cmdInstanceStatus,
  cmdInstanceCreate,
  cmdInstanceDelete,
  cmdInstanceConnect,
  cmdInstanceDisconnect,
  cmdInstanceLogout,
  // Get commands
  cmdGetProfile,
  cmdGetContacts,
  cmdGetGroups,
  cmdGetChats,
  cmdGetMessages,
  cmdGetLabels,
  // Send commands
  cmdSendText,
  cmdSendImage,
  cmdSendDocument,
  // Group commands
  cmdGroupInfo,
  cmdGroupParticipants,
  cmdGroupInviteLink,
  cmdGroupCreate,
  // Misc commands
  cmdCheck,
} from "./commands-index.js";

export interface CommandContext {
  clientConfig: {
    instanceId: string;
    sessionPath: string;
    debug?: boolean;
  };
  jsonOutput?: boolean;
}

/**
 * Run a command
 */
export async function runCommand(
  command: string,
  args: string[],
  context: CommandContext
): Promise<boolean> {
  const { clientConfig, jsonOutput = false } = context;

  // Parse flags from args
  const parsedArgs = parseCommandArgs(args);

  // Instance commands (don't require connection)
  if (command === "instance") {
    const subCommand = parsedArgs._[0] || "";
    const subArgs = parsedArgs._.slice(1);

    switch (subCommand) {
      case "ls":
      case "list":
        return await cmdInstanceList(clientConfig.sessionPath);
      case "status":
        return await cmdInstanceStatus(
          clientConfig.sessionPath,
          subArgs[0] || clientConfig.instanceId
        );
      case "create":
        if (!subArgs[0]) {
          console.log("❌ Usage: miaw-cli instance create <id>");
          return false;
        }
        return await cmdInstanceCreate(clientConfig.sessionPath, subArgs[0]);
      case "delete":
        if (!subArgs[0]) {
          console.log("❌ Usage: miaw-cli instance delete <id>");
          return false;
        }
        return await cmdInstanceDelete(clientConfig.sessionPath, subArgs[0]);
      case "connect":
        if (!subArgs[0]) {
          console.log("❌ Usage: miaw-cli instance connect <id>");
          return false;
        }
        return await cmdInstanceConnect(clientConfig.sessionPath, subArgs[0]);
      case "disconnect":
        if (!subArgs[0]) {
          console.log("❌ Usage: miaw-cli instance disconnect <id>");
          return false;
        }
        return await cmdInstanceDisconnect(
          clientConfig.sessionPath,
          subArgs[0] || clientConfig.instanceId
        );
      case "logout":
        if (!subArgs[0]) {
          console.log("❌ Usage: miaw-cli instance logout <id>");
          return false;
        }
        return await cmdInstanceLogout(clientConfig.sessionPath, subArgs[0]);
      default:
        console.log(`❌ Unknown instance command: ${subCommand}`);
        return false;
    }
  }

  // Create or get cached client for commands that need connection
  const client = getOrCreateClient(clientConfig);

  // Get commands
  if (command === "get") {
    const subCommand = parsedArgs._[0] || "";

    switch (subCommand) {
      case "profile":
        return await cmdGetProfile(client, jsonOutput);
      case "contacts":
        return await cmdGetContacts(client, { limit: parsedArgs.limit }, jsonOutput);
      case "groups":
        return await cmdGetGroups(client, { limit: parsedArgs.limit }, jsonOutput);
      case "chats":
        return await cmdGetChats(client, { limit: parsedArgs.limit }, jsonOutput);
      case "messages":
        if (!parsedArgs._[1]) {
          console.log("❌ Usage: miaw-cli get messages <jid> [--limit N]");
          return false;
        }
        return await cmdGetMessages(
          client,
          { jid: parsedArgs._[1], limit: parsedArgs.limit },
          jsonOutput
        );
      case "labels":
        return await cmdGetLabels(client, jsonOutput);
      default:
        console.log(`❌ Unknown get command: ${subCommand}`);
        return false;
    }
  }

  // Send commands
  if (command === "send") {
    const subCommand = parsedArgs._[0] || "";

    switch (subCommand) {
      case "text":
        if (parsedArgs._.length < 3) {
          console.log("❌ Usage: miaw-cli send text <phone> <message>");
          return false;
        }
        return await cmdSendText(client, {
          phone: parsedArgs._[1],
          message: parsedArgs._.slice(2).join(" "),
        });
      case "image":
        if (parsedArgs._.length < 3) {
          console.log("❌ Usage: miaw-cli send image <phone> <path> [caption]");
          return false;
        }
        return await cmdSendImage(client, {
          phone: parsedArgs._[1],
          path: parsedArgs._[2],
          caption: parsedArgs._[3],
        });
      case "document":
        if (parsedArgs._.length < 3) {
          console.log("❌ Usage: miaw-cli send document <phone> <path> [caption]");
          return false;
        }
        return await cmdSendDocument(client, {
          phone: parsedArgs._[1],
          path: parsedArgs._[2],
          caption: parsedArgs._[3],
        });
      default:
        console.log(`❌ Unknown send command: ${subCommand}`);
        return false;
    }
  }

  // Group commands
  if (command === "group") {
    const subCommand = parsedArgs._[0] || "";

    switch (subCommand) {
      case "info":
        if (!parsedArgs._[1]) {
          console.log("❌ Usage: miaw-cli group info <jid>");
          return false;
        }
        return await cmdGroupInfo(client, { jid: parsedArgs._[1] }, jsonOutput);
      case "participants":
        if (!parsedArgs._[1]) {
          console.log("❌ Usage: miaw-cli group participants <jid>");
          return false;
        }
        return await cmdGroupParticipants(client, { jid: parsedArgs._[1] }, jsonOutput);
      case "invite-link":
        if (!parsedArgs._[1]) {
          console.log("❌ Usage: miaw-cli group invite-link <jid>");
          return false;
        }
        return await cmdGroupInviteLink(client, { jid: parsedArgs._[1] });
      case "create":
        if (parsedArgs._.length < 3) {
          console.log("❌ Usage: miaw-cli group create <name> <phone1> <phone2> ...");
          return false;
        }
        return await cmdGroupCreate(client, {
          name: parsedArgs._[1],
          phones: parsedArgs._.slice(2),
        });
      default:
        console.log(`❌ Unknown group command: ${subCommand}`);
        return false;
    }
  }

  // Check command
  if (command === "check") {
    if (parsedArgs._.length === 0) {
      console.log("❌ Usage: miaw-cli check <phone1> [phone2] ...");
      return false;
    }
    return await cmdCheck(client, { phones: parsedArgs._ }, jsonOutput);
  }

  console.log(`❌ Unknown command: ${command}`);
  console.log('Run "miaw-cli --help" for usage information');
  return false;
}

/**
 * Parse command arguments
 */
function parseCommandArgs(args: string[]): any {
  const parsed: any = { _: [] };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith("--")) {
      const flagName = arg.slice(2);
      const nextArg = args[i + 1];

      if (nextArg && !nextArg.startsWith("--")) {
        // Check if it's a number
        const numValue = parseInt(nextArg, 10);
        parsed[flagName] = isNaN(numValue) ? nextArg : numValue;
        i++;
      } else {
        parsed[flagName] = true;
      }
    } else {
      parsed._.push(arg);
    }
  }

  return parsed;
}
