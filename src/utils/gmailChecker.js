const { google } = require('googleapis');
const fs = require('fs');
const readline = require('readline')
const path = require('path');
const fsPromises = require('fs/promises');

//const open = require('open');
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.modify'];

const TOKEN_PATH = 'src/config/token.json';
const CLIENT_SECRET_FILE = 'src/config/client_secret.json'
let gmail;


async function authorize() {
  try {
    const credentials = JSON.parse(fs.readFileSync(CLIENT_SECRET_FILE, 'utf-8'));
    const { client_secret, client_id, redirect_uris } = credentials.web;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris);

    if (fs.existsSync(TOKEN_PATH)) {
      const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
      oAuth2Client.setCredentials(token);
      return oAuth2Client;
    } else {
      return getNewToken(oAuth2Client);
    }
  } catch (error) {
    throw new Error(`Authorization error: ${error}`);
  }

}

async function getNewToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('Authorize this app by visiting this url:', authUrl);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    rl.question('Enter the code from that page here: ', (code) => {
      rl.close();
      oAuth2Client.getToken(code, (err, token) => {
        if (err) {
          console.error('Error while trying to retrieve access token', err);
          return reject(err);
        }
        oAuth2Client.setCredentials(token);

        fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
        console.log('Token stored to', TOKEN_PATH);
        resolve(oAuth2Client);
      });
    });
  });
}

 async function retriveEmails(sender_header) {
  if (!sender_header) {
    throw new Error('Invalid input: Sender header is required');
  }
  const auth = await authorize();
  gmail = google.gmail({ version: 'v1', auth: auth });
  return await getEmails();
}


function parseRegex(regex) {
  const isLiteral = /^\/.+\/[gimsuy]*$/.test(regex);

  if (isLiteral) {
    // The input is a regex literal. We need to extract the pattern and the flags.
    // Find the last slash, everything before it is the pattern, and everything after it is the flags.
    const lastSlashIndex = regex.lastIndexOf('/');
    const pattern = regex.substring(1, lastSlashIndex);
    const flags = regex.substring(lastSlashIndex + 1);

    return new RegExp(pattern, flags);
  } else {
    // The input is not a regex literal. It's just a pattern (with no flags).
    return new RegExp(regex);
  }
}

async function getEmails() {
  let query =`has:attachment is:unread`
  const response = await gmail.users.messages.list({ userId: 'me', q: query });
  const messages = response.data.messages;
  if (!messages) {
     console.log('No new messages.');
    return [];
  } else {
    console.log(`You have ${messages.length} new message(s):`);
    return messages
  };
}

async function getEmailWithAttachments(messageId) {
  const response = await gmail.users.messages.get({ userId: 'me', id: messageId, format: 'full' });
  return response;

}
    
async function processEmails(email,sender_header, email_body_regex,dirPath) {
      const msg = await getEmailWithAttachments(email.id);
      const fromHeader = await msg.data.payload.headers.find(header => header.name.toLowerCase() === 'from');
      if (fromHeader && fromHeader.value === sender_header) {
        // Assuming the message body is in 'data' and is base64 encoded.
        let bodyData;
        if (msg.data.payload.body.data) bodyData = msg.data.payload.body.data;
        else {
          for (let part of msg.data.payload.parts) {
            if (part.mimeType == 'text/html') {
              bodyData = part.body.data
              if (!bodyData) return false;
              //const bodyData = msg.data.payload.parts[1].body.data;
              const emailBody = Buffer.from(bodyData, 'base64').toString('utf8');

              // Assuming we are looking for a content in the email body.
              let regex = parseRegex(email_body_regex)
              const matches = emailBody.match(regex);
              let content;
              if (matches) {
                content = matches[0];
                console.log("match")
              } else {
                console.log("The Policy Number not found in email.")
                return false
              }
            }
            if (part.filename && part.body.attachmentId) {
              await downloadAttachment(part.body.attachmentId, email.id,part.filename,dirPath);
            }
          }
        }
       // Mark the message as read
        await gmail.users.messages.modify({
          userId: 'me',
          id: email.id,
          requestBody: {
            removeLabelIds: ['UNREAD'],
          },
        });
      }
}

async function downloadAttachment(attachmentId,messageId,filename,dirPath) {
  const {data: attachment} = await gmail.users.messages.attachments.get({
    userId: 'me',
    messageId:messageId,
    id: attachmentId,
  });
  const { size, data: dataB64 } = attachment;
  const filePath = path.join(dirPath, filename);
  await fsPromises.writeFile(filePath, Buffer.from(dataB64, 'base64'));
}



module.exports = {
  retriveEmails,
  processEmails
};