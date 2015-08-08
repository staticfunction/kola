import "reflect-metadata";

export interface Request<T> {
  (payload?: T): RequestPromise;
}

export interface RequestPromise {
  then(success: (res:any) => void, error: (err:any) => void): void;
}

export function request<T>(name: string, handlers?: Function[] | {new(): T}) {

}
