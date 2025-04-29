import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import ShortUniqueId from "short-unique-id";

import { createResponse } from "./utils/response";
import { validateUrl } from "./utils/validators";

const client = new DynamoDBClient({ region: "us-east-1" });
const ddbDocClient = DynamoDBDocumentClient.from(client);
// marshallOptions: { removeUndefinedValues: true } to ensure the data

const uid: any = new ShortUniqueId();

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) return createResponse(400, "Request body is missing");

    const { source_url } = JSON.parse(event.body);
    if (!source_url) return createResponse(400, "Source url is required");


    const urlValidationResult = validateUrl(source_url);
    if (!urlValidationResult.valid)
      return createResponse(400, urlValidationResult.message);
    const stage = event.requestContext.stage
    const baseUrl = event.multiValueHeaders.Host;
    const shortId = uid.randomUUID();
    const shortUrl = `https://${baseUrl}/${stage}/${shortId}`;

    const params = {
      TableName: process.env.TABLE_NAME,
      Item: {
        shortId,
        longUrl: source_url,
        shortUrl,
      },
    };

    await ddbDocClient.send(new PutCommand(params));

    return createResponse(200, "Shortened URL created successfully", {
      shortUrl,
    });
  } catch (err: unknown) {
    const error = err as Error
    return createResponse(500, "Internal server error", {
      error 
    });
  }
};
