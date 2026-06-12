import axios from 'axios';
import { CANTON_BASE_URL } from '../config';
import { makePartyToken, makeAdminToken } from './auth';

function makeClient(token: string | null) {
  return axios.create({
    baseURL: CANTON_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

export const partyClient = (partyId: string) => makeClient(makePartyToken(partyId));
export const adminClient = () => makeClient(makeAdminToken());
