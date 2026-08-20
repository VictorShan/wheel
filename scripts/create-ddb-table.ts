/**
 * Creates the wheel's DynamoDB table if it isn't there yet. Safe to re-run.
 *
 *   npm run ddb:create-table
 *
 * Reads AWS_REGION, DDB_TABLE_NAME and the optional DDB_ENDPOINT from .env, so the same script
 * provisions a local DynamoDB and a real one.
 */
import {
  CreateTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
  ResourceNotFoundException,
  waitUntilTableExists,
} from "@aws-sdk/client-dynamodb";

const region = process.env.AWS_REGION;
const tableName = process.env.DDB_TABLE_NAME;
if (!region || !tableName) {
  throw new Error("AWS_REGION and DDB_TABLE_NAME must be set");
}

const client = new DynamoDBClient({
  region,
  endpoint: process.env.DDB_ENDPOINT,
});

try {
  await client.send(new DescribeTableCommand({ TableName: tableName }));
  console.log(`Table ${tableName} already exists`);
} catch (error) {
  if (!(error instanceof ResourceNotFoundException)) throw error;
  await client.send(
    new CreateTableCommand({
      TableName: tableName,
      // Everything about one wheel shares a partition key, so a wheel is read with one query.
      KeySchema: [
        { AttributeName: "pk", KeyType: "HASH" },
        { AttributeName: "sk", KeyType: "RANGE" },
      ],
      AttributeDefinitions: [
        { AttributeName: "pk", AttributeType: "S" },
        { AttributeName: "sk", AttributeType: "S" },
      ],
      // Traffic is a handful of lunch decisions a day: on-demand is both cheaper and one less
      // thing to tune.
      BillingMode: "PAY_PER_REQUEST",
    }),
  );
  await waitUntilTableExists(
    { client, maxWaitTime: 120 },
    { TableName: tableName },
  );
  console.log(`Created table ${tableName}`);
}
