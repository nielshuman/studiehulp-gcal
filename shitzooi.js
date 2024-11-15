import Bijlesvinder from "./bijlesvinder.js";
import ical from 'ical-generator';
import express from 'express';
import rateLimit from 'express-rate-limit';

// import "jsr:@std/dotenv/load";

const HOUR = 60 * 60 * 1000;
const WEEK = 7 * 24 * HOUR;

function planningToIcal(planning, title) {
    const cal = ical({name: title});
    for (const event of planning) {
        const t = event.title.split(" | ")
    
        if (t.length < 2) {
            continue;
        }
    
        const isBijles = (event.backgroundColor === "lightGrey")
        
        // min een uur want het ding is dom
        const startDate = new Date(new Date(event.start) - HOUR);
        const endDate = new Date(new Date(event.end) - HOUR);
    
        cal.createEvent({
            summary: isBijles? event.title : t[1], // remove the name in case of huiswerkbegeleiding
            description: event.title,
            start: startDate,
            end: endDate,
            location: "Studiehulp.NU"
        });
    }
    return cal;
}

const b = new Bijlesvinder({
    email: Deno.env.get("EMAIL"), 
    password: Deno.env.get("PASSWORD"),
    cachetime: 1 * HOUR
});

await b.login();

const app = express();

app.set('trust proxy', 1)

app.use(rateLimit({
    windowMs: 1 * HOUR,
    max: 10,
}));


app.get("/tarp/:teammember", async (req, res) => {
    const teammember = parseInt(req.params.teammember);
    console.log("Getting planning for teammember", teammember);
    await b.refresh();
    const planning = await b.getPlanningMemoized(
        teammember,
        new Date(), 
        new Date(Date.now() + 4 * WEEK)
    );
    const cal = planningToIcal(planning, "Uren Studiehulp.NU");
    res.set("Content-Type", "text/calendar");
    res.send(cal.toString());
});

app.listen(3000, () => {
    console.log("Listening on port 3000");
});