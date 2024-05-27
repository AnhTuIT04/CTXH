const puppeteer = require("puppeteer-extra");
const fs = require("fs");
const htmlParser = require("node-html-parser");
const moment = require("moment");
const RecaptchaPlugin = require("puppeteer-extra-plugin-recaptcha");
const {
  log,
  delay,
  getRandomDate,
  getRandomInt,
  readFile,
  checkFileExistsAndCreate,
  getRandomName,
  getRandomEmailFromName,
  getRandomPhoneNumber,
  getRandomFaculty,
  appendFile,
} = require("./helper");
const { authorize, getConfirmationLink } = require("./getEmail");

const BASED = 300;

puppeteer.use(
  RecaptchaPlugin({
    provider: {
      id: "2captcha",
      token: "123048c006e4fbd80d711fcea5dc4a14", // REPLACE THIS WITH YOUR OWN 2CAPTCHA API KEY ⚡
    },
    visualFeedback: true, // colorize reCAPTCHAs (violet = detected, green = solved)
  })
);

const numberToGenerate = Number(process.argv[2]);
console.log(numberToGenerate);
if (!numberToGenerate) throw new Error("Number to generate is not valid");

checkFileExistsAndCreate(`${__dirname}/accounts.csv`);

checkFileExistsAndCreate(`${__dirname}/log.txt`);
(async () => {
  const browser = await puppeteer.launch({ headless: true });
  let accounts = readFile(`${__dirname}/accounts.csv`);
  let currentAccount = accounts.length;
  while (accounts.length < numberToGenerate) {
    console.log(`*** Còn ${numberToGenerate - currentAccount} tài khoản cần tạo`);
    try {
      const page = await browser.newPage();
      await Promise.all([
        page.goto("https://nghiquyet.hoisinhvien.com.vn/register"),
        page.waitForNavigation({ waitUntil: "networkidle0" }),
        page.waitForSelector("select#province_id"),
        page.waitForSelector("select#school_id"),
        // page.waitForSelector("select#province_id:nth-child(2)"),
      ]);

      await Promise.all([
        page.select("select#province_id", "79"),
        delay(BASED * 2),
      ]);

      await Promise.all([
        page.select("select#school_id", "228"),
        delay(BASED * 2),
      ]);

      const selectedProvince = await page.$eval(
        "select#province_id",
        (el) => el.value
      );
      //   console.log(await page.$$("select#province_id option"));
      if (!selectedProvince) continue;

      const selectedSchool = await page.$eval(
        "select#school_id",
        (el) => el.value
      );
    //   console.log(selectedSchool);
      if (!selectedSchool) continue;

      const name = getRandomName();
      const email = getRandomEmailFromName(name);
      await page.type("#email", email);
      await page.type("#password", "123456789");
      await page.type("#name", name);
      await page.type("#mobile", getRandomPhoneNumber());
      await page.type(
        "#birthday",
        getRandomDate(new Date("2000-01-01"), new Date("2005-12-31"))
      );

      await page.type("#class", getRandomFaculty());
      await page.solveRecaptchas();
      await delay(BASED * 10);

      log(`Đã điền đầy đủ thông tin trên form đăng ký: ${name} - ${email}`);
      console.log(
        `Đã điền đầy đủ thông tin trên form đăng ký: ${name} - ${email}`
      );
      //   console.log(email, name);

      await Promise.all([page.click("button.btnGrad"), delay(BASED * 60)]);

      log("Đang chờ email xác nhận");
      console.log("Đang chờ email xác nhận");

      await page.screenshot({ path: `${__dirname}/nqhsv.png`, fullPage: true });

      const auth = await authorize();
      let confimationLink = null;
      waitedTime = 0;
      do {
        await delay(BASED * 60);
        waitedTime += BASED * 60;
        confimationLink = await getConfirmationLink(auth, email);
        if (waitedTime > BASED * 800)
          throw new Error("Không tìm thấy email xác nhận");
      } while (!confimationLink);

      const confirmPage = await browser.newPage();
      await Promise.all([
        confirmPage.goto(confimationLink),
        confirmPage.waitForNavigation(),
      ]);

      log(`Đã kích hoạt thành công tài khoản: ${email}`);
      console.log(`Đã kích hoạt thành công tài khoản: ${email}`);

      appendFile(`${__dirname}/accounts.csv`, `${name},${email}\n`);
    } catch (e) {
      console.log(`Đã xảy ra lỗi trong quá trình tạo tài khoản: ${e.message}`);
      log(`Đã xảy ra lỗi trong quá trình tạo tài khoản: ${e.message}`);
    }

    accounts = readFile(`${__dirname}/accounts.csv`);
    currentAccount = accounts.length;
    // console.log(
    //   accounts.length,
    //   currentAccount,
    //   numberToGenerate - currentAccount
    // );
  }
  await browser.close();
})();