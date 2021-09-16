var EventEmitter = require('eventemitter3');
var socketCluster = require("socketcluster-client");
var Util = require("./utils.js");



class Client extends EventEmitter {
    constructor(options) {
        super();

        this.uri = options.uri || "www.pianorhythm.me";
        this.path = options.path || "/socketcluster/";
        this.serverTimeOffset = 0;
        this.channel = undefined;
        this.ppl = {};
        this.pingInterval = 2000;
        this.canConnect = false;
        this.noteBuffer = [];
        this.noteBufferTime = Date.now();
        this.noteFlushInterval = 200;
        this.userColor = options.userColor;
        this.multiplex = options.multiplex;
        this.secure = options.secure;
        this.clientName = options.username;
        this.password = options.password || "";

        /*
            Options format: 
            let options = {
              uri: "www.pianorhythm.me",
              path: "/socketcluster/",
              userColor: "#7d9cf5",
              multiplex: true,
              secure: true,
              username: "Username"
              password: "Password" <-- Leave blank if you want to login as a guest
            }
        */

    }

    start() {
        this.canConnect = true;
        this.connect();
    }

    stop() {
        this.canConnect = false;
        this.socket.emit("disconnect");
    }

    connect() {
        this.socket = socketCluster.create({
            path: this.path,
            hostname: this.uri,
            secure: this.secure,
            multiplex: this.multiplex
        });

        this.socket.on("setName", (data) => this.onSetName(data));
        this.socket.on("setRoom", (data) => this.onSetRoom(data));

        this.socket.on("connect", () => {
            this.socketID = this.socket.id;

            if (!this.password) {
                this.socket.emit("register", {
                    name: this.clientName,
                    roomName: this.channel
                });
            } else {
                this.socket.emit("login", {
                    username: this.clientName,
                    roomName: this.channel,
                    password: this.password
                });
            }

            console.log("Socket ID:", this.socket.id)
            setInterval(() => this.sendPing(), this.pingInterval);
            this.sendPing();
        });
    }

    setName(name) {
        this.clientName = name;
    }

    setChannel(channel) {
        if (this.channel == undefined) {
            this.channel = channel;
        } else {
            this.socket.emit("joinRoom", {
                roomName: channel,
                ID: channel,
            });
        }
    }

    sendPing() {
        this.socket.emit("ping", null, (err, res) => {
            if (res) {
                this.receiveServerTime(res);
            }
        });
    }

    receiveServerTime(time) {
        let now = Date.now();
        let target = time - now;
        let duration = 1000;
        let step = 0;
        let steps = 50;
        let step_ms = duration / steps;
        let difference = target - this.serverTimeOffset;
        let inc = difference / steps;
        let iv;
        iv = setInterval(() => {
            this.serverTimeOffset += inc;
            if (++step >= steps) {
                clearInterval(iv);
                this.serverTimeOffset = target;
            }

        }, step_ms);
    }


    moveMouse(data) {
        if (data) {
            this.mouseChannel.publish(data);
        }
    }

    onSetName(data) {
        this.clientID = data.id;
        console.log("Client ID:", this.clientID);
    }

    addNote(note, velocity = 100, dd = 0) {
        if (note < Util.A0 || note > Util.C8) {
            console.log("Error: Invalid note or note not in range.");
        }

        var onOff = velocity > 0;
        var d = Date.now() - this.noteBufferTime + dd;
        var n = Util.noteToStr(note);
        var s = 1;
        var v = velocity;
        var inst = "high_quality_acoustic_grand_piano";
        var src = 1;
        var kb_src = 0;
        var msg = onOff ? {
            d,
            n,
            v,
            inst,
            src,
            kb_src
        } : {
            d,
            n,
            s,
            inst,
            src,
            kb_src
        };

        this.noteBuffer.push(msg);
    }

    startNote(note, velocity, dd) {
        this.addNote(note, velocity, dd);
    }

    stopNote(note, dd) {
        this.addNote(note, 0, dd);
    }

    handleMouse(data) {
        if (data) {
            let d = {
                x: data.mX,
                y: data.mY,
                id: data.id,
                socketID: data.socketID,
                type: data.type,
                name: data.name,
                color: data.color
            };

            this.emit("onMouseMove", d);
        }
    }

    onSetRoom(data) {
        console.log("Room set to:", data)

        this.socket.emit("roomSet", true); //Show in userlist fixed

        this.mouseChannel = this.socket.subscribe("mouse_" + data.roomID);
        this.mouseChannel.watch(data => this.handleMouse(data));

        this.chatChannel = this.socket.subscribe(data.roomID);
        this.chatChannel.watch((data) => this.handleChat(data));

        this.midiChannel = this.socket.subscribe("midi_" + data.roomID);
        this.midiChannel.watch((data) => this.handleMidi(data));

        this.noteBufferTime = Date.now();

        setInterval(() => this.flushNoteBuffer(), this.flushNoteBuffer);
    }

    say(message) {
        this.socket.emit("chatMessage", message.toString());
    }

    handleChat(data) {
        if (data.type != "chat") {
            return;
        }

        var msg = {
            p: {
                name: data.name,
                nickname: data.nickname,
                id: data.id,
                sID: data.sID,
            },
            a: data.message,
        };

        this.emit("msg", msg);
    }

    flushNoteBuffer() {
        if (this.noteBuffer.length == 0) {
            this.noteBuffer = [];
            this.noteBufferTime = Date.now();
            return;
        }

        var t = Date.now() + this.serverTimeOffset;
        var n = this.noteBuffer;
        var id = this.socketID;
        var uuid = this.clientID;
        var color = this.collor;
        var msg = {
            t,
            n,
            id,
            uuid,
            color
        };
        this.midiChannel.publish(msg);

        this.noteBuffer = [];
        this.noteBufferTime = Date.now();
    }

    handleMidi(data) {
        data.n.forEach((e) => {
            setTimeout(() => {
                this.emit("note", {
                    clientID: data.uuid,
                    socketID: data.id,
                    color: "#FF2D00",
                    note: Util.strToNote(e.n),
                    noteName: e.n,
                    velocity: e.v,
                    stop: e.s,
                });
            }, data.t - Date.now() + e.d);
        });

    }
}

Client.utils = Util;
module.exports = Client;
