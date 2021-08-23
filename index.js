require('dotenv').config()

const needle = require('needle')

const {TwitterClient} = require('twitter-api-client')

const twitterClient = new TwitterClient({
  apiKey: process.env.OAUTH_CONSUMER_KEY,
  apiSecret: process.env.OAUTH_CONSUMER_SECRET,
  accessToken: process.env.OAUTH_TOKEN,
  accessTokenSecret: process.env.OAUTH_TOKEN_SECRET,
});

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

            // retweet
            retweet(json.data.id)
            
        } catch (e) {
            console.log(data)
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

const retweet = tweetId => {
    const data =  twitterClient.tweets.statusesRetweetById({ id: tweetId });
    console.log(data)
}
