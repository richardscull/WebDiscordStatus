import { Activity, Client, Events, GatewayIntentBits } from "discord.js";
import { AddressInfo } from "net";
import Fastify from "fastify";
import * as dotenv from "dotenv";
dotenv.config();

const { TOKEN, USERID, GUILDID } = process.env;

interface DiscordStatus {
  username: string;
  status: string;
  avatar: string;
  activity?: Activity;
  userId: string;
}

let discordStatus: DiscordStatus;

async function discordHandle() {
  if (!TOKEN || !USERID || !GUILDID)
    throw new Error("Missing environment variables");

  const client = new Client({
    intents: [
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.Guilds,
    ],
  });
  await client.login(TOKEN).catch((err) => {
    throw err;
  });

  const guild = await client.guilds.fetch(GUILDID);
  if (!guild) throw new Error("Guild not found");

  const member = await guild.members.fetch(USERID);
  if (!member) throw new Error("Member not found");

  discordStatus = {
    username: member.user.username,
    status: member.presence ? member.presence.status : "offline",
    avatar: member.user.displayAvatarURL({ size: 4096 }),
    activity: member.presence?.activities[0],
    userId: USERID,
  };

  client.on(Events.PresenceUpdate, (_, newPresence) => {
    if (newPresence.userId !== USERID || !newPresence.user) return;

    discordStatus = {
      username: newPresence.user.username,
      status: newPresence.status,
      avatar: newPresence.user.displayAvatarURL({ size: 4096 }),
      activity: member.presence?.activities[0],
      userId: USERID,
    };
  });
}

async function startServer() {
  const fastify = Fastify({
    logger: false,
  });

  fastify.get("/api", async (_, reply) => {
    await reply.send(discordStatus);
  });

  fastify.register(require("@fastify/static"), {
    root: __dirname + "/../public",
    prefix: "/",
  });

  fastify.listen({ port: 3000 }, (err, _) => {
    if (err) throw err;

    const { port } = fastify.server.address() as AddressInfo;
    console.log(`Server listening on port ${port} 🚀`);
  });
}

async function main() {
  await discordHandle();
  await startServer();
}

main();
