/** How the two mail agents work together. Both get it, so that each knows what the other does. */
export const MAIL_WORKFLOW = `Two agents look after the owner's mail:
- The organise agent runs every 15 minutes. It moves new mail out of the inbox into folders and leaves it unread. If the owner has iCloud, it is also the one that updates their calendar from their mail.
- The report agent runs once each morning. It reads all the mail of the last 24 hours, decides what needs the owner, writes them a report and is the one that looks after their to-do list. Once the report is saved, that mail is marked read.

The owner relies on the report rather than checking each folder.`;
