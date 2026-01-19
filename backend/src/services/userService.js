const { db } = require('../config/firebase');

const getProfile = async (userToken) => {
    const userId = userToken.uid;
    const userRef = db.collection('users').doc(userId);
    const doc = await userRef.get();

    if (!doc.exists) {
        // Lógica de "Lazy Creation": Si no existe, se crea al vuelo
        const defaultProfile = {
            name: userToken.name || 'Usuario Nuevo',
            email: userToken.email,
            role: 'Sin asignar',
            avatar: userToken.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(userToken.email)}`,
            settings: { theme: 'light', notifications: true },
            createdAt: new Date().toISOString()
        };
        await userRef.set(defaultProfile);
        return { id: userId, ...defaultProfile };
    }
    
    return { id: doc.id, ...doc.data() };
};

const updateProfile = async (userId, data) => {
    // 1. Extraemos TODOS los campos que envía el frontend
    const { name, avatar, settings, phone, department, location, bio } = data;
    
    const dataToUpdate = {};
    
    // 2. "Whitelisting": Solo agregamos al objeto de actualización lo que está permitido y definido
    if (name !== undefined) dataToUpdate.name = name;
    if (avatar !== undefined) dataToUpdate.avatar = avatar;
    if (settings !== undefined) dataToUpdate.settings = settings;
    
    // --- NUEVOS CAMPOS ---
    if (phone !== undefined) dataToUpdate.phone = phone;
    if (department !== undefined) dataToUpdate.department = department;
    if (location !== undefined) dataToUpdate.location = location;
    if (bio !== undefined) dataToUpdate.bio = bio;

    if (Object.keys(dataToUpdate).length === 0) {
        throw new Error('Sin datos para actualizar');
    }

    dataToUpdate.updatedAt = new Date().toISOString();
    
    const userRef = db.collection('users').doc(userId);
    
    // Usamos .set con { merge: true } para mayor seguridad (crea o actualiza)
    await userRef.set(dataToUpdate, { merge: true });
    
    const updatedDoc = await userRef.get();
    return { id: updatedDoc.id, ...updatedDoc.data() };
};

module.exports = { getProfile, updateProfile };