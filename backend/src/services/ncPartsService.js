const { db } = require('../config/firebase');

const getAllParts = async () => {
    // Usamos orderBy para traer las más recientes primero
    const snapshot = await db.collection('nc_parts').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

const createPart = async (data, userId) => {
    const newPart = { 
        ...data, 
        createdAt: new Date().toISOString(), 
        createdBy: userId 
    };
    const docRef = await db.collection('nc_parts').add(newPart);
    return { id: docRef.id, ...newPart };
};

const updatePart = async (id, data, userId) => {
    const updateData = { ...data, updatedBy: userId };
    delete updateData.id; // Evitar sobrescribir el ID
    await db.collection('nc_parts').doc(id).update(updateData);
    return { id, ...updateData };
};

const deletePart = async (id) => {
    await db.collection('nc_parts').doc(id).delete();
    return { success: true };
};

module.exports = { getAllParts, createPart, updatePart, deletePart };