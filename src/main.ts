import { Activity, Client, Events, GatewayIntentBits } from "discord.js";
import WebSocket from "ws";
import * as dotenv from "dotenv";
import { FastifyInstance } from "fastify/types/instance";
import { initServer } from "./webServer";

dotenv.config();

const { TOKEN, USERID, GUILDID } = process.env;

export interface DiscordStatus {
  username: string;
  status: string;
  avatar: string;
  activity?: Activity;
  userId: string;
}

async function initDiscordBot(token: string) {
  const client = new Client({
    intents: [
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.Guilds,
    ],
  });

  await client.login(token).catch((err) => {
    throw err;
  });

  return client;
}

async function getUserStatus(client: Client) {
  if (!USERID || !GUILDID) throw new Error("Missing environment variables");

  const guild = await client.guilds.fetch(GUILDID);
  if (!guild) throw new Error("Guild not found");

  const member = await guild.members.fetch(USERID);
  if (!member) throw new Error("Member not found");

  return {
    username: member.user.username,
    status: member.presence ? member.presence.status : "offline",
    avatar: member.user.displayAvatarURL({ size: 4096 }),
    activity: member.presence?.activities[0],
    userId: USERID,
  };
}

function sendDiscordStatusUpdates(client: Client, fastify: FastifyInstance) {
  client.on(Events.PresenceUpdate, (_, newPresence) => {
    if (newPresence.userId !== USERID || !newPresence.user) return;

    const userStatus = {
      username: newPresence.user.username,
      status: newPresence.status,
      avatar: newPresence.user.displayAvatarURL({ size: 4096 }),
      activity: newPresence.activities[0],
      userId: USERID,
    };

    fastify.websocketServer.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(userStatus) + "\n\n");
      }
    });
  });
}

(async () => {
  if (!TOKEN) throw new Error("Missing TOKEN environment variable");

  const client = await initDiscordBot(TOKEN);
  const status = await getUserStatus(client);

  const websocketServer = await initServer(status);

  sendDiscordStatusUpdates(client, websocketServer);
})();
