const fs = require("fs");
const slugify = require("slugify");
const moment = require("moment");
const htmlParser = require("node-html-parser");

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

function getLink(text) {
  const root = htmlParser.parse(text);
  return root.querySelector("a").getAttribute("href");
}

const phoneHeads = fs
  .readFileSync(`${__dirname}/randomDB/dienthoai.txt`)
  .toString()
  .split("\n")
  .filter((x) => x.length > 0);

const zeroPad = (num, places) => String(num).padStart(places, "0");

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomPhoneNumber() {
  const head = phoneHeads[getRandomInt(0, phoneHeads.length - 1)];
  const tail = zeroPad(getRandomInt(0, 9999999), 7);
  return head.toString() + tail.toString();
}

function getRandomDate(start, end) {
  const date = new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
  return moment(date).format("DD/MM/YYYY");
}

const familyNames = fs
  .readFileSync(`${__dirname}/randomDB/ho.txt`)
  .toString()
  .split("\n")
  .filter((x) => x.length > 0);

const givenNames = fs
  .readFileSync(`${__dirname}/randomDB/ten.txt`)
  .toString()
  .split("\n")
  .filter((x) => x.length > 0);

function getRandomName() {
  const familyNameIndex = getRandomInt(0, 99);
  const givenNameIndex = getRandomInt(0, 199);

  return givenNameIndex > 99
    ? `${familyNames[familyNameIndex]} Thị ${givenNames[givenNameIndex]}`
    : `${familyNames[familyNameIndex]} Văn ${givenNames[givenNameIndex]}`;
}

function getRandomEmailFromName(name) {
  return (
    slugify(name.toLowerCase(), "") +
    getRandomInt(0, 9999) +
    "@tuoitrebachkhoa.edu.vn"
  );
}

function log(message) {
  fs.appendFileSync(`${__dirname}/log.txt`, message + "\n");
}

function readFile(filepath) {
  return fs.readFileSync(`${filepath}`)
    .toString()
    .split("\n")
    .filter((x) => x.length > 0);
}

function appendFile(filepath, content) {
  fs.appendFileSync(filepath, content);
}
function checkFileExistsAndCreate(filepath) {
  if (!fs.existsSync(filepath)) fs.appendFileSync(filepath, "");
}

function getRandomFaculty() {
  const faculties = [
    "MT",
    "VP",
    "XD",
    "QT",
    "CK",
    "DD",
    "HC",
    "DC",
    "QL",
    "UD",
    "VL",
    "GT",
    "MO",
    "BD",
    "CC",
    "TT",
  ];

  return faculties[getRandomInt(0, faculties.length - 1)];
}

module.exports = {
  delay,
  getLink,
  getRandomInt,
  getRandomDate,
  getRandomPhoneNumber,
  getRandomName,
  log,
  readFile,
  checkFileExistsAndCreate,
  getRandomEmailFromName,
  getRandomFaculty,
  appendFile,
};
