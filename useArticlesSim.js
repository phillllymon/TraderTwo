const { fetchNews } = require("./fetchNews");
const { queryChatGPT } = require("./chatGPT");
const { fetchDaysAllStocks } = require("./fetchDays");
const { daysDataToDayGroupsRaw, arrAve, findRValue } = require("./util");


let startDate = "2025-07-01";
let endDate = "2025-08-25";

const articleThreshold = 0;
const lookBack = 2;

let params = {
    useCache: true,
    exchange: "NASDAQ",
    // maxCurrentPrice: 0.06,
    // minCurrentPrice: 0.05,
    // maxEverPrice: 0.5,
    // minEverPrice: 0.01,
    maxStartPrice: 100,
    minStartPrice: 80,
    // maxStartPrice: 0.5,
    // minStartPrice: 0.05,
    // minStartVol: 1000,
};

fetchDaysAllStocks(startDate, endDate, params).then((res) => {
    const dayGroups = daysDataToDayGroupsRaw(res);

    const symsToUse = Object.keys(dayGroups[0]);
    fetchNews(symsToUse, startDate, endDate).then((news) => {

        const newsDays = groupArticlesByDay(news);

        const simInfo = {
            amt: 100,
            keepAmt: 100,
            amts: [100],
            keepAmts: [100]
        };
        
        // runDaysRecursive(dayGroups, newsDays, 0, simInfo);
        runDaysRecursive(dayGroups, newsDays, lookBack - 1, simInfo);



        
        
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

function runDaysRecursive(dayGroups, newsDays, i, simInfo) {
    console.log("evaluating day " + (i + 1) + " of " + dayGroups.length);
    return new Promise((resolve) => {
        const today = dayGroups[i];
        const tomorrow = dayGroups[i + 1];

        const days = dayGroups.slice(i - (lookBack - 1), i + 1);

        if (!tomorrow) {
            console.log("days done");
            simInfo.amts.forEach((n) => {
                console.log(n);
            });
            resolve();
        } else {
            const todayDate = today[Object.keys(today)[0]].time.slice(0, 10);
            const todayArticles = newsDays[todayDate];
            const symsToPickFrom = Object.keys(today);
            queryForSymsForDay(todayArticles, symsToPickFrom, days).then((syms) => {
                let buySum = 0;
                let sellSum = 0;
                syms.forEach((sym) => {
                    if (tomorrow[sym]) {
                        buySum += Number.parseFloat(tomorrow[sym].open);
                        sellSum += Number.parseFloat(tomorrow[sym].price);
                        // buySum += Number.parseFloat(today[sym].open);
                        // sellSum += Number.parseFloat(today[sym].price);
                    } else {
                        console.log("MISSING: " + sym);
                    }
                });
                // const fraction = buySum > 0 ? 1.0 * buySum / sellSum : 1;       // simulating shorting instead
                const fraction = buySum > 0 ? 1.0 * sellSum / buySum : 1;
                simInfo.amt *= fraction;
                simInfo.amts.push(simInfo.amt);
                console.log(100 * fraction);
                runDaysRecursive(dayGroups, newsDays, i + 1, simInfo).then(() => {
                    resolve();
                });
            });
        }
    });
}

function queryForSymsForDay(articles, symsToPickFrom, days) {
    return new Promise((resolve) => {
        if (!articles) {
            resolve([]);
        } else {
            // const articlesToUse = articles.slice(0, 12);
            // console.log("total articles: " + articles.length);
            const articlesToUse = articles.map(articleObj => articleObj.headline);
            console.log("sending: " + articlesToUse.length + " articles");
            const dateToUse = articles[0].created_at.slice(0, 10);

            const query = `I'll give you a list of stock symbols and price data for several consecutive days for those symbols. The price data for each day is in
            the form of a json object with the keys being symbols. Each subobject has data for that symbol like open, high, low, and volume. The closing price for the 
            day is listed simply as "price." I'd like you to, based on the days of data as well as whatever you know about stock price trends in general,
            recommend 0-5 of the symbols that would be a promising day trade for the following day. I don't care about long-term outlook, just the next day after the data given
            when I plan to buy at open and sell at close. Here is the list of symbols: ${JSON.stringify(symsToPickFrom)}
            and here is the price data: ${JSON.stringify(days)} The price data is a stringified array where each object in the array represents a day. The open, high, low, and close price
            is listed for each stock for each day. The close price is labeled as "price." Please give me your answer in the form of an array of strings in valid json format. I don't want any
            explanation or anything else, just the json array.`

            // const query = `I'll give you a list of stock symbols and price data for several consecutive days for those symbols. The price data for each day is in
            // the form of a json object with the keys being symbols. Each subobject has data for that symbol like open, high, low, and volume. The closing price for the 
            // day is listed simply as "price." I'd like you to, based on the days of data as well as whatever you know about stock price trends in general,
            // recommend 0-5 of the symbols that would be a promising day trade for the following day. I don't care about long-term outlook, just the next day after the data given
            // when I plan to buy at open and sell at close. I will also give you a list of headlines from the last day to aid your evaluation. Here is the list of symbols: ${JSON.stringify(symsToPickFrom)}
            // and here is the price data: ${JSON.stringify(days)} The price data is a stringified array where each object in the array represents a day. The open, high, low, and close price
            // is listed for each stock for each day. The close price is labeled as "price." Here are the headlines: ${JSON.stringify(articlesToUse)}. Please give me your answer in the form of an array of strings in valid json format. I don't want any
            // explanation or anything else, just the json array.`


            // const query = `I'll give you a date and a list of stock symbols. I'll also give you price data for the symbols for the specified day and some news headlines for that day.
            // The price data will be in
            // the form of a json object with the keys being symbols. Each subobject has data for that symbol like open, high, low, and volume. The closing price for the 
            // day is listed simply as "price." I'd like you to pretend it is the specified date and look up news or other information
            // about the stock symbols that would have been available on or before the specified date. Then recommend 1-5 of the symbols as a good day trade for the
            // following day, based solely on information that was available at the time. I just want to buy at open the following day and sell at close so there is no
            //  need to consider the long term outlook, just the following day. Please give me your answer in the form of an array of strings in valid json format. I don't want any
            // explanation or anything else, just the json array. Here's the date: ${dateToUse} and here are the stock symbols: ${JSON.stringify(symsToPickFrom)} and
            // here is the data for the day: ${JSON.stringify(todayObj)} and here are the headlines: ${JSON.stringify(articlesToUse)}`;

            // const query = `I'm going to give you a bunch of news article headlines from the same day that mention stock ticker symbols. They will be in the form of
            // a stringified array. I'd like you to read the headlines and suggest 1-5 symbols from the following list
            //  that would be good to
            // buy for a day trade the following day. You can only pick symbols that are in this stringified array: ${JSON.stringify(symsToPickFrom)}. Please
            // make sure you only pick from that list, even if other stocks are mentioned in the headlines!
            // I don't care about the long term outlooks, just, based on the information in the headlines, which symbols
            // would be likely to go up the following day. Bear in mind that the headlines are for one day, and we are going to trade the following day, so just
            // because a headline says a stock increased today doesn't mean it will be a good day trade tomorrow. Pay special attention to anything that sounds
            // like earnings reports or catalyst events. Please give me your answer in the form of an array of strings in valid json format. I don't want any
            // explanation or anything else, just the json array.
            // Here are the headlines: ${JSON.stringify(articlesToUse)}`;

            // const query = `I'm going to give you a bunch of news articles from the same day that mention stock ticker symbols. They will be in the form of
            // an array of objects with each object containing an article with additional info about the article, including what symbols are mentioned in the
            // article. The content of the article will also be in the object. I'd like you to read the articles and suggest 1-5 symbols from the following list
            //  that would be good to
            // buy for a day trade the following day. You can only pick symbols that are in this stringified array: ${JSON.stringify(symsToPickFrom)}. Please
            // make sure you only pick from that list, even if other stocks are mentioned in the article!
            // I don't care about the long term outlooks, just, based on the information in the articles, which symbols
            // would be likely to go up the following day. Bear in mind that the articles are for one day, and we are going to trade the following day, so just
            // because an article says a stock increased today doesn't mean it will be a good day trade tomorrow. Pay special attention to anything that sounds
            // like earnings reports or catalyst events. Please give me your answer in the form of an array of strings in valid json format. I don't want any
            // explanation or anything else, just the json array. I'm giving you the array of articles as stringified json.
            // Here are the articles: ${JSON.stringify(articlesToUse)}`;

            // const query = `I'm going to give you a bunch of news articles from the same day that mention stock ticker symbols. They will be in the form of
            // an array of objects with each object containing an article with additional info about the article, including what symbols are mentioned in the
            // article. The content of the article will also be in the object. I'd like you to read the articles and suggest 1-5 symbols that would be good to
            // short the following day. I don't care about the long term outlooks, just, based on the information in the articles, which symbols
            // would be likely to go down the following day. Bear in mind that the articles are for one day, and we are going to trade the following day, so just
            // because an article says a stock increased today doesn't mean it will be a good day trade tomorrow. Pay special attention to anything that sounds
            // like earnings reports or catalyst events. Please give me your answer in the form of an array of strings in valid json format. I don't want any
            // explanation or anything else, just the json array. I'm giving you the array of articles as stringified json.
            // Here are the articles: ${JSON.stringify(articlesToUse)}`;

            queryChatGPT(query).then((syms) => {
                // console.log(syms);
                const justJSON = syms.split("json").join("").split("`").join("");
                console.log(justJSON);
                resolve(JSON.parse(justJSON));
            });
        }
    });
}

function groupArticlesByDay(news) {
    const answer = {};
    news.forEach((articleObj) => {
        const articleDay = articleObj.created_at.slice(0, 10);
        if (!answer[articleDay]) {
            answer[articleDay] = [];
        }
        answer[articleDay].push(articleObj);
    });
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