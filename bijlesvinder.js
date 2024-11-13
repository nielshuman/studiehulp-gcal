export default class Bijlesvinder {
    constructor(email, password) {
        this.cookie = null;
    }

    async login(email, password) {
        const { token, sessionCookie } = await getLoginSession();

        const response = await fetch("https://bijlesvinder.studiehulp.nu/app/studiehulp-nu_security/login", {
            method: "POST",
            headers: {
              "content-type": "application/x-www-form-urlencoded",
              "cookie": sessionCookie,
            },
            body: new URLSearchParams({
                "login_form[_email]": email,
                "login_form[_password]": password,
                "_token": token,
            }),
            redirect: "manual"
        });
    
        const cookies = response.headers.get("set-cookie").split("; ");
        const newSessionCookie = cookies[0];
        this.cookie = newSessionCookie;
        return newSessionCookie;
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
        });
        return await response.json();
    }
}

async function getLoginSession() { 
    const page = await fetch("https://bijlesvinder.studiehulp.nu/app/studiehulp-nu_security/login", {
        method: "GET"
    });
    const pageText = await page.text();
    const token = pageText.match(/<input type="hidden" name="_token" value="(.*?)">/)[1];
    const sessionCookie = page.headers.get("set-cookie").split("; ")[0];
    return { token, sessionCookie };
}