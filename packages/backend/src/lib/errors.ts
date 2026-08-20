export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Unauthorized') {
    super(401, message);
  }
}

export class ValidationError extends HttpError {
  constructor(message = 'Invalid request') {
    super(422, message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Not found') {
    super(404, message);
  }
}

export class RateLimitedError extends HttpError {
  constructor(message = 'Too many requests today, try again tomorrow') {
    super(429, message);
  }
}
