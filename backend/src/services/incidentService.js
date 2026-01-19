const { db } = require('../config/firebase');

const getAllIncidents = async (filters) => {
    const { page = 1, limit = 7, search, status, client, origin, dateStart, dateEnd } = filters;
    let query = db.collection('incidents');

    // Filtros
    if (status && status !== 'All') query = query.where('status', '==', status);
    if (client && client !== 'All') query = query.where('client', '==', client);
    if (origin && origin !== 'All') query = query.where('origin', '==', origin);
    
    // Filtrado por fecha
    if (dateStart) query = query.where('createdAt', '>=', new Date(dateStart).toISOString());
    if (dateEnd) {
       const end = new Date(dateEnd);
       end.setHours(23, 59, 59);
       query = query.where('createdAt', '<=', end.toISOString());
    }

    query = query.orderBy('createdAt', 'desc');

    const snapshot = await query.get();
    let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Búsqueda de texto en memoria
    if (search) {
        const lower = search.toLowerCase();
        data = data.filter(item => 
            (item.folio && item.folio.toLowerCase().includes(lower)) ||
            (item.title && item.title.toLowerCase().includes(lower)) ||
            (item.client && item.client.toLowerCase().includes(lower))
        );
    }

    // Paginación manual
    const total = data.length;
    const limitInt = parseInt(limit);
    const offset = (parseInt(page) - 1) * limitInt;
    const paginatedData = data.slice(offset, offset + limitInt);

    return { 
        data: paginatedData, 
        total, 
        page: parseInt(page), 
        totalPages: Math.ceil(total / limitInt) 
    };
};

const createIncident = async (data, userId) => {
    const newIncident = {
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: userId
    };
    const docRef = await db.collection('incidents').add(newIncident);
    return { id: docRef.id, ...newIncident };
};

const updateIncident = async (id, data, userId) => {
    const updateData = {
        ...data,
        updatedAt: new Date().toISOString(),
        updatedBy: userId
    };
    
    // Evitamos sobrescribir datos inmutables
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.createdBy;

    await db.collection('incidents').doc(id).update(updateData);
    return { id, ...updateData };
};

const deleteIncident = async (id) => {
    await db.collection('incidents').doc(id).delete();
    return { success: true };
};

module.exports = { getAllIncidents, createIncident, updateIncident, deleteIncident };