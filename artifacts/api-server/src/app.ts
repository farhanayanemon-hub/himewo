import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { handleStripeWebhook } from "./lib/stripe-billing";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());

// Stripe webhook needs the raw body for signature verification, so it must be
// registered BEFORE the JSON body parser.
app.post(
  "/api/ads/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      await handleStripeWebhook(
        req.body as Buffer,
        req.headers["stripe-signature"] as string | undefined,
      );
      res.json({ received: true });
    } catch (err) {
      req.log.error({ err }, "stripe webhook handling failed");
      res.status(400).json({ error: "Webhook error" });
    }
  },
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
