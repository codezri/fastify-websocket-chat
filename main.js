const fastify = require('fastify')();
const path = require('path')

fastify.register(require('fastify-websocket'), {options: {clientTracking: true}});
fastify.register(require('fastify-static'), {
    root: path.join(__dirname, 'www')
})

fastify.addHook('preValidation', async (request, reply) => {
    if(request.routerPath == '/chat' && !request.query.username) {
        reply.code(403).send('Connection rejected');
    }
})

fastify.get('/chat', { websocket: true }, (connection, req) => {
    // New user
    broadcast({
        sender: '__server',
        message: `${req.query.username} joined`
    });

    // Leaving user
    connection.socket.on('close', () => {
        broadcast({
            sender: '__server',
            message: `${req.query.username} left`
        });
    });

    // Broadcast incoming message
    connection.socket.on('message', (message) => {
        message = JSON.parse(message.toString());
        broadcast({
            sender: req.query.username,
            ...message
        });
    });
});

fastify.listen({ port: 3000 }, (err, address) => {
    if(err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Server listening at: ${address}`);
});

function broadcast(message) {
    for(let client of fastify.websocketServer.clients) {
        client.send(JSON.stringify(message));
    }
}
