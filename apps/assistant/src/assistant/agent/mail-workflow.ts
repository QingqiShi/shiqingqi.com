/** How the two mail agents work together. Both get it, so that each knows what the other does. */
export const MAIL_WORKFLOW = `Two agents look after the owner's mail:
- The organise agent runs every 15 minutes. It reads new mail, moves it out of the inbox into folders and leaves it unread. If the owner has iCloud, it also updates their calendar from that mail.
- The report agent runs once each morning. It reads all the mail of the last 24 hours, decides what needs the owner, writes them a report and is the one that looks after their to-do list. If the owner has iCloud, it also updates their calendar with what the organise agent missed. Once the report is saved, that mail is marked read.

The owner relies on the report rather than checking each folder.`;
