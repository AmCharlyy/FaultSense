const { admin } = require('../config/firebase');

const ALLOWED_DOMAINS = ['uppenjamo.edu.mx', 'gmail.com'];

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No autorizado. Falta token.', code: 'TOKEN_MISSING' });
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userEmail = decodedToken.email;

        if (!userEmail) {
            return res.status(403).json({ error: 'Token sin email.', code: 'EMAIL_MISSING' });
        }

        const userDomain = userEmail.split('@')[1].toLowerCase();
        if (!ALLOWED_DOMAINS.includes(userDomain)) {
            console.warn(`Acceso denegado: ${userEmail}`);
            return res.status(403).json({ error: 'Dominio no autorizado.', code: 'DOMAIN_NOT_ALLOWED' });
        }

        req.user = decodedToken;
        next();
    } catch (error) {
        console.error("Auth Error:", error.message);
        const code = error.code === 'auth/id-token-expired' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID';
        return res.status(401).json({ error: 'Token inválido o expirado.', code });
    }
};

module.exports = verifyToken;