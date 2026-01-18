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
  cmdLoadMoreMessages,
  cmdGetLabels,
} from "./get.js";

export {
  cmdSendText,
  cmdSendImage,
  cmdSendDocument,
} from "./send.js";

export {
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
} from "./group.js";

export {
  cmdCheck,
} from "./misc.js";
