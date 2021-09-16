
# pr-client-xt

pr-client-xt is a custom made client used to connect to https://www.pianorhythm.me/
## Installation

```bash
npm install pr-client-xt
```

## Usage

```js
const PRClient = require("pr-client-xt");

var options = {
    uri: "www.pianorhythm.me",
    path: "/socketcluster/",
    userColor: "#7d9cf5",
    multiplex: true,
    secure: true,
    username: "Username",
    password: "Password" // Leave blank if you want to login as a guest
};

var client = new PRClient(options);

client.setChannel("Foobar");
client.setName("Fookat"); // You must do these first before starting the client
client.start();

client.on("hi", () => {
  console.log("Connected.");
});
```

## Playing and stopping notes
```js
client.startNote("note", "velocity");

client.stopNote("note");
```

## Moving the cursor
```js
let data = {
  mX: 50, 
  mY: 50, 
  id: "client id", 
  socketID: "socket id", 
  type: "pos"
}

client.moveMouse(data);
```

## Recieving chat messages
```js
client.on("msg", function(msg) {
  // Message content and format
  let author = msg.p;
  let name = author.name;
  let id = author.id;
  let nickname = author.nickname;
  let socketID = author.sID;

  let content = msg.a.;
})
```

## Sening chat messages
```js
client.say("Foo Test");
```

## License
[MIT](https://choosealicense.com/licenses/mit/)
