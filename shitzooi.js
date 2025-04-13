import Bijlesvinder from "./bijlesvinder.js";
import ical from 'ical-generator';
import express from 'express';
import rateLimit from 'express-rate-limit';

// import "jsr:@std/dotenv/load";

const HOUR = 60 * 60 * 1000;
const WEEK = 7 * 24 * HOUR;
const offset = Deno.env.get("OFFSET") ? parseInt(Deno.env.get("OFFSET")) : -1;

function planningToIcal(planning, title) {
    const cal = ical({name: title});
    for (const event of planning) {
        if (!event.productText) continue; // skip beschikbaarheid

        // min een offset want het ding is dom
        const startDate = new Date(new Date(event.start).getTime() + offset * HOUR);
        const endDate = new Date(new Date(event.end).getTime() + offset * HOUR);
        
        let summary, description;
        if (event.productText === "HW") {
            summary = event.title.split("|")[1];
            description = '';
        } else {
            summary = event.title.split("|")[0];
            description = event.title.split("|")[1];
        }
        cal.createEvent({
            summary,
            description,
            start: startDate,
            end: endDate,
            location: "Studiehulp.NU"
        });
    }
    return cal;
}

const b = new Bijlesvinder({
    email: Deno.env.get("EMAIL"),
    cachetime: 1 * HOUR
});

await b.login2FA();

const app = express();

app.set('trust proxy', 1)

app.use(rateLimit({
    windowMs: 1 * HOUR,
    max: 10,
}));


app.get("/tarp/:teammember", async (req, res) => {
    const teammember = parseInt(req.params.teammember);
    if (isNaN(teammember) || teammember < 0 || teammember > 200) {
        res.status(400).send("Invalid teammember");
        return;
    }
    console.log("Getting planning for teammember", teammember);
    const {stillvalid} = await b.refresh();
    if (!stillvalid) {
        res.status(503).send("Refreshing session");
        return;
    }
    const planning = await b.getPlanningMemoized(
        teammember,
        new Date() - 4 * WEEK, 
        new Date(Date.now() + 4 * WEEK)
    );
    const cal = planningToIcal(planning, "Uren Studiehulp.NU");
    res.set("Content-Type", "text/calendar");
    res.send(cal.toString());
});

app.listen(3000, () => {
    console.log("Listening on port 3000");
});