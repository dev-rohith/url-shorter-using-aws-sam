import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { handler } from "../../shortenUrl";
import { describe, it, expect, jest, afterAll, afterEach, beforeEach } from "@jest/globals";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
const dynamoDBMock = mockClient(DynamoDBDocumentClient);

process.env.TABLE_NAME = 'UrlShortener'

export const baseEvent: Partial<APIGatewayProxyEvent> = {
  httpMethod: "POST",
  body: "",
  headers: {},
  isBase64Encoded: false,
  multiValueHeaders: {},
  multiValueQueryStringParameters: {},
  path: "/shorten",
  pathParameters: null,
  queryStringParameters: null,
  requestContext: {
    accountId: "123456789012",
    apiId: "api-id",
    authorizer: {},
    httpMethod: "POST",
    identity: {
      accessKey: "",
      accountId: "",
      apiKey: "",
      apiKeyId: "",
      caller: "",
      clientCert: null,
      cognitoAuthenticationProvider: "",
      cognitoAuthenticationType: "",
      cognitoIdentityId: "",
      cognitoIdentityPoolId: "",
      principalOrgId: "",
      sourceIp: "127.0.0.1",
      user: "",
      userAgent: "jest",
      userArn: "",
    },
    path: "/shorten",
    protocol: "HTTP/1.1",
    requestId: "abc123",
    requestTimeEpoch: 1610000000000,
    resourceId: "resource-id",
    resourcePath: "/shorten",
    stage: "prod",
  },
  resource: "",
  stageVariables: null,
};

beforeEach(() => {
  process.env.TABLE_NAME = "AssetManagement-TestStack";
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

describe("Unit test for shortenUrl handler", () => {
  it("returns 400 when body is missing", async () => {
    const event = baseEvent as APIGatewayProxyEvent;
    const result: APIGatewayProxyResult = await handler({ ...event, body: "" });

    expect(result.statusCode).toBe(400);
    expect(result.body).toBe(
      JSON.stringify({ message: "Request body is missing" })
    );
  });

  it("returns 400 for invalid URL", async () => {
    const event = baseEvent as APIGatewayProxyEvent;
    const body = JSON.stringify({ source_url: "not-a-valid-url" });
    const result: APIGatewayProxyResult = await handler({ ...event, body });

    expect(result.statusCode).toBe(400);
    expect(result.body).toBe(
      JSON.stringify({
        message:
          "Please provide a valid URL that starts with http or https: and includes www. in the domain.",
      })
    );
  });

  it("returns 500 on internal error", async () => {
    dynamoDBMock.on(PutCommand).rejects(new Error("Simulated failure"));
  
    const body = JSON.stringify({ source_url: "https://www.example.com" });
  
    const result: APIGatewayProxyResult = await handler({
      ...(baseEvent as APIGatewayProxyEvent),
      body,
    });
  
    expect(result.statusCode).toBe(500);
    const parsed = JSON.parse(result.body);
    expect(parsed.message || parsed.error).toMatch(/Internal server error/);
  });

  it("returns 200 and shortened URL for valid URL", async () => {
    const event = baseEvent as APIGatewayProxyEvent;
    const body = JSON.stringify({
      source_url: "https://www.antstack.com",
    });
    const result: APIGatewayProxyResult = await handler({ ...event, body });

    expect(result.statusCode).toBe(200);

    const parsed = JSON.parse(result.body);
    expect(parsed.message).toBe("Shortened URL created successfully");
    expect(parsed.data.shortUrl).toMatch(/^https/);
  });
});
