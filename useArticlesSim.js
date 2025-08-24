const { fetchNews } = require("./fetchNews");
const { queryChatGPT } = require("./chatGPT");
const { fetchDaysAllStocks } = require("./fetchDays");
const { daysDataToDayGroupsRaw, arrAve, findRValue } = require("./util");


let startDate = "2025-06-18";
let endDate = "2025-08-23";

const articleThreshold = 0;

let params = {
    useCache: true,
    exchange: "NASDAQ",
    // maxCurrentPrice: 0.06,
    // minCurrentPrice: 0.05,
    // maxEverPrice: 0.5,
    // minEverPrice: 0.01,
    maxStartPrice: 1,
    minStartPrice: 0.80,
    // maxStartPrice: 0.5,
    // minStartPrice: 0.05,
    // minStartVol: 1000,
};

fetchDaysAllStocks(startDate, endDate, params).then((res) => {
    const dayGroups = daysDataToDayGroupsRaw(res);

    const symsToUse = Object.keys(dayGroups[0]);
    fetchNews(symsToUse, startDate, endDate).then((news) => {

        // const newsDays = groupArticlesByDay(news);

        createDaySymbolsChartFromNews(news).then((daySymChart) => {

            console.log(daySymChart);

            let amt = 100;
            let keepAmt = 100;
            const amts = [100];
            const keepAmts = [100];
    
            for (let i = 0; i < dayGroups.length - 1; i++) {
                const today = dayGroups[i];
                const todayDate = today[Object.keys(today)[0]].time.slice(0, 10);
    
                const tomorrow = dayGroups[i + 1];
                // const tomorrow = dayGroups[i];
    
                const promisingSyms = [];
                if (daySymChart[todayDate]) {
                    Object.keys(daySymChart[todayDate]).forEach((sym) => {
                        if (daySymChart[todayDate][sym] > articleThreshold) {
                            promisingSyms.push(sym);
                        }
                    });
                }
    
                const symsToBuy = [];
                promisingSyms.forEach((sym) => {
                    if (tomorrow[sym]) {
                        symsToBuy.push(sym);
                    }
                });
    
                let buySum = 0;
                let sellSum = 0;
    
                symsToBuy.forEach((sym) => {
                    buySum += Number.parseFloat(tomorrow[sym].open);
                    sellSum += Number.parseFloat(tomorrow[sym].price);
                });
    
                let keepBuySum = 0;
                let keepSellSum = 0;
    
                Object.keys(tomorrow).forEach((sym) => {
                    keepBuySum += Number.parseFloat(tomorrow[sym].open);
                    keepSellSum += Number.parseFloat(tomorrow[sym].price);
                });
    
                const keepRatio = keepBuySum > 0 ? 1.0 * keepSellSum / keepBuySum : 1;
                const aiRatio = buySum > 0 ? 1.0 * sellSum / buySum : 1;
    
                amt *= aiRatio;
                keepAmt *= keepRatio;
                amts.push(amt);
                keepAmts.push(keepAmt);
    
                console.log(todayDate, 100 * aiRatio, `(${100 * keepRatio})`, `${symsToBuy.length} syms`);
            }
    
            console.log("**********");
            keepAmts.forEach((n) => {
                console.log(n);
            });
            console.log("*****************");
            console.log("********* ^keep above^ ********");
            console.log("*****************");
            amts.forEach((n) => {
                console.log(n);
            });
        });
        
        // createDaySymbolsChartFromNews(news).then((daySymChart) => {

        //     console.log(daySymChart);

        //     let amt = 100;
        //     let keepAmt = 100;
        //     const amts = [100];
        //     const keepAmts = [100];
    
        //     for (let i = 0; i < dayGroups.length - 1; i++) {
        //         const today = dayGroups[i];
        //         const todayDate = today[Object.keys(today)[0]].time.slice(0, 10);
    
        //         const tomorrow = dayGroups[i + 1];
        //         // const tomorrow = dayGroups[i];
    
        //         const promisingSyms = [];
        //         if (daySymChart[todayDate]) {
        //             Object.keys(daySymChart[todayDate]).forEach((sym) => {
        //                 if (daySymChart[todayDate][sym] > articleThreshold) {
        //                     promisingSyms.push(sym);
        //                 }
        //             });
        //         }
    
        //         const symsToBuy = [];
        //         promisingSyms.forEach((sym) => {
        //             if (tomorrow[sym]) {
        //                 symsToBuy.push(sym);
        //             }
        //         });
    
        //         let buySum = 0;
        //         let sellSum = 0;
    
        //         symsToBuy.forEach((sym) => {
        //             buySum += Number.parseFloat(tomorrow[sym].open);
        //             sellSum += Number.parseFloat(tomorrow[sym].price);
        //         });
    
        //         let keepBuySum = 0;
        //         let keepSellSum = 0;
    
        //         Object.keys(tomorrow).forEach((sym) => {
        //             keepBuySum += Number.parseFloat(tomorrow[sym].open);
        //             keepSellSum += Number.parseFloat(tomorrow[sym].price);
        //         });
    
        //         const keepRatio = keepBuySum > 0 ? 1.0 * keepSellSum / keepBuySum : 1;
        //         const aiRatio = buySum > 0 ? 1.0 * sellSum / buySum : 1;
    
        //         amt *= aiRatio;
        //         keepAmt *= keepRatio;
        //         amts.push(amt);
        //         keepAmts.push(keepAmt);
    
        //         console.log(todayDate, 100 * aiRatio, `(${100 * keepRatio})`, `${symsToBuy.length} syms`);
        //     }
    
        //     console.log("**********");
        //     keepAmts.forEach((n) => {
        //         console.log(n);
        //     });
        //     console.log("*****************");
        //     console.log("********* ^keep above^ ********");
        //     console.log("*****************");
        //     amts.forEach((n) => {
        //         console.log(n);
        //     });
        // });
    });

});

