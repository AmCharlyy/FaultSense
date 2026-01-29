// 👇 CAMBIO IMPORTANTE: Importamos desde tu configuración centralizada
const { db, bucket } = require('../config/firebase'); 
const { v4: uuidv4 } = require('uuid');

// 1. Subir Archivo
exports.uploadFile = async (req, res, next) => {
  try {
    const { name, url, type, size, userId, userName } = req.body;

    if (!userId) throw new Error("User ID is required");

    // Decodificar Base64
    const base64Data = url.split(';base64,').pop();
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Crear referencia en Storage
    const fileId = uuidv4();
    const extension = name.split('.').pop();
    const fileName = `uploads/${userId}/${fileId}.${extension}`;
    const file = bucket.file(fileName);

    // Guardar físico
    await file.save(buffer, {
      metadata: { contentType: type },
      public: true
    });

    // URL Pública
    // Nota: Si tu bucket es privado, aquí deberías generar una Signed URL.
    // Para este caso, usamos la URL pública directa de Google Storage.
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    // Guardar Metadatos en Firestore
    const docRef = db.collection('cloud_files').doc(fileId);
    const fileData = {
      id: fileId,
      name,
      url: publicUrl,
      storagePath: fileName,
      type,
      size,
      ownerId: userId,
      ownerName: userName,
      createdAt: new Date().toISOString()
    };
    
    await docRef.set(fileData);

    res.status(200).json(fileData);
  } catch (error) {
    next(error); // Pasamos el error al middleware global
  }
};

// 2. Listar Archivos (Filtrado por Usuario)
exports.getFiles = async (req, res, next) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const snapshot = await db.collection('cloud_files')
      .where('ownerId', '==', userId)
      .get();
    
    const files = snapshot.docs.map(doc => doc.data());
    
    // Ordenamos en memoria (Javascript) para evitar errores de índice al inicio
    files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json(files);
  } catch (error) {
    next(error);
  }
};

// 3. Borrar Uno
exports.deleteFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const docRef = db.collection('cloud_files').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return res.status(404).json({ error: "File not found" });

    const data = doc.data();

    // Borrar de Storage si existe path
    if (data.storagePath) {
      try { await bucket.file(data.storagePath).delete(); } catch(e) {
        console.warn("Archivo físico no encontrado o ya borrado");
      }
    }

    // Borrar de Base de Datos
    await docRef.delete();
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

// 4. Borrado Masivo
exports.bulkDelete = async (req, res, next) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids)) {
        return res.status(400).json({ error: "Invalid IDs array" });
    }

    const batch = db.batch();

    // Procesamos en paralelo para mayor velocidad
    const deletePromises = ids.map(async (id) => {
      const docRef = db.collection('cloud_files').doc(id);
      const doc = await docRef.get();
      if (doc.exists) {
        const data = doc.data();
        // Intentar borrar de storage (sin bloquear si falla)
        if (data.storagePath) {
            bucket.file(data.storagePath).delete().catch(() => {});
        }
        batch.delete(docRef);
      }
    });

    await Promise.all(deletePromises);
    await batch.commit();

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};