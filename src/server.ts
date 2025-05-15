import { CustomError, IAuthPayload, IErrorResponse, winstonLogger } from '@eoladapo/jobman-shared';
import { Application, json, NextFunction, Request, Response, urlencoded } from 'express';
import { checkConnection } from '@users/elasticsearch';
import { appRoutes } from '@users/routes';
import { config } from '@users/config';
import { Logger } from 'winston';
import hpp from 'hpp';
import cors from 'cors';
import helmet from 'helmet';
import { verify } from 'jsonwebtoken';
import compression from 'compression';
import http from 'http';
import { createConnection } from '@users/queues/connection';
import { Channel } from 'amqplib';
import {
  consumeBuyerDirectMessage,
  consumeReviewFanoutMessages,
  consumeSeedGigDirectMessages,
  consumeSellerDirectMessage
} from '@users/queues/user.consumer';

const SERVER_PORT = 4003;
const log: Logger = winstonLogger(`${config.ELASTIC_SEARCH_URL}`, 'usersServer', 'debug');

export const start = (app: Application): void => {
  securityMiddleware(app);
  standardMiddleware(app);
  routesMiddleware(app);
  startQueues();
  startElasticSearch();
  usersErrorHandler(app);
  startServer(app);
};

const securityMiddleware = (app: Application): void => {
  app.set('trust proxy', 1);
  app.use(hpp());
  app.use(helmet());
  app.use(
    cors({
      origin: config.API_GATEWAY_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    })
  ),
    app.use((req: Request, _res: Response, next: NextFunction) => {
      if (req.headers.authorization) {
        const token = req.headers.authorization.split(' ')[1];
        const payload: IAuthPayload = verify(token, `${config.JWT_TOKEN}`) as IAuthPayload;
        req.currentUser = payload;
      }
      next();
    });
};

const standardMiddleware = (app: Application) => {
  app.use(compression());
  app.use(json({ limit: '200mb' }));
  app.use(urlencoded({ extended: true, limit: '200mb' }));
};

const routesMiddleware = (app: Application): void => {
  appRoutes(app);
};

const startQueues = async (): Promise<void> => {
  const userChannel: Channel = (await createConnection()) as Channel;
  await consumeBuyerDirectMessage(userChannel);
  await consumeSellerDirectMessage(userChannel);
  await consumeReviewFanoutMessages(userChannel);
  await consumeSeedGigDirectMessages(userChannel);
};

const startElasticSearch = (): void => {
  checkConnection();
};

const usersErrorHandler = (app: Application): void => {
  app.use((error: IErrorResponse, _req: Request, res: Response, next: NextFunction) => {
    log.log('error', `UsersService ${error.comingFrom}: `, error);
    if (error instanceof CustomError) {
      res.status(error.statusCode).json(error.serializeErrors());
    }
    next();
  });
};

const startServer = (app: Application): void => {
  try {
    const httpServer: http.Server = new http.Server(app);
    log.info(`Users Server with process id ${process.pid} has started!`);
    httpServer.listen(SERVER_PORT, () => {
      log.info(`Users Server is listening on port ${SERVER_PORT}`);
    });
  } catch (error) {
    log.log('error', 'Users Service startServer() method:', error);
  }
};
