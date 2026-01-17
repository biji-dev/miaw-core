/**
 * Command Index
 *
 * Exports all command handlers for the CLI
 */

export {
  cmdInstanceList,
  cmdInstanceStatus,
  cmdInstanceCreate,
  cmdInstanceDelete,
  cmdInstanceConnect,
  cmdInstanceDisconnect,
  cmdInstanceLogout,
} from "./instance.js";

export {
  cmdGetProfile,
  cmdGetContacts,
  cmdGetGroups,
  cmdGetChats,
  cmdGetMessages,
  cmdGetLabels,
} from "./get.js";

export {
  cmdSendText,
  cmdSendImage,
  cmdSendDocument,
} from "./send.js";

export {
  cmdGroupInfo,
  cmdGroupParticipants,
  cmdGroupInviteLink,
  cmdGroupCreate,
} from "./group.js";

export {
  cmdCheck,
} from "./misc.js";
