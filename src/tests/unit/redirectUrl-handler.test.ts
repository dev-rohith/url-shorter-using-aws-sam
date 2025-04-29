import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { handler } from "../../redirectUrl";
import { afterAll, afterEach, expect, jest } from "@jest/globals";
import { beforeEach, describe, it } from "node:test";
import { baseEvent } from "./shortenUrl-handler.test";

const consoleErrorSpy = jest
  .spyOn(console, "error")
  .mockImplementation(() => {});
const dynamoDBMock = mockClient(DynamoDBDocumentClient);

process.env.TABLE_NAME = "UrlShortener";

beforeEach(() => {
  dynamoDBMock.reset();
  jest.clearAllMocks();
});

afterEach(() => {
  consoleErrorSpy.mockClear();
});

afterAll(() => {
  consoleErrorSpy.mockRestore();
  jest.restoreAllMocks();
  jest.resetModules();
});

describe("Unit tests for getShortUrl handler", () => {
  it("returns 400 when shortUrl is missing", async () => {
    const event: APIGatewayProxyEvent = {
      ...(baseEvent as APIGatewayProxyEvent),
      pathParameters: null,
    };

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(result.body).toBe(
      JSON.stringify({ message: "Short URL parameter is missing" })
    );
  });

  it("returns 404 when item is not found", async () => {
    dynamoDBMock.on(GetCommand).resolves({});

    const event: APIGatewayProxyEvent = {
      ...(baseEvent as APIGatewayProxyEvent),
      pathParameters: { shortCode: "6s8hj" },
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(404);
    expect(result.body).toBe(
      JSON.stringify({ message: "Shortened URL not found" })
    );
  });

  it("returns 301 redirect when item is found", async () => {
    dynamoDBMock.on(GetCommand).resolves({
      Item: {
        longUrl: "https://www.example.com",
      },
    });

    const event: APIGatewayProxyEvent = {
      ...(baseEvent as APIGatewayProxyEvent),
      pathParameters: { shortCode: "6s8hj" },
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(301);
    const parsed = JSON.parse(result.body);
    expect(parsed.message).toBe("success");
    expect(parsed.data.original_url).toBe("https://www.example.com");
    expect(result.headers?.Location).toBe("https://www.example.com");
  });

  it("returns 500 on internal error", async () => {
    dynamoDBMock.on(GetCommand).rejects(new Error("Simulated DB error"));

    const event: APIGatewayProxyEvent = {
      ...(baseEvent as APIGatewayProxyEvent),
      pathParameters: { shortCode: "6s8hj" },
    };
    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    const parsed = JSON.parse(result.body);
    expect(parsed.message).toBe("Failed to retrieve the original URL");
    expect(parsed.error).toMatch(/Simulated DB error/);
  });
});
