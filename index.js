const socketio = require("socket.io-client");
const express = require("express")

const app = express();
const http = require('http');
const server = http.createServer(app);
const path = require("path")


const pulsusSock = socketio.io("https://pulsus.cc/");
let beatmaps = [];
pulsusSock.emit("searchLevels", {"a":0,"mode":"recent","viewSkip":0,"sort":"starsAsc","showUnranked":false})
pulsusSock.on("returnLevelSearch", (levels) => {
    beatmaps = levels.res;
})



app.get('/', (req, res) => {
  res.send('<h1>J2ME Pulsus</h1>');
});


app.get("/all/", async (req,res) => {
    const relevantMaps = beatmaps
    // Remove all commas
    relevantMaps.map((level) => {
        level.title = level.title.replaceAll(",", "");
        level.desc = level.desc.replaceAll(",", "");
        level.desc = level.desc.replaceAll("\r", "");
        level.desc = level.desc.replaceAll("\n", "");
        return level;
    })
    
    let output = ""

    for (const entry of relevantMaps) {
        output += `${entry.id},${entry.title},${entry.desc},${entry.song}\n`
    }

    res.setHeader('content-type', 'text/plain');
    res.send(output)
})
app.get("/search/*", async (req,res) => {
    // Filter maps by name
    const relevantMaps = beatmaps.filter((level) => {
        return level.title.toLowerCase().includes(decodeURIComponent( req.path.split("/")[2].toLowerCase()));
    })

    // Remove all commas
    relevantMaps.map((level) => {
        level.title = level.title.replaceAll(",", "");
        level.desc = level.desc.replaceAll(",", "");
        level.desc = level.desc.replaceAll("\r", "");
        level.desc = level.desc.replaceAll("\n", "");
        return level;
    })
    
    let output = ""

    for (const entry of relevantMaps) {
        output += `${entry.id},${entry.title},${entry.desc},${entry.song}\n`
    }

    res.setHeader('content-type', 'text/plain');
    res.send(output)
    
})

app.get("/convert/*", async (req,res) => {
    try {
        const requestedID = Number(req.path.split("/")[2]);
        pulsusSock.emit("newGrabLevel", {mode: "id", a: requestedID})
        const listener = (map) => {
            if (map.id !== requestedID)
                return;
            if (map.error) {
                res.status(404).send("No map of ID " + map.id);
                return;
            }
            pulsusSock.off("newGrabbedLevel", listener);
            output = ""

            for (beat of map["beat"]) {
                ms = Math.floor((beat[1] * 60000) / map.bpm)
                startms = ms - 1_000
                if (startms < 0)
                    startms = 0
                lane = beat[0] + 1
                output += startms + "," + ms + "," + lane + '\n'
            }
            res.setHeader('content-type', 'text/plain');
            res.send(output);

        }
        pulsusSock.on("newGrabbedLevel", listener);
    } catch (e) {
        console.error(e);
    }
})

app.get("/music/*", async (req,res) => {
    try {
        const requestedID = Number(req.path.split("/")[2]);
        const pulsusReq = (await fetch("https://pulsus.cc/play/client/s/" + requestedID + ".mp3"));
        res.setHeader('content-type', pulsusReq.headers.get("Content-Type"));
        const data = Buffer.from(await pulsusReq.arrayBuffer());
        res.status(pulsusReq.status);
        res.send(data)
    } catch (e) {
        console.error(e)
    }
})

server.listen(3000, () => {
  console.log('listening on *:3000');
});