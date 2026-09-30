import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

import { migrarFaixasApartamento } from "./lib/migrarFaixasApartamento.js";

migrarFaixasApartamento()
  .then((n) => { if (n > 0) logger.info({ n }, "Faixas de apartamento convertidas em linhas próprias"); })
  .catch((err) => logger.error({ err }, "Falha ao converter faixas de apartamento"));

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
