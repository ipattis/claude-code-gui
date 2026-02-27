import { Request, Response, NextFunction } from 'express';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

// Initialize the verifier
// NOTE: For local development / sandbox without a user pool yet,
// we can skip verification if the env vars are missing.
const verifier = process.env.COGNITO_USER_POOL_ID && process.env.COGNITO_CLIENT_ID
    ? CognitoJwtVerifier.create({
        userPoolId: process.env.COGNITO_USER_POOL_ID,
        tokenUse: "access",
        clientId: process.env.COGNITO_CLIENT_ID,
    })
    : null;

// Extends Express Request type
export interface AuthenticatedRequest extends Request<any, any, any, any, Record<string, any>> {
    user?: any;
}

export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // If Cognito variables not set, we're likely in local sandbox mode, skip auth
    if (!verifier) {
        return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const payload = await verifier.verify(token);
        req.user = payload;
        next();
    } catch (err: any) {
        console.error("Token verification failed!", err);
        return res.status(403).json({ error: 'Token verification failed' });
    }
};
