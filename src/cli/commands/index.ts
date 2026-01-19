/**
 * Command Router
 *
 * Routes commands to appropriate handlers
 */

import { getOrCreateClient } from "../utils/client-cache.js";
import { defaultCLIContext } from "../context.js";
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
  cmdLoadMoreMessages,
  cmdGetLabels,
  // Send commands
  cmdSendText,
  cmdSendImage,
  cmdSendDocument,
  // Group commands
  cmdGroupList,
  cmdGroupInfo,
  cmdGroupParticipants,
  cmdGroupInviteLink,
  cmdGroupCreate,
  cmdGroupLeave,
  cmdGroupInviteAccept,
  cmdGroupInviteRevoke,
  cmdGroupInviteInfo,
  cmdGroupParticipantsAdd,
  cmdGroupParticipantsRemove,
  cmdGroupParticipantsPromote,
  cmdGroupParticipantsDemote,
  cmdGroupNameSet,
  cmdGroupDescriptionSet,
  cmdGroupPictureSet,
  // Misc commands
  cmdCheck,
  // Contact commands
  cmdContactList,
  cmdContactInfo,
  cmdContactBusiness,
  cmdContactPicture,
  cmdContactAdd,
  cmdContactRemove,
  // Profile commands
  cmdProfilePictureSet,
  cmdProfilePictureRemove,
  cmdProfileNameSet,
  cmdProfileStatusSet,
  // Label commands (Business)
  cmdLabelAdd,
  cmdLabelChats,
  cmdLabelChatAdd,
  cmdLabelChatRemove,
  // Catalog commands (Business)
  cmdCatalogList,
  cmdCatalogCollections,
  cmdCatalogProductCreate,
  cmdCatalogProductUpdate,
  cmdCatalogProductDelete,
} from "./commands-index.js";

export interface CommandContext {
  clientConfig: {
    instanceId: string;
    sessionPath: string;
    debug?: boolean;
  };
  jsonOutput?: boolean;
  flags?: { [key: string]: string | boolean };
}

/**
 * Run a command
 */
