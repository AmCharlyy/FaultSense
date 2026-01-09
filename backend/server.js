/**
 * BACKEND SERVER (Adaptado para Firebase Cloud Functions v2)
 * Archivo: backend/server.js
 */

const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// --- 1. CONFIGURACIÓN GLOBAL DE FIREBASE ---
// Configura la región y memoria (Opcional, pero recomendado)
setGlobalOptions({ region: "us-central1", memory: "256MiB", maxInstances: 10 });

// Inicialización automática (Sin archivo de claves)
admin.initializeApp();
const db = admin.firestore();

// --- 2. CONFIGURACIÓN DE EXPRESS ---
const app = express();

// Configuración de Seguridad y Dominios Permitidos
const ALLOWED_DOMAINS = ['uppenjamo.edu.mx', 'gmail.com'];

// CORS: 'origin: true' permite que el frontend (sea localhost o producción) se conecte.
app.use(cors({ origin: true }));

app.use(helmet());

// Reemplazo de body-parser por express nativo
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

console.log("🔥 Firebase Admin (Cloud Mode) conectado correctamente.");


// --- 3. MIDDLEWARE DE AUTENTICACIÓN ---
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
        error: 'No autorizado. Falta token.',
        errorCode: 'TOKEN_MISSING' 
    });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Verificación de Dominio
    const userEmail = decodedToken.email;
    if (!userEmail) {
        return res.status(403).json({ 
            error: 'El token de usuario no contiene un email.',
            errorCode: 'EMAIL_MISSING'
        });
    }
    // Extraer dominio y validar
    const userDomain = userEmail.split('@')[1];
    if (!ALLOWED_DOMAINS.includes(userDomain.toLowerCase())) {
      console.warn(`Acceso denegado para el dominio: ${userDomain} (Usuario: ${userEmail})`);
      return res.status(403).json({ 
          error: 'Acceso denegado. Tu dominio de correo no está autorizado.',
          errorCode: 'DOMAIN_NOT_ALLOWED'
      });
    }

    req.user = decodedToken;
    next(); 

  } catch (error) {
    console.error("Error verificando token:", error.message);
    if (error.code === 'auth/id-token-expired') {
        return res.status(401).json({ error: 'Token expirado. Por favor, inicia sesión de nuevo.', errorCode: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Token inválido.', errorCode: 'TOKEN_INVALID' });
  }
};

// Aplicar seguridad a todas las rutas /api
app.use('/api', verifyToken);


// ==========================================
//              RUTAS API
// ==========================================

// --- 1. DASHBOARD METRICS ---
app.get('/api/dashboard/metrics', async (req, res) => {
  try {
    const incidentsRef = db.collection('incidents');
    const snapshot = await incidentsRef.get();
    
    let activeTickets = 0;
    let totalSorte = 0;
    const activeClientsSet = new Set();
    let resolvedCount = 0;

    const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    docs.forEach(doc => {
      if (doc.status !== 'Resuelto' && doc.status !== 'Cerrado') activeTickets++;
      if (doc.sorte) totalSorte += Number(doc.sorte);
      if (doc.client) activeClientsSet.add(doc.client);
      if (doc.status === 'Resuelto') resolvedCount++;
    });

    // Ordenar y tomar los top 5
    docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const top5 = docs.slice(0, 5);

    const resolutionRate = docs.length > 0 ? Math.round((resolvedCount / docs.length) * 100) : 0;

    res.json({
      activeTickets,
      totalSorte,
      activeClients: activeClientsSet.size,
      resolutionRate,
      recentIncidents: top5,
      trends: {
        tickets: "Tiempo real",
        sorte: "Total Acumulado",
        clients: "Activos hoy",
        resolution: "Global"
      }
    });

  } catch (error) {
    console.error("Error Dashboard Metrics:", error);
    res.status(500).json({ error: 'Error calculando métricas' });
  }
});

// --- 2. RUTAS PARA OPCIONES DE FILTROS ---
app.get('/api/clients', async (req, res) => {
  try {
    const snapshot = await db.collection('incidents').get();
    const clientsSet = new Set();
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.client) clientsSet.add(data.client);
    });
    const clientsArray = Array.from(clientsSet).map(name => ({ name }));
    res.json(clientsArray);
  } catch (error) {
    console.error("Error fetching unique clients:", error);
    res.status(500).json({ error: 'Error obteniendo la lista de clientes' });
  }
});

app.get('/api/origins', async (req, res) => {
  try {
    const snapshot = await db.collection('incidents').get();
    const originsSet = new Set();
    snapshot.forEach(doc => {
      if (doc.data() && doc.data().origin) originsSet.add(doc.data().origin);
    });
    const originsArray = Array.from(originsSet).map(name => ({ name }));
    res.json(originsArray);
  } catch (error) {
    console.error("Error fetching unique origins:", error);
    res.status(500).json({ error: 'Error obteniendo la lista de orígenes' });
  }
});

