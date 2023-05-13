import { AddressInfo } from "net";
import Fastify from "fastify";
import fastifyWs from "@fastify/websocket";
import { userStatus } from "./main";

export async function initServer() {
  const fastify = Fastify({
    logger: false,
  });

  fastify.register(fastifyWs, {
    options: {},
  });

  fastify.register(async function (fastify) {
    fastify.get("/ws", { websocket: true }, (connection, req) => {
      const socket = connection.socket;
      socket.send(JSON.stringify(userStatus));

      // Don't know if this is needed, but it's here just in case
      socket.on("close", (_) => {
        socket.terminate();
      });
    });
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

  return fastify;
}
