const app = require('express')();
const http = require('http').createServer(app);
const cors = require('cors');

app.use(cors())

const { Server } = require('socket.io');

const SERVER_PORT = process.env.SERVER_PORT || 4000

const io = new Server(http, {
    cors: {
        origin: `http://localhost:${3000}`,
        methods: ['GET', 'POST']
    }
});

// TODO: 
// Store list of connected rooms &: 
// store following: for each player 
// room id
// username
// isVoting
// vote
// isVisible
// On browser refresh reconnect users to the same room id only if exists (at least one player is in the room)

let players = [];
io.on("connection", (socket) => {
    socket.on("create-room", (data) => {
        const roomId = data.roomId;
        data.host.socketId = socket.id
        // creates/joins room by specified id
        socket.join(roomId);
        const foundPlayer = players.find(p => p.roomId === data.host.roomId);
        if (!foundPlayer) {
            players.push(data.host);
        }
    });

    socket.on("join-room", async (data) => {
        const { player } = data;
        player.socketId = socket.id
        const foundPlayer = players.find(p => p.id === player.id && p.roomId === data.roomId)
        if (!foundPlayer) {
            players.push(player);
        }
        socket.join(player.roomId)
        console.log("join room players: ", players)
        // send to all in room including sender
        io.in(data.roomId).emit('update-players', { players, player})   
    });

    socket.on('add-story', (data) => {
            // send to all except sender
            socket.to(data.room).emit('add-story', data.story)  
    });

    socket.on('set-view-story', (data) => {
       io.in(data.room).emit('view-story', data.story)
    })

    socket.on('start-voting', (data) => {
        io.in(data.room).emit('voting-started', data)  
    });

    socket.on('add-votes', (data) => {
        io.in(data.room).emit('set-votes', data)
    });

    socket.on('set-hide-show', (data) => {
        io.in(data.roomId).emit('hide-show-votes', data.hideShowVotes)   
    });

    socket.on('set-stop-voting', (data) => {
        io.in(data.roomId).emit('stop-voting', data.hideShowVotes) 
    }) 

    socket.on('disconnect', () => {
        // TODO: cleanup => remove disconnected socke
        const playerToRemoveIndex = players.findIndex(elem => elem.socketId === socket.id)
        players.splice(playerToRemoveIndex, 1);
       
        // TODO: emit to everyone player disconnected
        // If disconected player is host ideally: assign host to other available

        if(players.length >= 1) {
            io.in(players[0].roomId).emit('update-players', { players })
        }
    });
});

http.listen(SERVER_PORT, () => {
    console.log(`listening on port: ${SERVER_PORT}`)
})