// import "jsr:@std/dotenv/load";

const MAX_WAIT = 1000 * 60 * 5; // 5 minutes

import { ImapClient, markMessagesAsRead } from "@workingdevshero/deno-imap";
const client = new ImapClient({
  host: Deno.env.get("IMAP_HOST"),
  port: 993,
  tls: true,
  username: Deno.env.get("IMAP_USERNAME"),
  password: Deno.env.get("IMAP_PASSWORD"),
});

export async function getCode(start_time = new Date()) {
  // const start_time = new Date();
  await client.connect();
  await client.authenticate();
  await client.selectMailbox("INBOX");
  while (new Date() - start_time < MAX_WAIT) {
    await new Promise((resolve) => setTimeout(resolve, 5000)); // 5 seconds
    console.log("Search!");
    const results = await client.search({
      and: [
        {
          date: {
            sent: {
              since: start_time, // ONLY DATE :(
            },
          },
        },
        {
          flags: {
            not: ["Seen"],
          },
        },
      ],
    });
    if (results.length > 0) {
      if (results.length > 1) {
        console.warn("More than one mail found! Using the last one.");
      }
      const messageID = results[results.length - 1];
      console.log("Found mail!");
      await markMessagesAsRead(client, 'INBOX', [messageID]);
      const [message] = await client.fetch([messageID], {
        envelope: true,
        headers: ["Subject"]
      });
      const code = message.envelope.subject.slice(0, 6);
      console.log("Code:", code);
      await client.disconnect();
      return code;
    }
  } 
  console.log("No code found!");
  await client.disconnect();
  return null;
}