import { WarnPenalty } from '@prisma/client';

export interface IWarnPenaltyListResult {
  data: WarnPenalty[];
  total: number;
  limit: number;
  offset: number;
}
