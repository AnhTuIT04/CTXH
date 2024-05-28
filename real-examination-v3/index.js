const puppeteer = require("puppeteer-extra");
const fs = require("fs");
const moment = require("moment");
const { exit, argv } = require("process");
const { getConfirmationLink, authorize } = require("./getEmail");

const UNKNOWN = "UNKNOWN";
const YES = "YES";
const NO = "NO";

const BASED = 300;

const currentQuestions = [];

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

function arrayCompare(_arr1, _arr2) {
  if (
    !Array.isArray(_arr1) ||
    !Array.isArray(_arr2) ||
    _arr1.length !== _arr2.length
  ) {
    return false;
  }

  // .concat() to not mutate arguments
  const arr1 = _arr1.concat().sort();
  const arr2 = _arr2.concat().sort();

  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }

  return true;
}

const accountFile = argv[2];

let students = fs
  .readFileSync(`${__dirname}/${accountFile}`)
  .toString()
  .split("\n")
  .filter((x) => x.length > 0)
  .map((x) =>
    Object({
      account: x,
    })
  );

let questionBank = JSON.parse(
  fs.readFileSync(`${__dirname}/questionBank.json`).toString()
);

function getQuestionInBank(rawItem) {
  return questionBank.find(
    (item) =>
      item.question == rawItem.question &&
      arrayCompare(
        item.answers,
        rawItem.answers.map((x) => x.toString())
      )
  );
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

let unknownQuestion = [];
let history = [-1, -2, -3];

(async () => {
  while (
    !history.every((value) => value === history[0]) &&
    students.length > 0
  ) {
    console.log(history);
    for (const student of students) {
      console.log(`${student.account}: Bắt đầu thi`);
      // const log = fs.readFileSync(`${__dirname}/log.txt`).toString();
      // if (log.search(`${student.id} - ${student.name}: Đã thi xong`) >= 0) {
      //   console.log(`${student.id} - ${student.name}: Không thi nữa`);
      //   continue;
      // }
      const browser = await puppeteer.launch({ headless: true });
      try {
        const page = await browser.newPage();
        await page.goto("https://nghiquyet.hoisinhvien.com.vn/login");
        await page.type("#email", student.account);
        await page.type("#password", "123456789");
        try {
          await Promise.all([
            page.click(`button.btnGrad`),
            page.waitForNavigation(),
          ]);
        } catch (e) {
          const auth = await authorize();
          const confirmationLink = await getConfirmationLink(
            auth,
            student.account
          );

          const confirmPage = await browser.newPage();
          await Promise.all([
            confirmPage.goto(confirmationLink),
            confirmPage.waitForNavigation(),
          ]);

          throw new Error("Exam again");
        }

        fs.appendFileSync(
          `${__dirname}/log.txt`,
          `* ${student.account}: Bắt đầu thi\n`
        );

        const spanInfoSelector = await page.$$(`span.checked`);
        const numOfUsedExamination = await page.evaluate(
          (el) => el.innerText,
          spanInfoSelector[spanInfoSelector.length - 1]
        );
        const score = await page.evaluate(
          (el) => el.innerText,
          spanInfoSelector[spanInfoSelector.length - 3]
        );
        if (score >= 30 || numOfUsedExamination == 2) {
          console.log(`${student.account}: Không còn lượt thi`);
          students = students.filter((x) => x.account != student.account);
          fs.writeFileSync(
            `${__dirname}/${accountFile}`,
            students.map((x) => `${x.account}`).join("\n")
          );
          history.pop();
          history.unshift(students.length);
          await browser.close();
          continue;
        }

        await Promise.all([
          page.goto(`https://nghiquyet.hoisinhvien.com.vn/thi-that`),
          page.waitForNavigation(),
        ]);

        await Promise.all([page.click("a.btnStart"), delay(5000)]);

        // continue; ///////

        for (let i = 0; i < 50; i++) {
          let question = await page.$eval(
            "p.question_content",
            (el) => el.innerText
          );

          if (question.trim().length == 0) {
            throw new Error("Empty question");
          }
          console.log(`Câu ${i + 1}: ${question}`);
          let answers = [];
          let answerSelectors = await page.$$(".answer-item .contentAnswer");
          for (const [index, selector] of answerSelectors.entries()) {
            const answerText = await selector.evaluate((x) => x.innerText);
            answers.push(answerText);
          }

          let questionInBank = getQuestionInBank({
            question: question,
            answers: answers,
          });

          let correctAnswer;
          if (!questionInBank) {
            unknownQuestion.push({
              question: question,
              answers: answers,
            });
            correctAnswer = answers[getRandomInt(0, 3)];
          } else correctAnswer = questionInBank.correct;

          for (const [index, selector] of answerSelectors.entries()) {
            const answerText = await selector.evaluate((x) => x.innerText);
            if (answerText == correctAnswer) {
              await selector.click();
              await delay(BASED * 5);
              break;
            }
          }
        }

        // await page.screenshot({
        //   path: `${__dirname}/result/${student.id}.png`,
        //   fullPage: true,
        // });
        // message_error_login
        students = students.filter((x) => x.account != student.account);

        fs.appendFileSync(
          `${__dirname}/log.txt`,
          `* ${student.account}: Đã thi xong\n`
        );
      } catch (e) {
        console.log(e);
        fs.appendFileSync(
          `${__dirname}/log.txt`,
          `*** Đã có lỗi xảy ra trong quá trình thi của ${student.account}: ${e.message}\n`
        );
      }

      fs.writeFileSync(
        `${__dirname}/${accountFile}`,
        students.map((x) => `${x.account}`).join("\n")
      );
      history.pop();
      history.unshift(students.length);
      await browser.close();
    }
  }
})();
