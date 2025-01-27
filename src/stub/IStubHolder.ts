import { IStub } from './IStub';
import * as _ from 'lodash';

export interface IStubHolder {
    readonly stub: IStub;
    destroyAsync(): Promise<void>;
}