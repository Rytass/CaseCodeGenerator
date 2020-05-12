const functions = require('firebase-functions');
const admin = require('firebase-admin');
const moment = require('moment');

admin.initializeApp();

exports.listCaseCodes = functions.https.onRequest(async (request, response) => {
  const { body } = request;

  const inputMonth = body.text ? body.text.trim() : '';

  const snapshot = await admin
    .firestore()
    .collection('cases')
    .where('numberCode', '>=', Number(`${inputMonth || moment().format('YYYYMM')}00001`))
    .where('numberCode', '<', Number(`${inputMonth || moment().format('YYYYMM')}99999`))
    .orderBy('numberCode', 'desc')
    .get();

  const responseList = [];

  snapshot.docs.forEach(doc => {
    const {
      name,
      numberCode,
      creator,
    } = doc.data();

    responseList.push(`- *RC${numberCode}* ${name}${creator ? ` - ${creator}` : ''}`);
  });

  if (!responseList.length) {
    response.send({
      response_type: 'in_channel',
      text: '本月尚無案件編號',
    });
  } else {
    response.send({
      response_type: 'in_channel',
      blocks: [{
        type: 'section',
        text: {
          type: 'plain_text',
          text: `${moment(inputMonth || moment().format('YYYYMM'), 'YYYYMM').format('YYYY/MM')} 案件清單：`,
        },
      }, {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: responseList.reverse().join('\n'),
        },
      }],
    });
  }
});


exports.generateCaseCode = functions.https.onRequest(async (request, response) => {
  const {
    text,
    user_name,
  } = request.body;

  const monthKey = moment().format('YYYYMM');

  const snapshot = await admin
    .firestore()
    .collection('cases')
    .where('numberCode', '>=', Number(`${monthKey}00001`))
    .where('numberCode', '<', Number(`${monthKey}99999`))
    .orderBy('numberCode', 'desc')
    .limit(1)
    .get();

  const nextCode = snapshot.size ? (snapshot.docs[0].get('numberCode') + 1) : Number(`${monthKey}00001`);

  const doc = admin.firestore().collection('cases').doc(`RC${nextCode}`).set({
    numberCode: nextCode,
    name: text || '未命名專案',
    creator: user_name,
  });

  response.send({
    response_type: 'in_channel',
    text: `RC${nextCode} ${text}`,
  });
});
