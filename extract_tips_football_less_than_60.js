const fetch = require("node-fetch");
const cheerio = require("cheerio");
const fs = require("fs");

const moment = require('moment');


const DATE = process.env.DATE || moment().format("YYYY-MM-DD")

// function to get the raw data
const getRawData = (URL) => {
    return fetch(URL)
        .then((response) => response.text())
        .then((data) => {
            return data;
        });
};

const mathArray = {
    max: (numbers) => {
        return Math.max.apply(null, numbers);
    },
    min: (numbers) => {
        return Math.min.apply(null, numbers);
    },
    sum: (numbers) => {
        const reducer = (accumulator, currentValue) => accumulator + currentValue;
        return numbers.reduce(reducer);
    },
    avg: (numbers) => {
        const reducer = (accumulator, currentValue) => accumulator + currentValue;
        const total = numbers.reduce(reducer);
        return (total / numbers.length).toFixed(2);
    }
}

// URL for data
const URL = `http://www.statarea.com/predictions/date/${DATE}/competition`;

// start of the program
const scrapeData = async () => {
    const rawData = await getRawData(URL);
    // parsing the data
    const parsedData = cheerio.load(rawData);

    const competitions = parsedData("div.competition .body .match");

    const countTypeResult = {
        yes: 0,
        no: 0,
        na: 0
    };

    const top3 = [];

    const percentages = [];
    console.log("# --- Date --- Team1 --- Team2 --- Tip --- % Tip --- Result");
    let n = 0;
    for (let i = 0; i < competitions.length; i++) {
        const tip = competitions[i].children[2].children[1].children[1].children[0].children[0].data;
        let percentTip = 0;
        const tipTeam1 = parseInt(competitions[i].children[3].children[0].children[1].children[0].children[0].data);
        const tipTeam2 = parseInt(competitions[i].children[3].children[0].children[3].children[0].children[0].data);

        if ((tip == "1" || tip == "1X") && tipTeam1 > tipTeam2) {

            if (tipTeam1 >= 60) {
                continue;
            }
            percentTip = tipTeam1;
            percentages.push(tipTeam1);
        } else if ((tip == "2" || tip == "X2") && tipTeam2 > tipTeam1) {
            if (tipTeam2 >= 60) {
                continue;
            }
            percentTip = tipTeam2;
            percentages.push(tipTeam2);
        } else {
            continue;
        }

        n++;

        const team1 = competitions[i].children[2].children[2].children[1].children[1].children[0].children[0].data;
        const team2 = competitions[i].children[2].children[2].children[2].children.filter(e => e.attribs && e.attribs.class == "name")[0].children[0].children[0].data;
        const date = competitions[i].children[1].children[0].data;
        const classResultTip = competitions[i].children[2].children[1].children[1].attribs.class;
        let resultTip = "NA";
        if (classResultTip.indexOf("success") >= 0) {
            resultTip = "YES";
            countTypeResult.yes += 1;
        } else if (classResultTip.indexOf("failed") >= 0) {
            resultTip = "NO";
            countTypeResult.no += 1;
        } else {
            countTypeResult.na += 1;
        }
        const row = `${n} --- ${date} --- ${team1} --- ${team2} --- ${tip} --- ${percentTip}% --- ${resultTip}`;
        console.log(row);
        if (countTypeResult.yes < 4 && resultTip == "YES") {
            top3.push(row)
        }
    }
    const total = countTypeResult.yes + countTypeResult.no;
    const success = ((countTypeResult.yes * 100) / total).toFixed(2);

    console.log("\nEstadísticas de tips:");
    console.log(`    acertados = ${countTypeResult.yes}, perdidos = ${countTypeResult.no}, no iniciados = ${countTypeResult.na}`);
    console.log("Porcentajes de tips:");
    console.log(`    Mínimo = ${mathArray.min(percentages)}, Máximo = ${mathArray.max(percentages)}, Media = ${mathArray.avg(percentages)}, Acierto = ${success}`);
    console.log("---------------------------------------------------------------");
    /* if (top3.length > 0) {
     console.log("TOP 3 WIN:");
     top3.forEach(v => {
         console.log(v);
     })
    } */
};
// invoking the main function
scrapeData();