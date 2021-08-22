require('dotenv').config()

const needle = require('needle')
const rulesURL = 'https://api.twitter.com/2/tweets/search/stream/rules';
async function getAllRules() {

    const response = await needle('get', rulesURL, {
        headers: {
            "authorization": `Bearer ${process.env.BEARER_TOKEN}`
        }
    })

    if (response.statusCode !== 200) {
        console.log("Error:", response.statusMessage, response.statusCode)
        throw new Error(response.body);
    }

    console.log(response.body);
}

getAllRules()

function streamConnect(retryAttempt) {

    const stream = needle.get("https://api.twitter.com/2/tweets/search/stream", {
        headers: {
            "User-Agent": "v2FilterStreamJS",
            "Authorization": `Bearer ${process.env.BEARER_TOKEN}`
        },
        timeout: 20000
    });

    stream.on('data', data => {
        try {
            const json = JSON.parse(data);
            console.log(json);
            const {id} = {...data};
            console.log(json.data.id)
            // A successful connection resets retry count.
            retryAttempt = 0;
        } catch (e) {
            if (data.detail === "This stream is currently at the maximum allowed connection limit.") {
                console.log(data.detail)
                process.exit(1)
            } else {
                // Keep alive signal received. Do nothing.
            }
        }
    }).on('err', error => {
        if (error.code !== 'ECONNRESET') {
            console.log(error.code);
            process.exit(1);
        } else {
            // This reconnection logic will attempt to reconnect when a disconnection is detected.
            // To avoid rate limits, this logic implements exponential backoff, so the wait time
            // will increase if the client cannot reconnect to the stream. 
            setTimeout(() => {
                console.warn("A connection error occurred. Reconnecting...")
                streamConnect(++retryAttempt);
            }, 2 ** retryAttempt)
        }
    });

    return stream;
}

(async () => {
    // Listen to the stream.
    streamConnect(0);
})();
