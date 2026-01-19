const errorHandler = (err, req, res, next) => {
    console.error("❌ Error del Servidor:", err.stack);
    
    // Si el error tiene un código de estado (status), úsalo. Si no, 500.
    const statusCode = err.status || 500;
    
    res.status(statusCode).json({
        error: err.message || 'Error interno del servidor',
        errorCode: err.code || 'INTERNAL_ERROR'
    });
};

module.exports = errorHandler;