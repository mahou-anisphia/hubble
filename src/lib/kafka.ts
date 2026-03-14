import { Kafka, Producer, Admin } from "kafkajs";
import { config } from "../config";

// KafkaJS computes negative timeouts on Bun's timer implementation — non-fatal, suppress the noise.
process.on("warning", (w) => { if (w.name === "TimeoutNegativeWarning") return; console.warn(w); });

export const KAFKA_TOPICS = ["hubble-aqi", "hubble-openweather"] as const;

let producer: Producer | null = null;
let topicsEnsured = false;

function buildKafkaClient(): Kafka | null {
  const broker = config.kafka.endpoint;
  const port = config.kafka.port;

  if (!broker || !port) {
    console.warn("[kafka] KAFKA_ENDPOINT or KAFKA_PORT not set — push features disabled");
    return null;
  }

  return new Kafka({
    clientId: "hubble",
    brokers: [`${broker}:${port}`],
    logLevel: 0, // silence KafkaJS internal logger — errors are handled via try/catch
  });
}

async function ensureTopics(kafka: Kafka): Promise<void> {
  if (topicsEnsured) return;
  const admin: Admin = kafka.admin();
  try {
    await admin.connect();
    await admin.createTopics({
      waitForLeaders: false,
      topics: KAFKA_TOPICS.map((topic) => ({
        topic,
        numPartitions: 1,
        replicationFactor: 1,
      })),
    });
    console.info("[kafka] topics ensured:", KAFKA_TOPICS.join(", "));
  } catch (err) {
    // Topics may already exist — non-fatal
    console.warn("[kafka] ensureTopics:", (err as Error).message);
  } finally {
    topicsEnsured = true;
    await admin.disconnect().catch(() => {});
  }
}

async function getProducer(): Promise<Producer | null> {
  if (producer) return producer;

  const kafka = buildKafkaClient();
  if (!kafka) return null;

  try {
    await ensureTopics(kafka);
    const p = kafka.producer();
    await p.connect();
    producer = p;
    return producer;
  } catch (err) {
    console.error("[kafka] failed to connect producer:", (err as Error).message);
    return null;
  }
}

export async function publishToKafka(
  topic: string,
  message: object
): Promise<boolean> {
  const p = await getProducer();
  if (!p) return false;
  try {
    await p.send({
      topic,
      messages: [{ value: JSON.stringify(message) }],
    });
    return true;
  } catch (err) {
    console.error("[kafka] publishToKafka error:", { topic, message: (err as Error).message });
    producer = null; // reset so next call retries connection
    return false;
  }
}
