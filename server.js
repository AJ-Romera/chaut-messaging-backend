// importing
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import Messages from './dbMessages.js';
import Rooms from './dbRooms.js';
import Pusher from 'pusher';
import cors from 'cors';

dotenv.config();

// app config
const app = express();
const port = process.env.PORT || 9000;

const pusher = new Pusher({
    appId: '1146398',
    key: '1a91a311edf5e98e65c7',
    secret: '89a56875d65b5317573a',
    cluster: 'eu',
    useTLS: true,
});

// middleware
app.use(express.json());
app.use(cors());

// DB config
const connection_url = process.env.MONGODB_URI;
mongoose.connect(connection_url, {
    useCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const db = mongoose.connection;

db.once('open', () => {
    console.log('DB connected');

    const msgCollection = db.collection('messagecontents');
    const changeStream = msgCollection.watch();

    changeStream.on('change', (change) => {
        console.log('A change ocurred', change);

        if (change.operationType === 'insert') {
            const messageDetails = change.fullDocument;
            pusher.trigger('messages', 'inserted', {
                name: messageDetails.name,
                message: messageDetails.message,
                timestamp: messageDetails.timestamp,
                received: messageDetails.received,
            });
        } else {
            console.log('Error triggering Pusher');
        }
    });

    const roomCollection = db.collection('rooms');
    const roomChangeStream = roomCollection.watch();

    roomChangeStream.on('change', (change) => {
        console.log('A change ocurred', change);

        if (change.operationType === 'insert') {
            const roomDetails = change.fullDocument;
            pusher.trigger('rooms', 'inserted', {
                name: roomDetails.name,
            });
        } else {
            console.log('Error triggering Pusher');
        }
    });
});

// api routes
app.get('/', (req, res) => res.status(200).send('hello world'));

app.get('/messages/sync', (req, res) => {
    Messages.find((err, data) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(200).send(data);
        }
    });
});

app.post('/messages/new', (req, res) => {
    const dbMessage = req.body;

    Messages.create(dbMessage, (err, data) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(201).send(data);
        }
    });
});

app.get('/rooms/sync', (req, res) => {
    Rooms.find((err, data) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(200).send(data);
        }
    });
});

app.post('/rooms/new', (req, res) => {
    const dbRoom = req.body;

    Rooms.create(dbRoom, (err, data) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(201).send(data);
        }
    });
});

// listen
app.listen(port);
