/**
 * Advanced 1-Minute Momentum Pullback Strategy
 * Includes: 5-min Alignment, Volatility Contraction, and Time Filtering.
 */
 function analyzeTradeSignal(bars, avgVolumeByTime = null) {
    if (bars.length < 30) return { action: "HOLD", score: 0, reason: "Warming up" };

    const i = bars.length - 1;
    const currentBar = bars[i];
    const prevBar = bars[i - 1];

    // --- 1. Indicators (Vectorized logic for the lookback period) ---
    const closes = bars.map(b => b.close);
    const ema9 = calculateEMA(closes, 9);
    const ema20 = calculateEMA(closes, 20);
    const vwap = calculateVWAP(bars);
    const atr14 = calculateATR(bars, 14);

    // --- 2. Multi-Timeframe Alignment (Synthetic 5-Min Trend) ---
    // We look at the last 5 bars to simulate one 5-minute candle
    const fiveMinBars = bars.slice(-5);
    const fiveMinClose = fiveMinBars[4].close;
    const fiveMinOpen = fiveMinBars[0].open;
    const isFiveMinBullish = fiveMinClose > fiveMinOpen && fiveMinClose > vwap[i];

    // --- 3. Time-of-Day Filter ---
    const barDate = new Date(currentBar.time);
    const hour = barDate.getHours();
    const min = barDate.getMinutes();
    const totalMinutes = hour * 60 + min;
    
    // Trading Windows (EST): 9:45-11:00 (585-660) and 14:30-15:45 (870-945)
    const isGoldHours = (totalMinutes >= 585 && totalMinutes <= 660) || 
                        (totalMinutes >= 870 && totalMinutes <= 945);

    // --- 4. Volatility Contraction (Is the pullback "quiet"?) ---
    const currentRange = currentBar.high - currentBar.low;
    const last5Ranges = bars.slice(-6, -1).map(b => b.high - b.low);
    const avgRange = last5Ranges.reduce((a, b) => a + b, 0) / 5;
    const isContracting = currentRange < (avgRange * 1.1); // Range isn't exploding

    // --- 5. Core Logic Checks ---
    const isTrendAligned = ema9[i] > ema20[i] && currentBar.close > vwap[i];
    const isPullback = prevBar.low <= ema9[i-1] && prevBar.close < prevBar.open;
    const isTrigger = currentBar.close > prevBar.high && currentBar.close > currentBar.open;

    // --- 6. Scoring System ---
    let score = 0;
    let reasons = [];

    if (isTrendAligned && isFiveMinBullish) { 
        score += 40; 
    } else {
        reasons.push("Trend/MTF mismatch");
    }

    if (isPullback) score += 20;
    if (isTrigger) score += 20;
    if (isContracting) score += 10;
    if (isGoldHours) score += 10;

    // Relative Volume (if data provided)
    if (avgVolumeByTime) {
        const timeKey = barDate.toTimeString().substring(0, 5);
        if (currentBar.volume > (avgVolumeByTime[timeKey] * 1.5)) score += 10;
    }

    

    // --- 7. Execution Logic ---
    if (score >= 80) {
        // "Close-Under" Stop Loss Logic: 
        // We set the level here; the backtester must check for a *close* below it.
        const stopLevel = Math.min(currentBar.low, prevBar.low) - (atr14[i] * 0.5);
        
        return {
            action: "BUY",
            score,
            price: currentBar.close,
            stopLoss: parseFloat(stopLevel.toFixed(2)),
            takeProfit: parseFloat((currentBar.close + (currentBar.close - stopLevel) * 2).toFixed(2)),
            reason: "High-Confidence Momentum Pullback"
        };
    }

    return { action: "HOLD", score, reason: reasons.join(", ") || "No setup" };
}

// --- Helper Functions (Standard Math) ---

function calculateEMA(data, period) {
    const k = 2 / (period + 1);
    let ema = [];
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
        if (i < period) {
            sum += data[i];
            ema.push(sum / (i + 1));
        } else {
            ema.push((data[i] - ema[i - 1]) * k + ema[i - 1]);
        }
    }
    return ema;
}

