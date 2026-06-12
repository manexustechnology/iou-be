import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PORT, CORS_ORIGIN, APP_ENV, CANTON_BASE_URL } from './config';
import router from './routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use('/api', router);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`iou-be :${PORT}  env=${APP_ENV}  canton=${CANTON_BASE_URL}`);
});
