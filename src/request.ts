import {Hook, Kontext} from './kontext';

/**
 * Request allows you to create a async methods that returns a promise.
 */

export interface Promise<R> {
  then(success: (res: R) => void, error?: (err: any) => void): void;
}

export interface Handler<P, R> {
  execute(payload: P, kontext: Kontext): Promise<R>;
}

export interface Request<P, R> {
  (payload?: P): Promise<R>;
}

export function create<P, R>(handler: Handler<P, R>, kontext: Kontext): Request<P, R> {
  let request:Request<P, R> = (payload?: P) => {
    return handler.execute(payload, kontext);
  }

  return request;
}