import AWS from 'aws-sdk';
import HTTPError from 'http-errors';
import validator from '@middy/validator';
import { getAuctionById } from './getAuction';
import commonMiddleware from '../lib/commonMiddleware';
import placeBidSchema from '../lib/schemas/placeBidSchema';

const dynamodb = new AWS.DynamoDB.DocumentClient();

async function placeBid(event, context) {
  const { id } = event.pathParameters;
  const { amount } = event.body;
  const { email } = event.requestContext.authorizer;

  const auction = await getAuctionById(id);

  // Validation | Bid Identity
  if (auction.seller === email)
    throw new HTTPError.Forbidden('You cannot bid on your own auctions.');

  // Validation | Avoid Double Bidding
  if(auction.highestBid.bidder === email)
    throw new HTTPError.Forbidden('You are already the highest bidder.')

  // Validation | Auction Status
  if (auction.status !== 'OPEN')
    throw new HTTPError.Forbidden('You cannot bid on closed auctions.');

  // Validation | Bid Amount
  if (amount <= auction.highestBid.amount) {
    throw new HTTPError.Forbidden(
      `Your bid must be higher than ${auction.highestBid.amount}!`
    );
  }

  const params = {
    TableName: process.env.AUCTIONS_TABLE_NAME,
    Key: { id },
    UpdateExpression:
      'set highestBid.amount = :amount, highestBid.bidder = :bidder',
    ExpressionAttributeValues: {
      ':amount': amount,
      ':bidder': email,
    },
    ReturnValues: 'ALL_NEW',
  };

  let updatedAuction;

  try {
    const result = await dynamodb.update(params).promise();
    updatedAuction = result.Attributes;
  } catch (error) {
    console.log(error);
    throw new HTTPError.InternalServerError(error);
  }

  return {
    statusCode: 200,
    body: JSON.stringify(updatedAuction),
  };
}

export const handler = commonMiddleware(placeBid).use(
  validator({
    inputSchema: placeBidSchema,
    ajvOptions: {
      strict: false,
    },
  })
);
