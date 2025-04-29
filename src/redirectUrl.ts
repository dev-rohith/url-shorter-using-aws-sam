import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { createResponse } from "./utils/response";

const client = new DynamoDBClient({ region: "us-east-1" });
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const { shortUrl } = event.pathParameters || {};

  if (!shortUrl) return createResponse(400, "Short URL parameter is missing");

  try {
    const params = {
      TableName: process.env.TABLE_NAME,
      Key: {
        shortId: shortUrl,
      },
    };

    const result = await ddbDocClient.send(new GetCommand(params));

    if (!result.Item) return createResponse(404, "Shortened URL not found");

    const originalUrl = result.Item.longUrl;

    return createResponse(
      301,
      "success",
      { original_url: originalUrl },
      { Location: originalUrl }
    );
  } catch (err) {
    const error = err as Error;
    return createResponse(500, "Failed to retrieve the original URL", {
      error: error.message,
    });
  }
};
