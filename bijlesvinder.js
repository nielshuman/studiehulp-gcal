import memoize from 'memoize';
import { getCode } from "./imap.js";

const HOUR = 60 * 60 * 1000;

const client = Deno.createHttpClient(Deno.env.get("PROXIED") === "true" ? {
    proxy: {url: "localhost:8080"},
} : {});

export default class Bijlesvinder {
    constructor({ email, password, cachetime }) {
        this.cookie = null;
        this.email = email;
        this.password = password;
        this.expires = null;
        this.getPlanningMemoized = memoize(this.getPlanning.bind(this), {maxAge: cachetime? cachetime : 1000 * 60 * 60});
    }

    async _login() {
        const { token, sessionCookie } = await getLoginSession();

        const response = await fetch("https://bijlesvinder.studiehulp.nu/app/studiehulp-nu_security/login", {
            method: "POST",
            headers: {
              "content-type": "application/x-www-form-urlencoded",
              "cookie": sessionCookie,
            },
            body: new URLSearchParams({
                "login_form[_email]": this.email,
                "login_form[_password]": this.password,
                "_token": token,
            }),
            redirect: "manual",
            client: client,
        });
    
        const cookies = response.headers.get("set-cookie").split("; ");
        const expires = new Date(cookies[1].split("=")[1]);
        const newSessionCookie = cookies[0];
        this.cookie = newSessionCookie;
        // this.expires = new Date(expires - 2 * 60 * 60 * 1000); // 2 hours before expiration
        this.expires = new Date(new Date().getTime() + 12 * HOUR); // 12 from now
        return { sessionCookie: newSessionCookie, expires };
    }

    async login2FA() {
        const request_time = new Date();
        console.log("Requesting 2FA code");
        await request2FACode(this.email);
        console.log("Waiting for 2FA code");
        const code = await getCode(request_time);
        const { token, smsCodeToken, sessionCookie } = await get2FALoginSession();
        await fetch("https://bijlesvinder.studiehulp.nu/app/studiehulp-nu_security/smscode", {
            method: "POST",
            headers: {
                "content-type": "application/x-www-form-urlencoded",
                "cookie": sessionCookie,
            },
            body: new URLSearchParams({
                "user_lostpassword_ssid_form[ssid]": code,
                "_token": token,
                "user_lostpassword_ssid_form[_token]": smsCodeToken,
            }),
            redirect: "manual",
            client: client,
        });
        this.cookie = sessionCookie;
        const expires = new Date(new Date().getTime() + 12 * HOUR); // 12 hours from now
        this.expires = expires;
        return { sessionCookie, expires };
    }

    refresh() {
        if (this.expires < new Date()) {
            console.log("Refreshing session");
            const promise = this.login2FA();
            return { stillValid: false, promise };
        } else {
            return { stillValid: true };
        }
    }

    async getPlanning(teammember, startDate, endDate) {
        console.log("Making request");
        const response = await fetch("https://bijlesvinder.studiehulp.nu/app/bijlesvinder/planning/planning-calendar", {
            method: "POST",
            headers: {
                "content-type": "application/x-www-form-urlencoded",
                "cookie": this.cookie,
            },
            body: new URLSearchParams({
                "filters": JSON.stringify({ "teammembers": teammember }),
                "start": new Date(startDate).toISOString(),
                "end": new Date(endDate).toISOString(),
                "timeZone": "UTC"
            }),
            client: client
        });
        return await response.json();
    }
}

async function getLoginSession() { 
    const page = await fetch("https://bijlesvinder.studiehulp.nu/app/studiehulp-nu_security/login", {
        method: "GET",
        client: client,
    });
    const pageText = await page.text();
    const token = pageText.match(/<input type="hidden" name="_token" value="(.*?)">/)[1];
    const sessionCookie = page.headers.get("set-cookie").split("; ")[0];
    return { token, sessionCookie };
}

async function get2FARequestSession(){
    const page = await fetch("https://bijlesvinder.studiehulp.nu/app/studiehulp-nu_security/enterthematrix", {
        method: "GET",
        client: client,
    });
    const pageText = await page.text();
    const token = pageText.match(/<input type="hidden" name="_token" value="(.*?)">/)[1];
    const lostPasswordToken = pageText.match(/id="user_lostpassword_form__token".*?value="(.*?)"/)?.[1];
    const sessionCookie = page.headers.get("set-cookie").split("; ")[0];
    return { token, sessionCookie, lostPasswordToken };
}

async function get2FALoginSession() {
    const page = await fetch("https://bijlesvinder.studiehulp.nu/app/studiehulp-nu_security/smscode", {
        method: "GET",
        client: client,
    });
    const pageText = await page.text();
    const token = pageText.match(/<input type="hidden" name="_token" value="(.*?)">/)[1];
    const smsCodeToken = pageText.match(/id="user_lostpassword_ssid_form__token".*?value="(.*?)"/)?.[1];
    const sessionCookie = page.headers.get("set-cookie").split("; ")[0];
    return { token, smsCodeToken, sessionCookie };
}

async function request2FACode (email) {
    const { token, sessionCookie, lostPasswordToken } = await get2FARequestSession();
    await fetch("https://bijlesvinder.studiehulp.nu/app/studiehulp-nu_security/enterthematrix", {
        method: "POST",
        headers: {
            "content-type": "application/x-www-form-urlencoded",
            "cookie": sessionCookie,
        },
        body: new URLSearchParams({
            "_token": token,
            "user_lostpassword_form[email]": email,
            "user_lostpassword_form[_token]": lostPasswordToken,
        }),
        redirect: "manual",
        client: client,
    });
}