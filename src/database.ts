import { winstonLogger } from '@eoladapo/jobman-shared';
import { Logger } from 'winston';
import { config } from '@users/config';
import mongoose from 'mongoose';

const log: Logger = winstonLogger(`${config.ELASTIC_SEARCH_URL}`, 'usersDatabase', 'debug');

const databaseConnection = async (): Promise<void> => {
  try {
    await mongoose.connect(`${config.DATABASE_URL}`);
    log.info('User Service - Successfully connected to database');
  } catch (error) {
    log.error('error', 'User Service databaseConnection() method:', error);
  }
};

export { databaseConnection };
