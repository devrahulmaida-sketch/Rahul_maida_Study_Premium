
// Firebase Service Account
const SERVICE_ACCOUNT = {
  "project_id": "rahul-free-study",
  "client_email": "firebase-adminsdk-fbsvc@rahul-free-study.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC+EUWJzClcRy0f\neN5jPpSVc2bithqqkvJYHw6MqVmfnq5jzGZ1NbveOaucp2N+1t2j86vFB470IgpC\nWt6mCIvAYV5ZdNMfL3CSTGWxGKwCJvgwMke429zg/fhtxtDGWi4wmRG/3YtcOvlo\nAOZ0QY9Vrmhh/RHskuACDaAZMuFM8lrv/5gWMqrgS9iDBFgY+gU7jdw0iWnqMkOg\nnDFoefwbtS+D2Xg2iQHEHPeXyX1r7/i/zw/fpy0Cgc98UeZoWhwmlzo1uxg+FN5P\nK21LRxTR7CGWrGi8e5oBCr6bGIZHZrQyuohhG2kDevnuTrcPWgywYLvddoBvLccm\ndZRkdz5DAgMBAAECggEABhkP3ulnp9uIEczPbxCxbZAPU3kPpvU3aDxALYbJn3xx\nM/1AbWEIkNJA9IdOEQzfYPoLUQiP4Sx8aI3PAsPlwiYoPLW4Fkr+ETRrDF1yN8JZ\nFm+na4i4DGAbWAq7SI8udIYjy5Y5av99J4Vy+8oy5aqqFBwRDDSeyx6Dyl67Bkqh\nbCbgAM/ZQNNrZvs5g+QuauyijnAkt9OSGcw2QxPEweOXTtDEBZSm+a77ZlnMSqvv\nbK8FoRHA93K+8aLaOWNF0isM9oaQ15Ns5GTD6A4RbiOotCWZBINcAu2l6fOnltKL\nDIMzcxiYJcs86CtP/zBnqo08dtXYvkElijsf789ZDQKBgQDj0Bp4BQMdGOBZWvWC\nRgYmfKeeCJj10qn34NtKYpfrGG3ExDiEo11vzIGSfF/2NRfjLTvmGdW7N3DvOgcH\nU2Yg7NPZvYRVg8d0llBhm8LHb2k18TOA1y3XtXBtmkRo5OVdskCUI0oxKDdR9yTB\nnY+3XY6ZNnX7HL5t39AKJsNqrQKBgQDVlZglDL8Lt+cCDa0Wh1HhVIqZRlzLg7c4\na3gIU/GMnScyLa2UWvrozCA+qrnF+1cFT45etDt107tdOeHo8s02GATyAntNuc2Y\nmwwoKfoL3ql0SnO2F4PSPK6fAEylSN3mUBiqCYaNvy/fsUceaFUmVrjZbCoAh+el\nU2reR3LarwKBgQCu2eIG7mnmYlqHmr3G4HIGBjUsoZKtUqSsIYSOgj/x7I0LskNi\n4nRrw75LrXSF51hPQD+yK3AVQsdGhfYxFDzV1o//lmtEq2FiRaCqWj/UjNlm0pti\nL0X7Q0JojTgmflDhalgQm0ltk11qZtNqW8Gbzo4NYHSLaRNsB5WIxRnF/QKBgFX0\nsVlfytcleNOru1gQt5QumOTcm2XQKYGMRq9bUR/c8zRPi8bj4oyj8eomfUM/RqM9\nhDd6418lCgeXzuIYLRwzCHJ5KzR5rVNYOslDM31pa9sAR5cl2YhXoZMd5Lq0G5Gf\n9H0h/kO3iMXGq6+CH5qhVh0yWakDCOfRLXYtXPzDAoGADCSPgUQuvkxozcL8hGW4\nq/Y3fo8GllG7ayfP4pKMqyMuIiBnUUIJjuImT4Lnlo36n4+Vnz5P+4/AAeCgkj/M\ntJlMz6X38eTenzkjFri9+hMihmBHfpzOgEPPrRsTHQFmiIOmzaXM8N6wTg8IAKAN\n4pdpLeYX8YiXsUXREdaQxWo=\n-----END PRIVATE KEY-----\n"
};

const PW_CLIENT_ID = "5eb393ee95fab7468a79d189";

export default {
    async scheduled(event, env, ctx) {
        // Background notification logic...
        const { keys } = await env.NOTIF_KV.list();
        for (const key of keys) {
            if (key.name.startsWith('last_')) continue;
            await checkPW(key.name, env);
        }
    },

    async fetch(request, env) {
        const url = new URL(request.url);
        const params = url.searchParams;

        // CORS Headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        };

        if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

        // 1. REGISTER BATCH
        if (url.pathname === "/register") {
            const batchId = params.get("batchId");
            if (batchId) await env.NOTIF_KV.put(batchId, "active");
            return new Response("OK", { headers: corsHeaders });
        }

        // 2. PROXY PW API (To bypass CORS)
        if (url.pathname === "/proxy") {
            const target = params.get("endpoint");
            const token = params.get("token");
            if (!target) return new Response("No endpoint", { status: 400 });

            const pwRes = await fetch(`https://api.penpencil.co${target}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Client-Id': PW_CLIENT_ID,
                    'Client-Type': 'WEB'
                }
            });
            const data = await pwRes.text();
            return new Response(data, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // 3. GET FRESH TOKEN (From AKP)
        if (url.pathname === "/token") {
            const res = await fetch('https://learnbyakp.online/api-credentials.js');
            const text = await res.text();
            const match = text.match(/six\s*=\s*'Bearer\s+([^']+)'/);
            return new Response(JSON.stringify({ token: match ? match[1] : null }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        return new Response("Rahul Premium Bot Active", { headers: corsHeaders });
    }
};

async function checkPW(batchId, env) {
    // Check logic for cron...
}
