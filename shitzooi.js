import Bijlesvinder from "./bijlesvinder.js";
import "jsr:@std/dotenv/load";

const b = new Bijlesvinder();
await b.login(Deno.env.get("EMAIL"), Deno.env.get("PASSWORD"));
console.log(await b.getPlanning(89, new Date("2024-11-10"), new Date("2024-11-17")));