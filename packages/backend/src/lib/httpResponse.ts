import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.FRONTEND_ORIGIN ?? '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

export function jsonResponse(
  statusCode: number,
  body: unknown,
): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    body: JSON.stringify(body),
  };
}

export function okResponse(body: unknown): APIGatewayProxyStructuredResultV2 {
  return jsonResponse(200, body);
}

export function errorResponse(
  statusCode: number,
  message: string,
): APIGatewayProxyStructuredResultV2 {
  return jsonResponse(statusCode, { error: message });
}
