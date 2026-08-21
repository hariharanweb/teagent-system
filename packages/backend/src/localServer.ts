import './lib/loadEnv.js';
import express, { type NextFunction, type Request, type Response } from 'express';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { verifyJwt } from './auth/jwt.js';
import type { LambdaAuthorizerContext } from './lib/authContext.js';

import { handler as healthHandler } from './handlers/health.js';
import { handler as loginHandler } from './handlers/auth/login.js';
import { handler as familyProfilesHandler } from './handlers/auth/familyProfiles.js';
import { handler as presignHandler } from './handlers/uploads/presign.js';
import { handler as extractHandler } from './handlers/chapters/extract.js';
import { handler as lessonPlanHandler } from './handlers/chapters/lessonPlan.js';
import { handler as chatAskHandler } from './handlers/chat/ask.js';

const PORT = process.env.PORT ?? 3000;

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

type Handler<E> = (event: E) => Promise<APIGatewayProxyStructuredResultV2>;

function toEvent(req: Request, authorizerContext?: LambdaAuthorizerContext) {
  return {
    body: JSON.stringify(req.body ?? {}),
    headers: req.headers,
    requestContext: authorizerContext ? { authorizer: { lambda: authorizerContext } } : undefined,
  } as unknown;
}

function mount<E>(
  method: 'get' | 'post',
  path: string,
  handler: Handler<E>,
  requireAuth: boolean,
) {
  app[method](path, async (req: Request, res: Response, next: NextFunction) => {
    try {
      let authContext: LambdaAuthorizerContext | undefined;
      if (requireAuth) {
        const header = req.headers.authorization;
        if (!header?.startsWith('Bearer ')) {
          res.status(401).json({ error: 'Unauthorized' });
          return;
        }
        try {
          const claims = await verifyJwt(header.slice('Bearer '.length));
          authContext = { profileId: claims.sub, familyId: claims.familyId, role: claims.role };
        } catch {
          res.status(401).json({ error: 'Unauthorized' });
          return;
        }
      }

      const result = await handler(toEvent(req, authContext) as E);
      res.status(result.statusCode ?? 200);
      if (result.headers) {
        for (const [key, value] of Object.entries(result.headers)) {
          if (value !== undefined) res.setHeader(key, String(value));
        }
      }
      res.send(result.body);
    } catch (err) {
      next(err);
    }
  });
}

mount('get', '/health', healthHandler, false);
mount('post', '/auth/login', loginHandler, false);
mount('get', '/auth/family-profiles', familyProfilesHandler, true);
mount('post', '/uploads/presign', presignHandler, true);
mount('post', '/chapters/extract', extractHandler, true);
mount('post', '/chapters/lesson-plan', lessonPlanHandler, true);
mount('post', '/chat/ask', chatAskHandler, true);

app.listen(PORT, () => {
  console.log(`Teagent backend (local dev) listening on http://localhost:${PORT}`);
});