function calculateVWAP(bars) {
    let cpv = 0, cv = 0;
    return bars.map(b => {
        cpv += ((b.high + b.low + b.close) / 3) * b.volume;
        cv += b.volume;
        return cpv / cv;
    });
}

function calculateATR(bars, period) {
    let atr = [];
    let trs = bars.map((b, i) => {
        if (i === 0) return b.high - b.low;
        return Math.max(b.high - b.low, Math.abs(b.high - bars[i-1].close), Math.abs(b.low - bars[i-1].close));
    });
    let sum = 0;
    for (let i = 0; i < trs.length; i++) {
        if (i < period) {
            sum += trs[i];
            atr.push(sum / (i + 1));
        } else {
            atr.push((atr[i - 1] * (period - 1) + trs[i]) / period);
        }
    }
    return atr;
}

// /**
//  * Analyzes an array of 1-minute bars to determine if a trade entry exists.
//  * Assumes 'bars' is an array of objects sorted by time (Oldest -> Newest).
//  * Bar format: { time, open, high, low, close, volume }
//  * * @param {Array} bars - The history of 1-minute bars up to the current moment
//  * @param {Object} avgVolumeByTime - (Optional) Map of "HH:MM" -> AvgHistoricalVolume for RVOL
//  * @returns {Object} - { action: "BUY"|"HOLD", score: number, stopLoss: number, reason: string }
//  */
// function analyzeTradeSignal(bars, avgVolumeByTime = null) {
//     // 1. Data Sufficiency Check
//     // We need at least 20 bars to calculate the EMA(20) validly.
//     if (bars.length < 21) {
//         return { action: "HOLD", score: 0, reason: "Insufficient data" };
//     }

//     // --- Helper Functions for Indicators ---

//     // Calculate Simple Moving Average (for initial EMA steps)
//     const calculateSMA = (data, period) => {
//         const slice = data.slice(0, period);
//         return slice.reduce((sum, val) => sum + val, 0) / period;
//     };

//     // Calculate Exponential Moving Average Array
//     const calculateEMA = (values, period) => {
//         const k = 2 / (period + 1);
//         let emaArray = [];
//         // Start with SMA
//         let initialSMA = calculateSMA(values, period);
//         // Fill nulls for indices before period
//         for (let i = 0; i < period - 1; i++) emaArray.push(null);
//         emaArray.push(initialSMA);
        
//         // Calculate the rest
//         for (let i = period; i < values.length; i++) {
//             let prevEMA = emaArray[i - 1];
//             let currentEMA = (values[i] - prevEMA) * k + prevEMA;
//             emaArray.push(currentEMA);
//         }
//         return emaArray;
//     };

//     // Calculate VWAP Array
//     const calculateVWAP = (barData) => {
//         let cumPV = 0;
//         let cumVol = 0;
//         return barData.map(bar => {
//             const tp = (bar.high + bar.low + bar.close) / 3;
//             cumPV += (tp * bar.volume);
//             cumVol += bar.volume;
//             return cumPV / cumVol;
//         });
//     };

//     // Calculate ATR Array (Wilder's Smoothing)
//     const calculateATR = (barData, period = 14) => {
//         let trValues = barData.map((bar, i) => {
//             if (i === 0) return bar.high - bar.low;
//             const prevClose = barData[i - 1].close;
//             return Math.max(
//                 bar.high - bar.low,
//                 Math.abs(bar.high - prevClose),
//                 Math.abs(bar.low - prevClose)
//             );
//         });

//         let atrArray = [];
//         let initialATR = calculateSMA(trValues, period);
//         for (let i = 0; i < period - 1; i++) atrArray.push(null);
//         atrArray.push(initialATR);

