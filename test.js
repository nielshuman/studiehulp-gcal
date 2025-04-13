import Bijlesvinder from "./bijlesvinder.js";

const b = new Bijlesvinder({
    email: 'coderelay@justniels.nl',  
})

await b.login2FA();
const planning = await b.getPlanning(89, new Date(), new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000));
console.log(planning);