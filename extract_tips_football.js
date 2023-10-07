const fetch = require("node-fetch");
const cheerio = require("cheerio");
const fs = require("fs");
const moment = require('moment');
const xl = require('excel4node');
const path = require('path');
const yargs = require('yargs');

const argv = yargs
  .options({
    'cuota': {
      describe: 'Consulta las cuotas de los equipos.',
      type: 'boolean',
      default: false, // Valor por defecto si no se proporciona
    },
  })
  .argv;

const DATE = process.env.DATE || moment().format("YYYY-MM-DD")
let today = DATE + '---' + moment().format('YYYY-MM-DD-H-mm-ss');

console.log("DATE >>>>", DATE);

var wb = new xl.Workbook();

// Crear estilos
const cualColumnaEstilo = wb.createStyle({
    font: {
        name: 'Arial',
        color: '#000000',
        size: 10,
        bold: true,
    }
});

const contenidoEstilo = wb.createStyle({
    font: {
        name: 'Arial',
        color: '#494949',
        size: 9,
    }
});

const contenidoEstiloTip = wb.createStyle({
    font: {
        name: 'Arial',
        color: '#AD1F00',
        size: 9,
        bold: true
    }
});

// function to get the raw data
const getRawData = (URL) => {
    return fetch(URL)
        .then((response) => response.text())
        .then((data) => {
            return data;
        });
};

