#!/usr/bin/env node

const http = require('http');
const url = require('url');

console.log('🚀 Iniciando Webhook Receiver Simple...');

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json');

    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Root endpoint - info
    if (parsedUrl.pathname === '/') {
        const info = {
            service: 'Mattermost Reactions Plugin - Webhook Receiver',
            status: 'running',
            endpoints: [
                'POST /webhook - Receive reaction webhooks',
                'GET /health - Health check',
                'GET / - This info'
            ],
            timestamp: new Date().toISOString()
        };

        res.writeHead(200);
        res.end(JSON.stringify(info, null, 2));
        return;
    }

    // Health check
    if (parsedUrl.pathname === '/health') {
        const health = {
            status: 'OK',
            service: 'webhook-receiver',
            timestamp: new Date().toISOString()
        };

        res.writeHead(200);
        res.end(JSON.stringify(health, null, 2));
        return;
    }

    // Webhook endpoint
    if (parsedUrl.pathname === '/webhook' && req.method === 'POST') {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const data = JSON.parse(body);

                // Log webhook recibido
                console.log('\n🎉 WEBHOOK RECIBIDO:');
                console.log('Timestamp:', new Date().toISOString());
                console.log('URL:', req.url);
                console.log('Method:', req.method);
                console.log('Headers:', JSON.stringify(req.headers, null, 2));
                console.log('Body:', JSON.stringify(data, null, 2));
                console.log('================================\n');

                // Respuesta exitosa
                const response = {
                    status: 'received',
                    timestamp: new Date().toISOString(),
                    data: data
                };

                res.writeHead(200);
                res.end(JSON.stringify(response, null, 2));

            } catch (error) {
                console.error('❌ Error parsing JSON:', error.message);
                console.error('Raw body:', body);

                const errorResponse = {
                    status: 'error',
                    message: 'Invalid JSON',
                    timestamp: new Date().toISOString()
                };

                res.writeHead(400);
                res.end(JSON.stringify(errorResponse, null, 2));
            }
        });

        return;
    }

    // 404 para rutas no encontradas
    const notFound = {
        status: 'error',
        message: 'Not Found',
        path: parsedUrl.pathname,
        method: req.method,
        timestamp: new Date().toISOString()
    };

    res.writeHead(404);
    res.end(JSON.stringify(notFound, null, 2));
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
    console.log(`🚀 Webhook receiver running on http://${HOST}:${PORT}`);
    console.log(`📡 Main endpoint: http://localhost:${PORT}/webhook`);
    console.log(`🩺 Health check: http://localhost:${PORT}/health`);
    console.log(`📊 Info: http://localhost:${PORT}/`);
    console.log('');
    console.log('💡 Para probar:');
    console.log(`   curl http://localhost:${PORT}/health`);
    console.log(`   curl -X POST http://localhost:${PORT}/webhook -H "Content-Type: application/json" -d '{"test":"data"}'`);
    console.log('');
    console.log('Esperando webhooks... 🎯');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Recibida señal de parada. Cerrando servidor...');
    server.close(() => {
        console.log('✅ Servidor cerrado correctamente.');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Recibida señal de terminación. Cerrando servidor...');
    server.close(() => {
        console.log('✅ Servidor cerrado correctamente.');
        process.exit(0);
    });
});
