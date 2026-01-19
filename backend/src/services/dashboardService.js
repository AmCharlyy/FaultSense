const { db } = require('../config/firebase');

const getMetrics = async () => {
    const incidentsRef = db.collection('incidents');

    // 1. Agregaciones eficientes (No descargan los documentos, solo cuentan)
    const activeSnapshot = await incidentsRef
        .where('status', 'not-in', ['Resuelto', 'Cerrado'])
        .count().get();
    
    const resolvedSnapshot = await incidentsRef
        .where('status', '==', 'Resuelto')
        .count().get();

    const totalSnapshot = await incidentsRef.count().get();

    // 2. Para "activeClients" y "Sorte", lamentablemente Firestore requiere leer o tener un contador separado.
    // Para no romper tu frontend ahora, haremos una consulta optimizada solo trayendo los campos necesarios.
    const statsQuery = await incidentsRef.select('client', 'sorte').get();
    
    let totalSorte = 0;
    const clientsSet = new Set();
    
    statsQuery.forEach(doc => {
        const data = doc.data();
        if (data.sorte) totalSorte += Number(data.sorte);
        if (data.client) clientsSet.add(data.client);
    });

    // 3. Incidentes recientes (Solo traemos 5, no todos)
    const recentQuery = await incidentsRef.orderBy('createdAt', 'desc').limit(5).get();
    const recentIncidents = recentQuery.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const activeTickets = activeSnapshot.data().count;
    const resolvedCount = resolvedSnapshot.data().count;
    const totalDocs = totalSnapshot.data().count;

    const resolutionRate = totalDocs > 0 ? Math.round((resolvedCount / totalDocs) * 100) : 0;

    return {
        activeTickets,
        totalSorte,
        activeClients: clientsSet.size,
        resolutionRate,
        recentIncidents,
        trends: { tickets: "Tiempo real", sorte: "Total Acumulado", clients: "Activos hoy", resolution: "Global" }
    };
};

module.exports = { getMetrics };