const getRawWithBodyData = async (URL, matchid) => {
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

    // const competitions = parsedData("div.competition .body .match");
    const competitions = parsedData('div.competition[id^="0"]');

    const countTypeResult = {
        yes: 0,
        no: 0,
        na: 0
    };

    const top3 = [];

    const percentages = [];
    if (competitions.length > 0) {

        let nombreArchivo = "tips-"+today;
        let ws = wb.addWorksheet(nombreArchivo);
        let lineData = 2;

        //Nombres de las columnas
        ws.cell(1, 1).string("#").style(cualColumnaEstilo);
        ws.cell(1, 2).string("Competición").style(cualColumnaEstilo);
        ws.cell(1, 3).string("Fecha").style(cualColumnaEstilo);
        ws.cell(1, 4).string("Local").style(cualColumnaEstilo);
        ws.cell(1, 5).string("Visitante").style(cualColumnaEstilo);
        ws.cell(1, 6).string("Pronostico").style(cualColumnaEstilo);
        ws.cell(1, 7).string("Resultado").style(cualColumnaEstilo);

        console.log("# --- Date --- Team1 --- Team2 --- Tip --- % Tip --- Result");
        let n = 0;
        for (let i = 0; i < competitions.length; i++) {

            const nameCompetition = competitions[i].children.filter(e => e.attribs && e.attribs.class == "header")[0].children.filter(e => e.attribs && e.attribs.class == "name")[0].children[0].data;
            const matches = competitions[i].children.filter(e => e.attribs && e.attribs.class == "body")[0].children.filter(e => e.attribs && e.attribs.class == "match");
           
            for (let j = 0; j < matches.length; j++) {
                const tip = matches[j].children[2].children[1].children[1].children[0].children[0].data;
                if (tip == "1" || tip == "1X" || tip == "2" || tip == "X2" || tip == "12") {
                    const tipTeam1 = parseInt(matches[j].children[3].children[0].children[1].children[0].children[0].data);
                    const tipTeam2 = parseInt(matches[j].children[3].children[0].children[3].children[0].children[0].data);
                    const matchId = matches[j].attribs.id;

                    let percentTip = 0;
                    if (tipTeam1 >= 59 || tipTeam2 >= 59) {
                        
                        let betTeam1 = 'n/a';
                        let betTeam2 = 'n/a';

                        if (argv.cuota === true) {   
                            const rawData = await getRawWithBodyData(URL_MATCH_INFO_BET, matchId);

                            // parsing the data
                            const parsedData = cheerio.load(rawData);

                            const infoBet = parsedData("div.halfcontainer");
                            betTeam1 = infoBet.length > 0 ? infoBet[0].children[0].children[1].children[0].children[0].data : 'n/a';
                            betTeam2 = infoBet.length > 0 ? infoBet[0].children[0].children[3].children[0].children[0].data : 'n/a';
                        }

                        n++;

                        if (tipTeam1 >= 59) {
                            percentTip = tipTeam1;
                            percentages.push(tipTeam1)
                        } else {
                            percentTip = tipTeam2;
                            percentages.push(tipTeam2);
                        }

                        const team1 = matches[j].children[2].children[2].children[1].children[1].children[0].children[0].data;
                        const team2 = matches[j].children[2].children[2].children[2].children.filter(e => e.attribs && e.attribs.class == "name")[0].children[0].children[0].data;
                        const date = matches[j].children[1].children[0].data;
                        const goalsTeam1 = matches[j].children[2].children[2].children[1].children[0].children[0].data;
                        const goalsTeam2 = matches[j].children[2].children[2].children[2].children[0].children[0].data;
                        const classResultTip = matches[j].children[2].children[1].children[1].attribs.class;
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

                        // Construcción del excel
                        ws.cell(lineData, 1).number(n).style(contenidoEstilo);
                        ws.cell(lineData, 2).string(nameCompetition).style(contenidoEstilo);
                        ws.cell(lineData, 3).string((DATE + ' ' + date).toString()).style(contenidoEstilo);
                        ws.cell(lineData, 4).string((team1)).style(contenidoEstilo);
                        ws.cell(lineData, 5).string(team2).style(contenidoEstilo);

                        let tipExcel = tip == '1' ? team1 : team2;
                        
                        ws.cell(lineData, 6).string(tipExcel).style(contenidoEstiloTip);

                        let resultTipExcel = 'N/A';
                        if (resultTip == 'YES') {
                            resultTipExcel = `ACERTADO (${goalsTeam1}-${goalsTeam2})`;
                        } else if (resultTip == 'NO') {
                            resultTipExcel = `FALLADO (${goalsTeam1}-${goalsTeam2})`;
                        }

                        ws.cell(lineData, 7).string(resultTipExcel).style(contenidoEstilo);

                        // Aumenta de fila
                        lineData++;
                        if (countTypeResult.yes < 4 && resultTip == "YES") {
                            top3.push(row)
                        }
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
            console.log(`    Mínimo = ${mathArray.min(percentages)}, Máximo = ${mathArray.max(percentages)}, Media = ${mathArray.avg(percentages)}, Acierto = ${!isNaN(success) ? success : 0}`);
            console.log("---------------------------------------------------------------");

            ws.cell(lineData+2, 3).string("Acertados").style(cualColumnaEstilo);
            ws.cell(lineData+3, 3).string((countTypeResult.yes).toString()).style(contenidoEstilo);
            
            ws.cell(lineData+4, 3).string("Perdidos").style(cualColumnaEstilo);
            ws.cell(lineData+5, 3).string((countTypeResult.no).toString()).style(contenidoEstilo);

            ws.cell(lineData+6, 3).string("% Aciertos total").style(cualColumnaEstilo);
            ws.cell(lineData+7, 3).string(!isNaN(success) ? success.toString() : 'N/A').style(contenidoEstilo);


            //Ruta del archivo
            const pathExcel = path.join(__dirname, 'excel', nombreArchivo + '.xlsx');
            //Escribir o guardar
            wb.write(pathExcel, function(err, stats){
                if(err) console.log(err);
                else{

                    // Crear función y descargar archivo
                    function downloadFile(){res.download(pathExcel);}
                    //downloadFile();

                    // Borrar archivo
                    /* fs.rm(pathExcel, function(err){
                        if(err) console.log(err);
                        else  console.log("Archivo descargado y borrado del servidor correctamente");
                    }); */
                }
            });
        } else {
            console.log("----------- NO EXISTEN JUEGOS CON ALTAS PROBABILIDADES -----------");
        }

    } else {
        console.log("No hay juegos...");
    }
};
// invoking the main function
scrapeData();