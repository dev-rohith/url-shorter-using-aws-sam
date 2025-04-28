// utils/response.ts

export interface ApiResponse {
  statusCode: number;
  body: string;
  headers?: { [key: string]: string };
}

export const createResponse = (
  statusCode: number,
  message: string,
  data?: object,
  headers?: { [key: string]: string }
): ApiResponse => {
  return {
    statusCode,
    body: JSON.stringify({ message, data }),
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };
};
