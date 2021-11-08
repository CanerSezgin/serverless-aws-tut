import AWS from 'aws-sdk';
import commonMiddleware from '../lib/commonMiddleware';
import HTTPError from 'http-errors';

const dynamodb = new AWS.DynamoDB.DocumentClient();

async function getAuctions(event, context) {
  let auctions;

  try {
    const result = await dynamodb
      .scan({ TableName: process.env.AUCTIONS_TABLE_NAME })
      .promise();

    auctions = result.Items;
  } catch (error) {
    console.log(error);
    throw new HTTPError.InternalServerError(error);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ auctions }),
  };
}

export const handler = commonMiddleware(getAuctions);
