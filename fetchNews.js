const { CREDS } = require("./CREDS");

// let newsSoFar = [];
function fetchNews(theSyms, startDate, endDate, pageToken = false, newsSoFar) {
    if (!newsSoFar) {
        newsSoFar = [];
    }
    console.log("fetching.... " + newsSoFar.length + " articles so far");
    return new Promise((resolve) => {
        const sort = "desc";
        const symbols = theSyms.join("%2C");
        // const symbols = ["LUV"];
        const content = "true";
        const dropContentless = "true";
        
        let queryStr = `https://data.alpaca.markets/v1beta1/news?start=${startDate}&end=${endDate}&sort=${sort}&symbols=${symbols}&include_content=${content}&exclude_contentless=${dropContentless}`;
        if (pageToken) {
            queryStr = `https://data.alpaca.markets/v1beta1/news?start=${startDate}&end=${endDate}&sort=${sort}&symbols=${symbols}&include_content=${content}&exclude_contentless=${dropContentless}&page_token=${pageToken}`;
        }

        fetch(queryStr, {
            method: "GET",
            headers: {
                "Apca-Api-Key-Id": CREDS.key,
                "Apca-Api-Secret-Key": CREDS.secret
            }
        }).then((res) => {
            res.json().then((r) => {
                // console.log(r);
                newsSoFar.push(...r.news);
                if (r.next_page_token) {
                    fetchNews(theSyms, startDate, endDate, r.next_page_token, newsSoFar).then(() => {
                        resolve(newsSoFar);
                    });
                } else {
                    resolve(newsSoFar.map(ele => ele));
                }
            });
        });
    });
}

module.exports = { fetchNews };



// const ratings = {};

// const importantSyms = [
//     // "COST",
//     // "AMZN",
//     // "GBTC",
//     // "QQQ",
//     // "RIVN",
//     // "LUV",
//     // "ABNB",
//     // "F",

//     "RGTI",
//     "NVDA",
//     "LCID",
//     "SOUN",
//     "TSLA",
//     "INTC",
//     "AAPL",
//     "SOFI",
//     "RKLB",
//     "MARA",

//     // "ABEV",
//     // "BBAI",
//     // "BBD",
//     // "CDIO",
//     // "CHPT",
//     // "DNN",
//     // "ENZC",
//     // "GWAV",
//     // "HRTX",
//     // "HMBL",
//     // "INDI",
//     // "JMIA",
//     // "KULR",
//     // "MIGI",
//     // "NOK",
//     // "MTEM",
//     // "NVTS",
//     // "PBM",
//     // "PLUG",
//     // "PRFX",
//     // "QBTS",
//     // "RDAR",
//     // "SVMH",

//     // "ADTX",
//     // "AEON",
//     // "BMRA",
//     // "FOXO",
//     // "WHLR",
//     // "SOBR",
//     // "PHIO",
//     // "SES",
//     // "SENS",
//     // "QSI",
//     // "RR",
//     // "OPTT",
//     // "IBRX",
//     // "ORKT",
//     // "RZLV",
//     // "BNGO",
//     // "MULN",
//     // "AGL",
//     // "TMC",
//     // "MVST",
//     // "AQN",
//     // "EDBL",
//     // "HUYA",

//     // "BDMD",
//     // "BZAI",
//     // "LINK",
//     // "ANNA",
//     // "NTCL",
//     // "AUNA",
//     // "XCUR",
//     // "BKSY",
//     // "AIXI",
//     // "CRML",

//     // "XXII",
//     // "AENT",
//     // "PDYN",
//     // "FBYD",
//     // "CADL",
//     // "MODV",
//     // "BYFC",
//     // "JL",
//     // "KPLT",
//     // "BODI"
// ];
// fetchNews(importantSyms, "2024-09-30", "2024-10-19").then((news) => {
//     console.log(news.length);
//     const pairs = makeSymArticlePairs(importantSyms, news);
//     rateArticles(pairs, 0).then(() => {
//         console.log("POOOP");
//         console.log(ratings);
//     });
// });




// function rateArticles(articlePairs, i) {
//     return new Promise((resolve) => {
//         if (articlePairs[i]) {
//             const thisArticleId = articlePairs[i][0].id;
//             const thisArticleContent = articlePairs[i][0].content;
//             const thisSym = articlePairs[i][1];
//             getRating(thisArticleContent, thisSym).then((rating) => {
//                 console.log(rating, i);
//                 ratings[`${thisArticleId}-${thisSym}`] = rating;
//                 rateArticles(articlePairs, i + 1).then(() => {
//                     resolve();
//                 });
//             });
//         } else {
//             console.log("done with ratings");
//             resolve();
//         }
//     });
// }


// function makeSymArticlePairs(syms, news) {
//     const pairs = [];
//     news.forEach((article) => {
//         syms.forEach((sym) => {
//             if (article.symbols.includes(sym)) {
//                 pairs.push([article, sym]);
//             }
//         });
//     });
//     return pairs;
// }



// // function getRating(content, sym) {
// //     return new Promise((resolve) => {
// //         setTimeout(() => {
// //             resolve("neutral");
// //         }, 500);
// //     });
// // }

// const openAiKey = "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";
// const OpenAI = require("openai");

// const openai = new OpenAI({
//   apiKey: openAiKey,
// });

// function getRating(content, sym) {
//     return new Promise((resolve) => {
//         const completion = openai.chat.completions.create({
//             model: "gpt-4o-mini",
//             store: true,
//             messages: [
//             {
//                 "role": "user",
//                 "content": `I'll give you some text and a stock ticker symbol. I'd like you to determine if the text contains news of a positive earnings report about the company 
//                 with the given symbol. If it does, please respond with "good". Otherwise, please respond with "bad". I don't need any explanation; just respond with one word. Here's the text: ${content} Here's the symbol: ${sym}`
//             },
//             ],
//         });
        
//         completion.then((result) => {
//             const resMessage = result.choices[0].message;
//             console.log(resMessage.content);
//             if (resMessage.content.includes("great")) {
//                 resolve("great");
//             }
//             if (resMessage.content.includes("good")) {
//                 resolve("good");
//             }
//             if (resMessage.content.includes("bad")) {
//                 resolve("bad");
//             }
//             if (resMessage.content.includes("terrible")) {
//                 resolve("terrible");
//             }
//             resolve("unable");
//         });
//     });
// }
    

