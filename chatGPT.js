const { CREDS } = require("./CREDS");


const openAiKey = CREDS.openAiKey;
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: openAiKey,
});

function queryChatGPT(queryText) {
    return new Promise((resolve) => {
        try {
            const completion = openai.chat.completions.create({
                // model: "gpt-4o-mini",           // works much faster but supposedly is a worse model
                // model: "gpt-5-2025-08-07",   // better model but more expensive and queries take a while
                model: "gpt-5-mini-2025-08-07",
                store: true,
                messages: [
                    {
                        "role": "user",
                        "content": queryText
                    },
                ],
            });
            
            completion.then((result) => {
                setTimeout(() => {
                    resolve(result.choices[0].message.content);
                }, 5000);
                // }, 500);
            });
        } catch (err) {
            console.log("ERROR with chatGPT request");
            resolve("[]");
        }
    });
}

module.exports = { queryChatGPT };