const client = Deno.createHttpClient(Deno.env.get("PROXIED") === "true" ? {
    proxy: {url: "localhost:8080"},
} : {});

export default class Bijlesvinder {
    constructor({ email, password }) {
        this.cookie = null;
        this.email = email;
        this.password = password;
        this.expires = null;
    }

    async login() {
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
        this.expires = new Date(expires - 2 * 60 * 60 * 1000); // 2 hours before expiration
        return { sessionCookie: newSessionCookie, expires };
    }

    async refresh() {
        if (this.expires < new Date()) {
            return await this.login();
        }
    }

    async getPlanning(teammember, startDate, endDate) {
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