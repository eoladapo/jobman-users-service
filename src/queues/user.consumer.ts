import { publishDirectMessage } from '@users/queues/user.producer';
import { IBuyerDocument, ISellerDocument, winstonLogger } from '@eoladapo/jobman-shared';
import { config } from '@users/config';
import { Channel, ConsumeMessage, Replies } from 'amqplib';
import { Logger } from 'winston';
import { createConnection } from './connection';
import { createBuyer, updateBuyerPurchasedGigsProp } from '@users/services/buyer.service';
import {
  getRandomSellers,
  updateSellerCancelledJobProp,
  updateSellerCompletedJobs,
  updateSellerOngoingJobProp,
  updateSellerReview,
  updateTotalGigsCount
} from '@users/services/seller.service';

const log: Logger = winstonLogger(`${config.ELASTIC_SEARCH_URL}`, 'usersServiceConsumer', 'debug');

const consumeBuyerDirectMessage = async (channel: Channel) => {
  try {
    if (!channel) {
      channel = (await createConnection()) as Channel;
    }
    const exchangeName = 'jobman-buyer-update';
    const routingKey = 'user-buyer';
    const queueName = 'user-buyer-queue';
    await channel.assertExchange(exchangeName, 'direct');
    const jobmanQueue: Replies.AssertQueue = await channel.assertQueue(queueName, { durable: true, autoDelete: false });
    await channel.bindQueue(jobmanQueue.queue, exchangeName, routingKey);
    channel.consume(jobmanQueue.queue, async (msg: ConsumeMessage | null) => {
      const { type } = JSON.parse(msg!.content.toString());
      if (type === 'auth') {
        const { username, email, profilePicture, country, createdAt } = JSON.parse(msg!.content.toString());
        const buyer: IBuyerDocument = {
          username,
          email,
          profilePicture,
          country,
          purchasedGigs: [],
          createdAt
        };
        await createBuyer(buyer);
      } else {
        const { buyerId, purchasedGigs } = JSON.parse(msg!.content.toString());
        await updateBuyerPurchasedGigsProp(buyerId, purchasedGigs, type);
      }
      channel.ack(msg!);
    });
  } catch (error) {
    log.log('error', 'UsersService error consumeBuyerDirectMessage() method:', error);
  }
};

const consumeSellerDirectMessage = async (channel: Channel) => {
  try {
    if (!channel) {
      channel = (await createConnection()) as Channel;
    }
    const exchangeName = 'jobman-seller-update';
    const routingKey = 'user-seller';
    const queueName = 'user-seller-queue';
    await channel.assertExchange(exchangeName, 'direct');
    const jobmanQueue: Replies.AssertQueue = await channel.assertQueue(queueName, { durable: true, autoDelete: false });
    await channel.bindQueue(jobmanQueue.queue, exchangeName, routingKey);
    channel.consume(jobmanQueue.queue, async (msg: ConsumeMessage | null) => {
      const { type, sellerId, ongoingJobs, completedJobs, totalEarnings, recentDelivery, gigSellerId, count } = JSON.parse(
        msg!.content.toString()
      );
      if (type === 'create-order') {
        await updateSellerOngoingJobProp(sellerId, ongoingJobs);
      } else if (type === 'complete-order') {
        await updateSellerCompletedJobs({ sellerId, ongoingJobs, completedJobs, totalEarnings, recentDelivery });
      } else if (type === 'update-gig-count') {
        await updateTotalGigsCount(`${gigSellerId}`, count);
      } else if (type === 'cancel-order') {
        await updateSellerCancelledJobProp(sellerId);
      }
      channel.ack(msg!);
    });
  } catch (error) {
    log.log('error', 'UsersService error consumeBuyerDirectMessage() method:', error);
  }
};

const consumeReviewFanoutMessages = async (channel: Channel) => {
  try {
    if (!channel) {
      channel = (await createConnection()) as Channel;
    }
    const exchangeName = 'jobman-review';
    const queueName = 'seller-review-queue';
    await channel.assertExchange(exchangeName, 'fanout');
    const jobmanQueue: Replies.AssertQueue = await channel.assertQueue(queueName, { durable: true, autoDelete: false });
    await channel.bindQueue(jobmanQueue.queue, exchangeName, '');
    channel.consume(jobmanQueue.queue, async (msg: ConsumeMessage | null) => {
      const { type } = JSON.parse(msg!.content.toString());
      if (type === 'buyer-review') {
        await updateSellerReview(JSON.parse(msg!.content.toString()));
        await publishDirectMessage(
          channel,
          'jobman-update-gig',
          'update-gig',
          JSON.stringify({ type: 'updateGig', gigReview: msg!.content.toString() }),
          'Message sent to gig service'
        );
      }
      channel.ack(msg!);
    });
  } catch (error) {
    log.error('error', 'UsersService consumeReviewFanoutMessages() method:', error);
  }
};

const consumeSeedGigDirectMessages = async (channel: Channel) => {
  try {
    if (!channel) {
      channel = (await createConnection()) as Channel;
    }

    const exchangeName = 'jobman-gig';
    const routingKey = 'get-sellers';
    const queueName = 'user-gig-queue';
    await channel.assertExchange(exchangeName, 'direct');
    const jobmanQueue: Replies.AssertQueue = await channel.assertQueue(queueName, { durable: true, autoDelete: false });
    await channel.bindQueue(jobmanQueue.queue, exchangeName, routingKey);
    channel.consume(jobmanQueue.queue, async (msg: ConsumeMessage | null) => {
      const { type } = JSON.parse(msg!.content.toString());
      if (type === 'get-sellers') {
        const { count } = JSON.parse(msg!.content.toString());
        const sellers: ISellerDocument[] = await getRandomSellers(parseInt(count, 10));
        await publishDirectMessage(
          channel,
          'jobman-seed-gig',
          'receive-sellers',
          JSON.stringify({ type: 'receive-sellers', sellers, count }),
          'Message sent to gig service'
        );
      }
    });
  } catch (error) {}
};

export { consumeBuyerDirectMessage, consumeSellerDirectMessage, consumeReviewFanoutMessages, consumeSeedGigDirectMessages };
