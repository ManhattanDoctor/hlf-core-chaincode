import { ILogger, TransformUtil, IPageBookmark, IPaginationBookmark, getUid, UID, IUIDable } from '@ts-core/common';
import { DatabaseManager } from '../DatabaseManager';
import { IKeyValue, IStub } from '../../stub';
import * as _ from 'lodash';

export abstract class EntityManager<U extends IUIDable> extends DatabaseManager {
    // --------------------------------------------------------------------------
    //
    //  Constructor
    //
    // --------------------------------------------------------------------------

    constructor(logger: ILogger, stub: IStub) {
        super(logger, stub);
    }

    // --------------------------------------------------------------------------
    //
    //  Protected Methods
    //
    // --------------------------------------------------------------------------

    protected getQuery<T extends IEntityQuery<U>>(query?: T): T {
        if (_.isNil(query)) {
            query = {} as T;
        }
        if (_.isNil(query.prefix)) {
            query.prefix = this.prefix;
        }
        if (_.isNil(query.transform)) {
            query.transform = TransformUtil.toJSON;
        }
        return query;
    }

    protected async parseFindResult<T = any>(result: Array<IKeyValue>, query: IEntityQuery<U, T>): Promise<Array<T | string>> {
        let items = result.map(item => item.value);
        items = items.filter(item => !_.isNil(item));
        if (_.isNil(query.transform)) {
            return items;
        }
        return (await Promise.all(items.map(item => query.transform(item)))).filter(item => !_.isNil(item));
    }

    protected abstract serialize<V = any>(item: U): Promise<V>;

    protected abstract deserialize(item: any, details?: Array<keyof U>): Promise<U>;

    public abstract loadDetails(item: U, details?: Array<keyof U>): Promise<void>;

    // --------------------------------------------------------------------------
    //
    //  Public Methods
    //
    // --------------------------------------------------------------------------

    public async get(item: UID, details?: Array<keyof U>): Promise<U> {
        return this.deserialize(await this.stub.getState(getUid(item)), details);
    }

    public async getMany(items: Array<UID>, details?: Array<keyof U>): Promise<Array<U>> {
        return Promise.all<U>(items.map(item => this.get(item, details)));
    }

    public async save(item: U): Promise<U> {
        await this.stub.putState(getUid(item), await this.serialize(item), { isSortKeys: true });
        return item;
    }

    public async has(item: UID): Promise<boolean> {
        return this.stub.hasState(getUid(item));
    }

    public async saveMany(items: Array<U>): Promise<Array<U>> {
        return Promise.all<U>(items.map(item => this.save(item)));
    }

    public async saveIfNotExists(item: U): Promise<U> {
        if (await this.stub.hasState(getUid(item))) {
            return item;
        }
        return this.save(item);
    }

    public async saveManyIfNotExists(items: Array<U>): Promise<Array<U>> {
        return Promise.all<U>(items.map(item => this.saveIfNotExists(item)));
    }

    public async remove(item: UID): Promise<void> {
        await this.stub.removeState(getUid(item));
    }

    public async removeMany(items: Array<UID>): Promise<void> {
        await Promise.all(items.map(item => this.remove(item)));
    }

    // --------------------------------------------------------------------------
    //
    //  Find Methods
    //
    // --------------------------------------------------------------------------

    public async find(query?: IEntityQuery<U>): Promise<Array<U>> {
        query = this.getQuery(query);

        let result = await this.getKV(query.prefix, this.getFinish(query.prefix));
        let items = await this.parseFindResult(result, query);
        return Promise.all(items.map(item => this.deserialize(item, query.details)));
    }

    public async findPaginated(query: IEntityPageQuery<U>): Promise<IPaginationBookmark<U>> {
        query = this.getQuery(query);

        let result = await this.getPaginatedKV(query, query.prefix, this.getFinish(query.prefix));
        let items = await this.parseFindResult(result.items, query);

        return {
            pageSize: result.pageSize,
            isAllLoaded: result.isAllLoaded,
            pageBookmark: result.pageBookmark,
            items: await Promise.all(items.map(item => this.deserialize(item, query.details)))
        };
    }

    // --------------------------------------------------------------------------
    //
    //  Public Properties
    //
    // --------------------------------------------------------------------------

    public abstract get prefix(): string;
}

export interface IEntityQuery<U = any, T = any> {
    prefix?: string;
    details?: Array<keyof U>;
    transform?: (item: string) => T | Promise<T>;
}

export interface IEntityPageQuery<U = any, T = any> extends IEntityQuery<U, T>, IPageBookmark { }
