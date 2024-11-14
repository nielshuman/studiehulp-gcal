import Bijlesvinder from "./bijlesvinder.js";
import ical from 'ical-generator';
// import "jsr:@std/dotenv/load";

const HOUR = 60 * 60 * 1000;
const WEEK = 7 * 24 * HOUR;

const b = new Bijlesvinder();
await b.login(Deno.env.get("EMAIL"), Deno.env.get("PASSWORD"));
const planning = await b.getPlanning(89, new Date(), new Date(Date.now() + 4 * WEEK));

const cal = ical({name: 'Uren Studiehulp.NU'});

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

// Save to file
await Deno.writeTextFile("studiehulp.ics", cal.toString());