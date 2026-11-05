import { z } from "zod";
import type { MailboxFolder } from "#src/assistant/mail/imap/types.ts";
import { agentTool, ToolRefusal, type AgentTools } from "../agent-tool.ts";
import type { AgentRunContext } from "../run-agent.ts";
import { accountKey, reason } from "./constants.ts";
import {
  delimiterOf,
  destinationRefusal,
  findFolderNamed,
  isInbox,
  newFolderName,
} from "./destination-refusal.ts";
import type { MailHandles } from "./mail-handles.ts";
import type { HeldMailbox, RunMailboxes } from "./run-mailboxes.ts";
import type { MailToolStats } from "./types.ts";

export function createMailFolderTools({
  limits,
  mailboxes,
  handles,
  run,
  stats,
}: {
  limits: { folderChangesPerAccount: number };
  mailboxes: RunMailboxes;
  handles: MailHandles;
  run: AgentRunContext;
  stats: MailToolStats;
}) {
  const folderChangesIn = new Map<string, number>();

  /** Takes one of the account's folder changes, or refuses when none is left. */
  function takeFolderChange(mailbox: HeldMailbox) {
    const key = mailbox.account.key;
    const made = folderChangesIn.get(key) ?? 0;
    if (made >= limits.folderChangesPerAccount) {
      throw new ToolRefusal(
        `This run has made, renamed or deleted ${String(made)} folders in ${key}, the most it may.`,
      );
    }
    folderChangesIn.set(key, made + 1);
  }

  /** The folders inside `folder`, at any depth. */
  function foldersInside(mailbox: HeldMailbox, folder: MailboxFolder) {
    const delimiter = folder.delimiter ?? delimiterOf(mailbox.folders);
    if (!delimiter) return [];
    return mailbox.folders.filter((other) =>
      other.path.startsWith(`${folder.path}${delimiter}`),
    );
  }

  /** Why a folder may not be renamed or deleted, or null when it may. */
  function folderChangeRefusal(mailbox: HeldMailbox, folder: MailboxFolder) {
    if (isInbox(folder)) return "INBOX is never renamed or deleted.";
    if (folder.specialUse !== null) {
      return `"${folder.path}" (${folder.specialUse}) is never renamed or deleted.`;
    }
    const special = foldersInside(mailbox, folder).find(
      (inside) => inside.specialUse !== null,
    );
    if (special) {
      return `"${folder.path}" holds "${special.path}" (${String(special.specialUse)}), so it is never renamed or deleted.`;
    }
    return null;
  }

  return {
    create_folder: agentTool({
      description:
        "Makes a folder, at the top level or inside parent. When a folder of that name exists, ignoring case and spaces, it gives that folder back instead.",
      inputSchema: z.object({
        account: accountKey,
        name: z.string().min(1).max(100),
        parent: z
          .string()
          .optional()
          .describe("The path of an existing folder to make it in."),
        reason,
      }),
      describe: ({ name }) => ({ kind: "create_folder", folder: name }),
      execute: (input) =>
        mailboxes.use(input.account, async (mailbox) => {
          const delimiter = delimiterOf(mailbox.folders);
          const name = newFolderName(input.name, delimiter);
          if (!name) throw new ToolRefusal("That folder name is empty.");
          let path = name;
          if (input.parent !== undefined) {
            const parent = mailbox.folder(input.parent);
            if (parent.specialUse !== null) {
              throw new ToolRefusal(
                `No folder is made inside "${parent.path}" (${parent.specialUse}).`,
              );
            }
            if (!delimiter) {
              throw new ToolRefusal(
                "This mailbox has no folders inside folders.",
              );
            }
            path = `${parent.path}${delimiter}${name}`;
          }
          const existing = findFolderNamed(path, mailbox.folders);
          if (existing) {
            return {
              folder: existing.path,
              created: false,
              canMoveHere: destinationRefusal(existing) === null,
            };
          }
          takeFolderChange(mailbox);
          await mailbox.session.createFolder(path);
          stats.createdFolders += 1;
          await mailbox.refreshFolders();
          await run.logAction({
            accountId: mailbox.account.id,
            kind: "create_folder",
            toFolder: path,
            reason: input.reason,
          });
          return { folder: path, created: true, canMoveHere: true };
        }),
    }),

    rename_folder: agentTool({
      description:
        "Renames a folder, or moves it inside another parent; its mail and the folders inside it go with it. The mail ids of this run keep working.",
      inputSchema: z.object({
        account: accountKey,
        folder: z.string().describe("The path of the folder to rename."),
        name: z.string().min(1).max(100).describe("Its new name."),
        parent: z
          .string()
          .nullable()
          .optional()
          .describe(
            "The path of the folder to put it in; null for the top level. Leave it out to keep the parent it has.",
          ),
        reason,
      }),
      describe: ({ folder, name }) => ({
        kind: "rename_folder",
        folder,
        newName: name,
      }),
      execute: (input) =>
        mailboxes.use(input.account, async (mailbox) => {
          const folder = mailbox.folder(input.folder);
          const refusal = folderChangeRefusal(mailbox, folder);
          if (refusal) throw new ToolRefusal(refusal);
          const delimiter = delimiterOf(mailbox.folders);
          const name = newFolderName(input.name, delimiter);
          if (!name) throw new ToolRefusal("That folder name is empty.");
          let parentPath: string | null =
            delimiter && folder.path.includes(delimiter)
              ? folder.path.slice(0, folder.path.lastIndexOf(delimiter))
              : null;
          if (input.parent !== undefined) parentPath = input.parent;
          if (parentPath !== null) {
            const parent = mailbox.folder(parentPath);
            if (parent.specialUse !== null) {
              throw new ToolRefusal(
                `No folder goes inside "${parent.path}" (${parent.specialUse}).`,
              );
            }
            if (
              parent.path === folder.path ||
              foldersInside(mailbox, folder).includes(parent)
            ) {
              throw new ToolRefusal("A folder cannot go inside itself.");
            }
            if (!delimiter) {
              throw new ToolRefusal(
                "This mailbox has no folders inside folders.",
              );
            }
          }
          const path =
            parentPath === null || delimiter === null
              ? name
              : `${parentPath}${delimiter}${name}`;
          if (path === folder.path) {
            return { folder: path, renamed: false };
          }
          const existing = findFolderNamed(path, mailbox.folders);
          if (existing && existing.path !== folder.path) {
            throw new ToolRefusal(
              `"${existing.path}" exists already. To merge the two, move the mail of one into the other.`,
            );
          }
          takeFolderChange(mailbox);
          await mailbox.session.renameFolder(folder.path, path);
          stats.renamedFolders += 1;
          handles.renameFolder(
            mailbox.account.key,
            folder.path,
            path,
            delimiter,
          );
          await mailbox.refreshFolders();
          await run.logAction({
            accountId: mailbox.account.id,
            kind: "rename_folder",
            fromFolder: folder.path,
            toFolder: path,
            reason: input.reason,
          });
          return { folder: path, renamed: true };
        }),
    }),

    delete_folder: agentTool({
      description:
        "Deletes a folder that holds no mail and no other folders. It never deletes mail: move the mail out first.",
      inputSchema: z.object({
        account: accountKey,
        folder: z.string().describe("The path of the folder to delete."),
        reason,
      }),
      describe: ({ folder }) => ({ kind: "delete_folder", folder }),
      execute: (input) =>
        mailboxes.use(input.account, async (mailbox) => {
          const folder = mailbox.folder(input.folder);
          const refusal = folderChangeRefusal(mailbox, folder);
          if (refusal) throw new ToolRefusal(refusal);
          if (foldersInside(mailbox, folder).length > 0) {
            throw new ToolRefusal(
              `"${folder.path}" holds other folders. Delete or move them first.`,
            );
          }
          if (folder.selectable) {
            await mailbox.select(folder.path, false);
            const held = await mailbox.session.searchUids({});
            if (held.length > 0) {
              throw new ToolRefusal(
                `"${folder.path}" holds ${String(held.length)} mails. Move them out first.`,
              );
            }
          }
          takeFolderChange(mailbox);
          await mailbox.session.deleteEmptyFolder(folder.path);
          stats.deletedFolders += 1;
          await mailbox.refreshFolders();
          await run.logAction({
            accountId: mailbox.account.id,
            kind: "delete_folder",
            fromFolder: folder.path,
            reason: input.reason,
          });
          return { deleted: folder.path };
        }),
    }),
  } satisfies AgentTools;
}
