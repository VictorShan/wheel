import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { env } from "~/env";

/**
 * One client for the whole process: the SDK keeps its connections alive, so requests after the
 * first skip the TLS handshake that makes a "low latency" store feel anything but.
 *
 * `DDB_ENDPOINT` points at a local DynamoDB (dynalite, DynamoDB Local) for development and tests;
 * unset in production, where the region and the ambient credentials decide the target.
 */
const client = new DynamoDBClient({
  region: env.AWS_REGION,
  endpoint: env.DDB_ENDPOINT,
  // Fail fast rather than holding a page load open: a retry costs less than a hung request.
  requestHandler: { connectionTimeout: 1000, requestTimeout: 3000 },
  maxAttempts: 3,
});

export const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    // Optional fields are modelled as absent attributes rather than nulls.
    removeUndefinedValues: true,
  },
});

export const TABLE_NAME = env.DDB_TABLE_NAME;