// --- 3. Q-TICKER INCIDENTES ---
app.get('/api/incidents', async (req, res) => {
  try {
    const { page = 1, limit = 7, search, status, client, origin, dateStart, dateEnd } = req.query;
    const limitInt = parseInt(limit);

    let query = db.collection('incidents');

    if (status && status !== 'All') query = query.where('status', '==', status);
    if (client && client !== 'All') query = query.where('client', '==', client);
    if (origin && origin !== 'All') query = query.where('origin', '==', origin);
    
    if (dateStart) query = query.where('createdAt', '>=', new Date(dateStart).toISOString());
    if (dateEnd) {
       const end = new Date(dateEnd);
       end.setHours(23, 59, 59);
       query = query.where('createdAt', '<=', end.toISOString());
    }

    // Nota: Requiere índice compuesto en Firebase si usas where + orderBy
    query = query.orderBy('createdAt', 'desc');

    const snapshot = await query.get();
    let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (search) {
      const lower = search.toLowerCase();
      data = data.filter(item => 
        (item.folio && item.folio.toLowerCase().includes(lower)) ||
        (item.title && item.title.toLowerCase().includes(lower)) ||
        (item.client && item.client.toLowerCase().includes(lower))
      );
    }

    const total = data.length;
    const offset = (parseInt(page) - 1) * limitInt;
    const paginatedData = data.slice(offset, offset + limitInt);

    res.json({
      data: paginatedData,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limitInt)
    });

  } catch (error) {
    if (error.code === 9 || error.message.includes('requires an index')) {
      console.error("🚨 FALTA ÍNDICE EN FIRESTORE 🚨");
      // Intenta extraer el link del mensaje de error
      const linkMatch = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
      return res.status(400).json({ 
        error: 'Falta índice en base de datos. Revisa los logs de Firebase Functions para ver el enlace.',
        link: linkMatch ? linkMatch[0] : null
      });
    }

    console.error("Error obteniendo incidentes:", error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/incidents', async (req, res) => {
  try {
    const newIncident = {
      ...req.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.user.uid
    };
    const docRef = await db.collection('incidents').add(newIncident);
    res.status(201).json({ id: docRef.id, ...newIncident });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/incidents/:id', async (req, res) => {
  try {
    const updatedData = {
      ...req.body,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.uid
    };
    delete updatedData.id; 
    await db.collection('incidents').doc(req.params.id).update(updatedData);
    res.json({ id: req.params.id, ...updatedData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/incidents/:id', async (req, res) => {
  try {
    await db.collection('incidents').doc(req.params.id).delete();
    res.status(200).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- 4. SCHADENTISCH (NC PARTS) ---
app.get('/api/nc-parts', async (req, res) => {
  try {
    const snapshot = await db.collection('nc_parts').orderBy('createdAt', 'desc').get();
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(data);
  } catch (error) {
    if (error.code === 9 || error.message.includes('requires an index')) {
      return res.status(400).json({ error: 'Falta índice en NC-PARTS.' });
    }
    res.status(500).json({ error: 'Error interno nc-parts' });
  }
});

app.post('/api/nc-parts', async (req, res) => {
  try {
    const newPart = { ...req.body, createdAt: new Date().toISOString(), createdBy: req.user.uid };
    const docRef = await db.collection('nc_parts').add(newPart);
    res.status(201).json({ id: docRef.id, ...newPart });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/nc-parts/:id', async (req, res) => {
  try {
    const data = { ...req.body, updatedBy: req.user.uid };
    delete data.id;
    await db.collection('nc_parts').doc(req.params.id).update(data);
    res.json({ id: req.params.id, ...data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/nc-parts/:id', async (req, res) => {
  try {
    await db.collection('nc_parts').doc(req.params.id).delete();
    res.status(200).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- 5. PERFIL DE USUARIO ---
app.get('/api/user/profile', async (req, res) => {
  try {
    const userId = req.user.uid;
    const userRef = db.collection('users').doc(userId);
    const doc = await userRef.get();

    if (!doc.exists) {
      console.log(`Creando perfil por defecto: ${userId}`);
      const defaultProfile = {
        name: req.user.name || 'Usuario Nuevo',
        email: req.user.email,
        role: 'Ingeniero',
        avatar: req.user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(req.user.email)}`,
        settings: { theme: 'light', notifications: true }
      };
      await userRef.set(defaultProfile);
      return res.status(201).json({ id: userId, ...defaultProfile });
    }
    
    res.json({ id: doc.id, ...doc.data() });

  } catch (error) {
    console.error("Error Profile:", error);
    res.status(500).json({ error: 'Error perfil usuario' });
  }
});

app.put('/api/user/profile', async (req, res) => {
  try {
    const userId = req.user.uid;
    const userRef = db.collection('users').doc(userId);
    const { name, avatar, settings } = req.body; 

    const dataToUpdate = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (avatar !== undefined) dataToUpdate.avatar = avatar;
    if (settings !== undefined) dataToUpdate.settings = settings;

    if (Object.keys(dataToUpdate).length === 0) {
        return res.status(400).json({ error: 'Sin datos para actualizar' });
    }
    
    dataToUpdate.updatedAt = new Date().toISOString();
    await userRef.update(dataToUpdate);

    const updatedDoc = await userRef.get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });

  } catch (error) {
    res.status(500).json({ error: 'Error actualizando perfil' });
  }
});


// ==========================================
//    EXPORTACIÓN PARA FIREBASE FUNCTIONS
// ==========================================

// Esta es la línea mágica que reemplaza a app.listen()
exports.api = onRequest(app);