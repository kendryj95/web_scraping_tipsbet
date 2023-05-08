const fetch = require("node-fetch");
const cheerio = require("cheerio");
const fs = require("fs");
const moment = require('moment');
const { exit } = require("process");


const DATE = process.env.DATE || moment().format("YYYY-MM-DD")

console.log("DATE >>>>", DATE);

// function to get the raw data
const getRawData = (URL) => {
    return fetch(URL)
        .then((response) => response.text())
        .then((data) => {
            return data;
        });
};

const getRawWithBodyData = (URL, matchid) => {
    return fetch(URL,{
        "headers": {
            "content-type": "application/x-www-form-urlencoded; charset=UTF-8"
        },
        "body": `object={"action":"getMatchBetInformation","matchid":${matchid}}`,
        "method": "POST"
    })
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
const URL_MATCH_INFO_BET = "http://www.statarea.com/actions/controller";

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
    if (competitions.length > 0) {
        console.log("# --- Date --- Team1 --- Team2 --- Tip --- % Tip --- Result");
        let n = 0;
        for (let i = 0; i < competitions.length; i++) {

            const tip = competitions[i].children[2].children[1].children[1].children[0].children[0].data;
            if (tip == "1" || tip == "1X" || tip == "2" || tip == "X2" || tip == "12") {
                const tipTeam1 = parseInt(competitions[i].children[3].children[0].children[1].children[0].children[0].data);
                const tipTeam2 = parseInt(competitions[i].children[3].children[0].children[3].children[0].children[0].data);
                const matchId = competitions[i].attribs.id;

                let percentTip = 0;
                if (tipTeam1 >= 59 || tipTeam2 >= 59) {
                    const rawData = await getRawWithBodyData(URL_MATCH_INFO_BET, matchId);

                    // parsing the data
                    const parsedData = cheerio.load(rawData);

                    const infoBet = parsedData("div.halfcontainer");
                    const betTeam1 = infoBet[0].children[0].children[1].children[0].children[0].data;
                    const betTeam2 = infoBet[0].children[0].children[3].children[0].children[0].data;

                    n++;

                    if (tipTeam1 >= 59) {
                        percentTip = tipTeam1;
                        percentages.push(tipTeam1)
                    } else {
                        percentTip = tipTeam2;
                        percentages.push(tipTeam2);
                    }

                    const team1 = competitions[i].children[2].children[2].children[1].children[1].children[0].children[0].data;
                    const team2 = competitions[i].children[2].children[2].children[2].children.filter(e => e.attribs && e.attribs.class == "name")[0].children[0].children[0].data;
                    const date = competitions[i].children[1].children[0].data;
                    const goalsTeam1 = competitions[i].children[2].children[2].children[1].children[0].children[0].data;
                    const goalsTeam2 = competitions[i].children[2].children[2].children[2].children[0].children[0].data;
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
                    const row = `${n} --- ${date} --- ${team1} (${betTeam1}) (${goalsTeam1}) --- ${team2} (${betTeam2}) (${goalsTeam2}) --- ${tip} --- ${percentTip}% --- ${resultTip}`;
                    console.log(row);
                    if (countTypeResult.yes < 4 && resultTip == "YES") {
                        top3.push(row)
                    }
                }
            }
        }

        if (percentages.length > 0) {
            const total = countTypeResult.yes + countTypeResult.no;
            const success = ((countTypeResult.yes * 100) / total).toFixed(2);

            console.log("\nEstadísticas de tips:");
            console.log(`    acertados = ${countTypeResult.yes}, perdidos = ${countTypeResult.no}, no iniciados = ${countTypeResult.na}`);
            console.log("Porcentajes de tips:");
            console.log(`    Mínimo = ${mathArray.min(percentages)}, Máximo = ${mathArray.max(percentages)}, Media = ${mathArray.avg(percentages)}, Acierto = ${success}`);
            console.log("---------------------------------------------------------------");
        } else {
            console.log("----------- NO EXISTEN JUEGOS CON ALTAS PROBABILIDADES -----------");
        }


    } else {
        console.log("No hay juegos...");
    }
};
// invoking the main function
scrapeData();