function groupArticlesByDay(news) {
    const answer = [];

    return answer;
}



function createDaySymbolsChartFromNews(news) {
    return new Promise((resolve) => {

        fillInDayChartRecursive(news, 0).then((chart) => {
            resolve(chart);
        });
    });
}

function fillInDayChartRecursive(news, i, chartSoFar) {
    console.log("evaluating article " + i + " of " + news.length);
    if (!chartSoFar) {
        chartSoFar = {};
    }
    return new Promise((resolve) => {
        const nextArticle = news[i];
        if (!nextArticle) {
            resolve(chartSoFar);
        } else {
            const articleDate = nextArticle.created_at.slice(0, 10);
            if (!chartSoFar[articleDate]) {
                chartSoFar[articleDate] = {};
            }
            evaluateArticleForSyms(nextArticle.symbols, nextArticle.content).then((resultsForArticle) => {
                nextArticle.symbols.forEach((sym, idx) => {
                    if (!chartSoFar[articleDate][sym]) {
                        chartSoFar[articleDate][sym] = 0;
                    }
                    chartSoFar[articleDate][sym] += (resultsForArticle[idx] - 2);   // the -2 is so we don't have negative numbers from chatGPT which caused JSON errors
                });
                fillInDayChartRecursive(news, i + 1, chartSoFar).then((chart) => {
                    resolve(chart);
                });
            });
        }
    });
}

function evaluateArticleForSyms(syms, article) {
    
    return new Promise((resolve) => {
        const text = purgeBadControlChars(article);
        
        const query = `I'm going to give you an article and an array containing stock ticker symbols. I'd like you to read the article and evaluate
        each symbol's outlook for the following day based on the article. I'm not interested in longterm outlook, just assume I want to predict if
        the symbol is likely to go up or down the following day based solely on the information in the article. I'd like you to rate each symbol's
        likelihood of going up from 0 to 4, with 4 being the very likely to go up and 0 being very likely to go down. Pay particular attention to
        anything mentioned in the article that could be a major news catalyst or strong volume or price signals. Please give me the answer as just an array of numbers corresponding
        to the array of symbols using valid JSON only. That part is super important because I will parse your answer as JSON. So the third number in your answer array should be the predicted likelihood for the third symbol, etc. I don't want any explanation of reasoning or any other information; just the answer array please. 
        Here's the
        article: ${text} Here's the array of symbols: ${syms}`;

        queryChatGPT(query).then((gptResponse) => {
            // console.log(gptResponse);
            const jsonResponse = gptResponse.split("```").join("").split("json").join("");
            resolve(JSON.parse(jsonResponse));
        });
    });
}

// returns array of numbers corresponding to syms - positive for good, negative for bad
// function evaluateArticleForSyms(syms, article) {
//     const positiveWords = ["up", "strong", "growth", "surge", "increase", "rising", "bullish", "positive", "good", "buy"];
//     const negativeWords = ["down", "weak", "decline", "drop", "fall", "bearish", "negative", "bad", "sell", "crash"];
//     const snippetLength = 200;
    
//     return new Promise((resolve) => {
//         const text = purgeBadControlChars(article);
//         const answer = [];
//         syms.forEach((sym) => {
//             let positives = 0;
//             let negatives = 0;
//             const idxs = returnAllIndexes(sym, article);
//             idxs.forEach((idx) => {
//                 const snippet = text.slice(idx - (1.0 * snippetLength / 2), idx + (1.0 * snippetLength / 2));
//                 positiveWords.forEach((word) => {
//                     if (snippet.includes(word)) {
//                         positives += 1;
//                     }
//                 });
//                 negativeWords.forEach((word) => {
//                     if (snippet.includes(word)) {
//                         negatives += 1;
//                     }
//                 });
//             });
//             answer.push(positives - negatives);
//         });
//         // return answer;
//         resolve(answer);
//     });
// }

function returnAllIndexes(target, text) {
    const idx = text.indexOf(target);
    if (idx === -1) {
        return [];
    } else {
        const answer = [idx];
        answer.push(...returnAllIndexes(target, text.slice(idx + 1, text.length)));
        return answer;
    }
}

function purgeBadControlChars(input) {
    // Regular expression to match control characters (0x00 to 0x1F, excluding valid JSON escapes like \n, \t, etc.)
    return input.replace(/[\x00-\x1F\x7F]/g, '');
}



// fetchNews(["JBLU", "AAPL"], "2025-08-20", "2025-08-21").then((news) => {
//     // console.log(news);
//     const newsArrToUse = news.map((articleObj) => {
//         return {
//             headline: articleObj.headline,
//             summary: articleObj.summary,
//             symbols: articleObj.symbols
//         };
//     });

//     // console.log(newsArrToUse);

//     const query = `I want to give you some headlines and article summaries about stocks all from the same day. The articles will be in the form of an array of objects, one object for
//     each article. There are three pieces of data in each object: the headline, the summary, and an array of symbols mentioned in the article. I'd like you to pick from all the ticker symbols
//     listed in the articles 1-3 that, based on the article content, are likely to go up during the following day (not necessarily long term) and 1-3 that are likely to go down. Here 
//     is the array in stringified form: ${JSON.stringify(newsArrToUse)}`;
    
//     queryChatGPT(query).then((res) => {
//         console.log(res);
//     });
// });

// queryChatGPT("tell me a joke").then((res) => {
//     console.log(res);
// });