export async function runCommand(
  command: string,
  args: string[],
  context: CommandContext
): Promise<boolean | { success: boolean; switchToInstance?: string }> {
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
          subArgs[0] || clientConfig.instanceId,
          defaultCLIContext
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
          subArgs[0] || clientConfig.instanceId,
          clientConfig.instanceId
        );
      case "logout":
        if (!subArgs[0]) {
          console.log("❌ Usage: miaw-cli instance logout <id>");
          return false;
        }
        return await cmdInstanceLogout(
          clientConfig.sessionPath,
          subArgs[0],
          clientConfig.instanceId
        );
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
        return await cmdGetProfile(client, { jid: parsedArgs._[1] }, jsonOutput);
      case "contacts":
        return await cmdGetContacts(client, { limit: parsedArgs.limit, filter: parsedArgs.filter }, jsonOutput);
      case "groups":
        return await cmdGetGroups(client, { limit: parsedArgs.limit, filter: parsedArgs.filter }, jsonOutput);
      case "chats":
        return await cmdGetChats(client, { limit: parsedArgs.limit, filter: parsedArgs.filter }, jsonOutput);
      case "messages":
        if (!parsedArgs._[1]) {
          console.log("❌ Usage: miaw-cli get messages <jid> [--limit N] [--filter TEXT]");
          return false;
        }
        return await cmdGetMessages(
          client,
          { jid: parsedArgs._[1], limit: parsedArgs.limit, filter: parsedArgs.filter },
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
    const subSubCommand = parsedArgs._[1] || "";

    switch (subCommand) {
      case "list":
      case "ls":
        return await cmdGroupList(client, { limit: parsedArgs.limit, filter: parsedArgs.filter }, jsonOutput);

      case "info":
        if (!parsedArgs._[1]) {
          console.log("❌ Usage: miaw-cli group info <jid>");
          return false;
        }
        return await cmdGroupInfo(client, { jid: parsedArgs._[1] }, jsonOutput);

      case "create":
        if (parsedArgs._.length < 3) {
          console.log("❌ Usage: miaw-cli group create <name> <phone1> <phone2> ...");
          return false;
        }
        return await cmdGroupCreate(client, {
          name: parsedArgs._[1],
          phones: parsedArgs._.slice(2),
        });

      case "leave":
        if (!parsedArgs._[1]) {
          console.log("❌ Usage: miaw-cli group leave <jid>");
          return false;
        }
        return await cmdGroupLeave(client, { jid: parsedArgs._[1] });

      // Nested invite commands
      case "invite":
        switch (subSubCommand) {
          case "accept":
            if (!parsedArgs._[2]) {
              console.log("❌ Usage: miaw-cli group invite accept <code>");
              return false;
            }
            return await cmdGroupInviteAccept(client, { code: parsedArgs._[2] });
          case "revoke":
            if (!parsedArgs._[2]) {
              console.log("❌ Usage: miaw-cli group invite revoke <jid>");
              return false;
            }
            return await cmdGroupInviteRevoke(client, { jid: parsedArgs._[2] });
          case "info":
            if (!parsedArgs._[2]) {
              console.log("❌ Usage: miaw-cli group invite info <code>");
              return false;
            }
            return await cmdGroupInviteInfo(client, { code: parsedArgs._[2] }, jsonOutput);
          default:
            console.log("❌ Unknown invite command. Usage:");
            console.log("   group invite accept <code>   Join group via invite code");
            console.log("   group invite revoke <jid>    Revoke and get new invite link");
            console.log("   group invite info <code>     Get group info from invite code");
            return false;
        }

      // Backward compatibility: invite-link
      case "invite-link":
        if (!parsedArgs._[1]) {
          console.log("❌ Usage: miaw-cli group invite-link <jid>");
          return false;
        }
        return await cmdGroupInviteLink(client, { jid: parsedArgs._[1] });

      // Nested participants commands
      case "participants":
        switch (subSubCommand) {
          case "add":
            if (parsedArgs._.length < 4) {
              console.log("❌ Usage: miaw-cli group participants add <jid> <phone1> [phone2] ...");
              return false;
            }
            return await cmdGroupParticipantsAdd(client, {
              jid: parsedArgs._[2],
              phones: parsedArgs._.slice(3),
            });
          case "remove":
            if (parsedArgs._.length < 4) {
              console.log("❌ Usage: miaw-cli group participants remove <jid> <phone1> [phone2] ...");
              return false;
            }
            return await cmdGroupParticipantsRemove(client, {
              jid: parsedArgs._[2],
              phones: parsedArgs._.slice(3),
            });
          case "promote":
            if (parsedArgs._.length < 4) {
              console.log("❌ Usage: miaw-cli group participants promote <jid> <phone1> [phone2] ...");
              return false;
            }
            return await cmdGroupParticipantsPromote(client, {
              jid: parsedArgs._[2],
              phones: parsedArgs._.slice(3),
            });
          case "demote":
            if (parsedArgs._.length < 4) {
              console.log("❌ Usage: miaw-cli group participants demote <jid> <phone1> [phone2] ...");
              return false;
            }
            return await cmdGroupParticipantsDemote(client, {
              jid: parsedArgs._[2],
              phones: parsedArgs._.slice(3),
            });
          default:
            // List participants (original behavior)
            if (!subSubCommand) {
              console.log("❌ Usage: miaw-cli group participants <jid> [--limit N] [--filter TEXT]");
              return false;
            }
            // subSubCommand is actually the JID in this case
            return await cmdGroupParticipants(
              client,
              { jid: subSubCommand, limit: parsedArgs.limit, filter: parsedArgs.filter },
              jsonOutput
            );
        }

      // Nested name command
      case "name":
        if (subSubCommand === "set") {
          if (parsedArgs._.length < 4) {
            console.log("❌ Usage: miaw-cli group name set <jid> <name>");
            return false;
          }
          return await cmdGroupNameSet(client, {
            jid: parsedArgs._[2],
            name: parsedArgs._.slice(3).join(" "),
          });
        }
        console.log("❌ Usage: miaw-cli group name set <jid> <name>");
        return false;

      // Nested description command
      case "description":
        if (subSubCommand === "set") {
          if (!parsedArgs._[2]) {
            console.log("❌ Usage: miaw-cli group description set <jid> [description]");
            return false;
          }
          return await cmdGroupDescriptionSet(client, {
            jid: parsedArgs._[2],
            description: parsedArgs._.slice(3).join(" ") || undefined,
          });
        }
        console.log("❌ Usage: miaw-cli group description set <jid> [description]");
        return false;

      // Nested picture command
      case "picture":
        if (subSubCommand === "set") {
          if (parsedArgs._.length < 4) {
            console.log("❌ Usage: miaw-cli group picture set <jid> <path>");
            return false;
          }
          return await cmdGroupPictureSet(client, {
            jid: parsedArgs._[2],
            path: parsedArgs._[3],
          });
        }
        console.log("❌ Usage: miaw-cli group picture set <jid> <path>");
        return false;

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

  // Contact commands
  if (command === "contact") {
    const subCommand = parsedArgs._[0] || "";

    switch (subCommand) {
      case "list":
      case "ls":
        return await cmdContactList(client, { limit: parsedArgs.limit, filter: parsedArgs.filter }, jsonOutput);

      case "info":
        if (!parsedArgs._[1]) {
          console.log("❌ Usage: miaw-cli contact info <phone>");
          return false;
        }
        return await cmdContactInfo(client, { phone: parsedArgs._[1] }, jsonOutput);

      case "business":
        if (!parsedArgs._[1]) {
          console.log("❌ Usage: miaw-cli contact business <phone>");
          return false;
        }
        return await cmdContactBusiness(client, { phone: parsedArgs._[1] }, jsonOutput);

      case "picture":
        if (!parsedArgs._[1]) {
          console.log("❌ Usage: miaw-cli contact picture <phone> [--high]");
          return false;
        }
        return await cmdContactPicture(client, { phone: parsedArgs._[1], high: parsedArgs.high });

      case "add":
        if (parsedArgs._.length < 3) {
          console.log("❌ Usage: miaw-cli contact add <phone> <name> [--first <firstName>] [--last <lastName>]");
          return false;
        }
        return await cmdContactAdd(client, {
          phone: parsedArgs._[1],
          name: parsedArgs._.slice(2).join(" "),
          first: parsedArgs.first,
          last: parsedArgs.last,
        });

      case "remove":
        if (!parsedArgs._[1]) {
          console.log("❌ Usage: miaw-cli contact remove <phone>");
          return false;
        }
        return await cmdContactRemove(client, { phone: parsedArgs._[1] });

      default:
        console.log(`❌ Unknown contact command: ${subCommand}`);
        console.log("Available commands:");
        console.log("   contact list [--limit N] [--filter TEXT]   List all contacts");
        console.log("   contact info <phone>                       Get contact info");
        console.log("   contact business <phone>                   Get business profile");
        console.log("   contact picture <phone> [--high]           Get profile picture URL");
        console.log("   contact add <phone> <name>                 Add/edit contact");
        console.log("   contact remove <phone>                     Remove contact");
        return false;
    }
  }

  // Profile commands
  if (command === "profile") {
    const subCommand = parsedArgs._[0] || "";
    const subSubCommand = parsedArgs._[1] || "";

    switch (subCommand) {
      case "picture":
        switch (subSubCommand) {
          case "set":
            if (!parsedArgs._[2]) {
              console.log("❌ Usage: miaw-cli profile picture set <path>");
              return false;
            }
            return await cmdProfilePictureSet(client, { path: parsedArgs._[2] });
          case "remove":
            return await cmdProfilePictureRemove(client);
          default:
            console.log("❌ Unknown profile picture command. Usage:");
            console.log("   profile picture set <path>     Set profile picture");
            console.log("   profile picture remove         Remove profile picture");
            return false;
        }

      case "name":
        if (subSubCommand === "set") {
          if (parsedArgs._.length < 3) {
            console.log("❌ Usage: miaw-cli profile name set <name>");
            return false;
          }
          return await cmdProfileNameSet(client, { name: parsedArgs._.slice(2).join(" ") });
        }
        console.log("❌ Usage: miaw-cli profile name set <name>");
        return false;

      case "status":
        if (subSubCommand === "set") {
          // Status can be empty to clear it
          return await cmdProfileStatusSet(client, { status: parsedArgs._.slice(2).join(" ") });
        }
        console.log("❌ Usage: miaw-cli profile status set <status>");
        return false;

      default:
        console.log(`❌ Unknown profile command: ${subCommand}`);
        console.log("Available commands:");
        console.log("   profile picture set <path>     Set profile picture");
        console.log("   profile picture remove         Remove profile picture");
        console.log("   profile name set <name>        Set display name");
        console.log("   profile status set <status>    Set status/about text");
        return false;
    }
  }

  // Label commands (Business)
  if (command === "label") {
    const subCommand = parsedArgs._[0] || "";
    const subSubCommand = parsedArgs._[1] || "";

    switch (subCommand) {
      case "list":
      case "ls":
        return await cmdGetLabels(client, jsonOutput);

      case "add":
        if (parsedArgs._.length < 3) {
          console.log("❌ Usage: miaw-cli label add <name> <color>");
          console.log("   Color: 0-19 or name (salmon, gold, yellow, mint, teal, cyan, sky, blue, purple, pink, etc.)");
          return false;
        }
        return await cmdLabelAdd(
          client,
          { name: parsedArgs._[1], color: parsedArgs._[2] },
          jsonOutput
        );

      case "chats":
        if (!parsedArgs._[1]) {
          console.log("❌ Usage: miaw-cli label chats <labelId>");
          console.log("   Use 'label list' to see available labels");
          return false;
        }
        return await cmdLabelChats(
          client,
          { labelId: parsedArgs._[1] },
          jsonOutput
        );

      case "chat":
        switch (subSubCommand) {
          case "add":
            if (parsedArgs._.length < 4) {
              console.log("❌ Usage: miaw-cli label chat add <jid> <labelId>");
              return false;
            }
            return await cmdLabelChatAdd(
              client,
              { jid: parsedArgs._[2], labelId: parsedArgs._[3] },
              jsonOutput
            );
          case "remove":
            if (parsedArgs._.length < 4) {
              console.log("❌ Usage: miaw-cli label chat remove <jid> <labelId>");
              return false;
            }
            return await cmdLabelChatRemove(
              client,
              { jid: parsedArgs._[2], labelId: parsedArgs._[3] },
              jsonOutput
            );
          default:
            console.log("❌ Unknown label chat command. Usage:");
            console.log("   label chat add <jid> <labelId>      Add label to chat");
            console.log("   label chat remove <jid> <labelId>   Remove label from chat");
            return false;
        }

      default:
        console.log(`❌ Unknown label command: ${subCommand}`);
        console.log("Available commands:");
        console.log("   label list                          List all labels");
        console.log("   label chats <labelId>               List chats with this label");
        console.log("   label add <name> <color>            Create a new label");
        console.log("   label chat add <jid> <labelId>      Add label to chat");
        console.log("   label chat remove <jid> <labelId>   Remove label from chat");
        return false;
    }
  }

  // Catalog commands (Business)
  if (command === "catalog") {
    const subCommand = parsedArgs._[0] || "";
    const subSubCommand = parsedArgs._[1] || "";

    switch (subCommand) {
      case "list":
        return await cmdCatalogList(
          client,
          { phone: parsedArgs.phone, limit: parsedArgs.limit, cursor: parsedArgs.cursor },
          jsonOutput
        );

      case "collections":
        return await cmdCatalogCollections(
          client,
          { phone: parsedArgs.phone, limit: parsedArgs.limit },
          jsonOutput
        );

      case "product":
        switch (subSubCommand) {
          case "create":
            if (parsedArgs._.length < 6) {
              console.log("❌ Usage: miaw-cli catalog product create <name> <description> <price> <currency>");
              console.log("   Options: --image <path>, --url <url>, --retailerId <id>, --hidden");
              return false;
            }
            return await cmdCatalogProductCreate(
              client,
              {
                name: parsedArgs._[2],
                description: parsedArgs._[3],
                price: parseFloat(parsedArgs._[4]),
                currency: parsedArgs._[5],
                image: parsedArgs.image,
                url: parsedArgs.url,
                retailerId: parsedArgs.retailerId,
                hidden: parsedArgs.hidden,
              },
              jsonOutput
            );
          case "update":
            if (!parsedArgs._[2]) {
              console.log("❌ Usage: miaw-cli catalog product update <productId> [options]");
              console.log("   Options: --name <name>, --description <desc>, --price <price>, --currency <currency>");
              console.log("            --image <path>, --url <url>, --retailerId <id>, --hidden");
              return false;
            }
            return await cmdCatalogProductUpdate(
              client,
              {
                productId: parsedArgs._[2],
                name: parsedArgs.name,
                description: parsedArgs.description,
                price: parsedArgs.price,
                currency: parsedArgs.currency,
                image: parsedArgs.image,
                url: parsedArgs.url,
                retailerId: parsedArgs.retailerId,
                hidden: parsedArgs.hidden,
              },
              jsonOutput
            );
          case "delete":
            if (parsedArgs._.length < 3) {
              console.log("❌ Usage: miaw-cli catalog product delete <productId> [productId...]");
              return false;
            }
            return await cmdCatalogProductDelete(
              client,
              { productIds: parsedArgs._.slice(2) },
              jsonOutput
            );
          default:
            console.log("❌ Unknown catalog product command. Usage:");
            console.log("   catalog product create <name> <desc> <price> <currency>   Create product");
            console.log("   catalog product update <productId> [options]              Update product");
            console.log("   catalog product delete <productId> [productId...]         Delete products");
            return false;
        }

      default:
        console.log(`❌ Unknown catalog command: ${subCommand}`);
        console.log("Available commands:");
        console.log("   catalog list [--phone <phone>] [--limit <n>]              List products");
        console.log("   catalog collections [--phone <phone>] [--limit <n>]       List collections");
        console.log("   catalog product create <name> <desc> <price> <currency>   Create product");
        console.log("   catalog product update <productId> [options]              Update product");
        console.log("   catalog product delete <productId> [productId...]         Delete products");
        return false;
    }
  }

  // Load commands
  if (command === "load") {
    const subCommand = parsedArgs._[0] || "";

    switch (subCommand) {
      case "messages":
        if (!parsedArgs._[1]) {
          console.log("❌ Usage: miaw-cli load messages <jid> [--count N]");
          return false;
        }
        return await cmdLoadMoreMessages(
          client,
          { jid: parsedArgs._[1], count: parsedArgs.count },
          jsonOutput
        );
      default:
        console.log(`❌ Unknown load command: ${subCommand}`);
        return false;
    }
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