//         for (let i = period; i < trValues.length; i++) {
//             let prevATR = atrArray[i - 1];
//             let currentATR = ((prevATR * (period - 1)) + trValues[i]) / period;
//             atrArray.push(currentATR);
//         }
//         return atrArray;
//     };

//     // --- Main Logic ---

//     // Extract arrays needed
//     const closes = bars.map(b => b.close);
//     const ema9 = calculateEMA(closes, 9);
//     const ema20 = calculateEMA(closes, 20);
//     const vwap = calculateVWAP(bars);
//     const atr14 = calculateATR(bars, 14);

//     // Get current (latest) values
//     const i = bars.length - 1; // Current index
//     const currentBar = bars[i];
//     const prevBar = bars[i - 1];
    
//     // Check if indicators are fully populated (not null)
//     if (ema20[i] === null || atr14[i] === null) {
//         return { action: "HOLD", score: 0, reason: "Indicators warming up" };
//     }

//     // --- Condition Checks ---

//     // 1. Trend Filters
//     const aboveVWAP = currentBar.close > vwap[i];
//     const emaAligned = ema9[i] > ema20[i];
//     const risingTrend = ema20[i] > ema20[i-1]; // Slope is positive
    
//     // 2. Pullback / Setup Detection
//     // Did the PREVIOUS bar act as a pullback? (Red candle or dip near EMA)
//     const prevWasRed = prevBar.close < prevBar.open;
//     // Check if previous Low dipped into the "Value Zone" (between EMA9 and EMA20)
//     // Or at least touched the EMA9
//     const validPullback = prevBar.low <= ema9[i-1]; 

//     // 3. Trigger (The Breakout)
//     // Current bar must be Green (buyers in control)
//     const isGreen = currentBar.close > currentBar.open;
//     // Current Close breaks Previous High (momentum returning)
//     const breaksHigh = currentBar.close > prevBar.high;
    
//     // 4. Volume Confirmation
//     // Is current volume higher than the average of the last 3 bars?
//     const last3Vol = [bars[i].volume, bars[i-1].volume, bars[i-2].volume];
//     const avgRecentVol = last3Vol.reduce((a, b) => a + b, 0) / 3;
//     const volSurge = currentBar.volume > avgRecentVol;

//     // --- Scoring Algorithm ---
//     let score = 0;

//     if (aboveVWAP && emaAligned && risingTrend) score += 30; // Strong Trend Context
//     if (prevWasRed && validPullback) score += 20;            // Good Setup
//     if (isGreen && breaksHigh) score += 30;                  // Valid Trigger
//     if (volSurge) score += 20;                               // Volume Confirmation

//     // Bonus: Relative Volume (RVOL) Check
//     // If you pass in an object like { "09:45": 50000 }
//     if (avgVolumeByTime) {
//         // Parse time from ISO string or timestamp to "HH:MM"
//         // Adjust this parsing based on your specific date format
//         const dateObj = new Date(currentBar.time); 
//         const timeKey = dateObj.toTimeString().substring(0, 5); // "09:30"
        
//         if (avgVolumeByTime[timeKey]) {
//             const rvol = currentBar.volume / avgVolumeByTime[timeKey];
//             if (rvol > 1.5) score += 10;
//         }
//     }

//     // --- Decision ---
    
//     // We only Buy if Score >= 80 (High Confidence)
//     if (score >= 80) {
//         // Calculate Stop Loss
//         // Risk Management: Stop is below the recent low minus buffer (1.5 * ATR)
//         const recentLow = Math.min(currentBar.low, prevBar.low);
//         const buffer = 1.5 * atr14[i];
//         const stopLossPrice = recentLow - buffer;

//         return {
//             action: "BUY",
//             score: score,
//             entryPrice: currentBar.close,
//             stopLoss: parseFloat(stopLossPrice.toFixed(2)),
//             reason: "Momentum Pullback Triggered"
//         };
//     }

//     return { 
//         action: "HOLD", 
//         score: score, 
//         reason: "Criteria not met" 
//     };
// }

module.exports = {
    analyzeTradeSignal
};