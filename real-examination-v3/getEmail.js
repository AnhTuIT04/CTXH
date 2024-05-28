const fs = require("fs").promises;
const fs2 = require("fs");
const path = require("path");
const process = require("process");
const { authenticate } = require("@google-cloud/local-auth");
const { google } = require("googleapis");
const htmlParser = require("node-html-parser");

function getLink(text) {
  const root = htmlParser.parse(text);
  return root.querySelector("a").getAttribute("href");
}

// If modifying these scopes, delete token.json.
const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), "token.json");
const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAuth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function getConfirmationLink(auth, toEmail) {
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.messages.list({
    userId: "me",
    q: `from:noreply@rta.vn to:${toEmail}`,
  });

  if (!res.data.messages) return null;
  const message = await gmail.users.messages.get({
    userId: "me",
    id: res.data.messages[0].id,
  });
  const body = message.data.payload.parts[1].body.data;
  // var htmlBody = (body.replace(/-/g, '+').replace(/_/g, '/'));
  var htmlBody = Buffer.from(
    body.replace(/-/g, "+").replace(/_/g, "/"),
    "base64"
  ).toString();
  return getLink(htmlBody);
}

// (async () => {
//   const auth = await authorize();
//   const gmail = google.gmail({ version: "v1", auth });
//   let nextPageToken = null;
//   let messages = [];

//   while (true) {
//     try {
//       const res = await gmail.users.messages.list({
//         userId: "me",
//         q: `from:noreply@rta.vn`,
//         maxResults: 500,
//         pageToken: nextPageToken,
//       });
//       if (!res.data.messages) break;
//       ids = res.data.messages.map((x) => x.id);

//       const messages = await Promise.all(
//         ids.map(
//           async (id) =>
//             await gmail.users.messages.get({
//               userId: "me",
//               id: id,
//             })
//         )
//       );

//       const toEmails = messages.map(
//         (message) =>
//           message.data.payload.headers.find((x) => x.name == "To").value
//       );

//       fs2.appendFileSync(
//         `${__dirname}/account.csv`,
//         toEmails.join("\n") + "\n"
//       );
//       console.log(`Page ${nextPageToken ? nextPageToken : "0"}: Done`);
//       // for (const id of ids) {
//       //   const message = await gmail.users.messages.get({
//       //     userId: "me",
//       //     id: id,
//       //   });
//       //   const account = message.data.payload.headers.find(
//       //     (x) => x.name == "To"
//       //   ).value;
//       //   require('fs').appendFileSync(`${__dirname}/account.csv`, `${account}\n`);
//       // }
//       nextPageToken = res.data.nextPageToken;
//     } catch (e) {
//       console.log(e.message);
//       await delay(60 * 1000);
//     }
//   }

//   console.log(messages.length);
// })();

module.exports = {
  authorize,
  getConfirmationLink,
};
