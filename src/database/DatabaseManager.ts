import { ILogger, LoggerWrapper, IPaginationBookmark, IPageBookmark } from '@ts-core/common';
import { IKeyValue, IStub } from '../stub';
import * as _ from 'lodash';

export class DatabaseManager extends LoggerWrapper {
    // --------------------------------------------------------------------------
    //
    //  Static Properties
    //
    // --------------------------------------------------------------------------

    public static LAST_KEY = '\ufff0';

    // --------------------------------------------------------------------------
    //
    //  Static Methods
    //
    // --------------------------------------------------------------------------

    public static async getKV(stub: IStub, start: string, finish?: string): Promise<Array<IKeyValue>> {
        return stub.loadKV(await stub.getStateByRange(start, !_.isNil(finish) ? finish : DatabaseManager.getFinish(start)));
    }

    public static async getPaginatedKV(stub: IStub, request: IPageBookmark, start: string, finish?: string): Promise<IPaginationBookmark<IKeyValue>> {
        return stub.getPaginatedKV(request, start, !_.isNil(finish) ? finish : DatabaseManager.getFinish(start));
    }

    public static async getKeys(stub: IStub, start: string, finish?: string): Promise<Array<string>> {
        return (await DatabaseManager.getKV(stub, start, finish)).map(item => item.key);
    }

    public static async getValues(stub: IStub, start: string, finish?: string): Promise<Array<string>> {
        return (await DatabaseManager.getKV(stub, start, finish)).map(item => item.value);
    }

    /**
     * Cascade delete for index → entity tables.
     *
     * Reads all KV pairs in `[start, finish]`, then removes BOTH:
     *   1. the index keys themselves (`item.key`)
     *   2. the referenced entities (`item.value` — treated as the UID of another state record)
     *
     * Use ONLY for tables where value is guaranteed to be a UID of another state record
     * (e.g. parent→child or child→parent index records created by {@link EntityRelation}).
     *
     * Do NOT use for ranges containing entity records themselves (where value is a serialized JSON):
     * the second pass will call `removeState(serializedJson)` and may accidentally delete an
     * unrelated state key whose name happens to match the JSON string.
     */
    public static async removeKV(stub: IStub, start: string, finish?: string): Promise<void> {
        let kv = await DatabaseManager.getKV(stub, start, finish);
        await Promise.all(kv.map(item => stub.removeState(item.key)));
        await Promise.all(kv.map(item => stub.removeState(item.value)));
    }

    public static getFinish(start: string): string {
        return start + DatabaseManager.LAST_KEY;
    }

    public static has(stub: IStub, item: string): Promise<boolean> {
        return stub.hasState(item);
    }

    // --------------------------------------------------------------------------
    //
    //  Properties
    //
    // --------------------------------------------------------------------------

    private _stub: IStub;

    // --------------------------------------------------------------------------
    //
    //  Constructor
    //
    // --------------------------------------------------------------------------

    constructor(logger: ILogger, stub: IStub) {
        super(logger);
        this._stub = stub;
    }

    // --------------------------------------------------------------------------
    //
    //  Public Methods
    //
    // --------------------------------------------------------------------------

    public getKV(start: string, finish?: string): Promise<Array<IKeyValue>> {
        return DatabaseManager.getKV(this.stub, start, finish);
    }

    public removeKV(start: string, finish?: string): Promise<void> {
        return DatabaseManager.removeKV(this.stub, start, finish);
    }

    public getPaginatedKV(request: IPageBookmark, start: string, finish?: string): Promise<IPaginationBookmark<IKeyValue>> {
        return DatabaseManager.getPaginatedKV(this.stub, request, start, finish);
    }

    public getKeys(start: string, finish?: string): Promise<Array<string>> {
        return DatabaseManager.getKeys(this.stub, start, finish);
    }

    public getValues(start: string, finish?: string): Promise<Array<string>> {
        return DatabaseManager.getValues(this.stub, start, finish);
    }

    public getFinish(start: string): string {
        return DatabaseManager.getFinish(start);
    }

    public destroy(): void {
        if (this.isDestroyed) {
            return;
        }
        super.destroy();
        this._stub = null;
    }

    // --------------------------------------------------------------------------
    //
    //  Public Properties
    //
    // --------------------------------------------------------------------------

    public get stub(): IStub {
        return this._stub;
    }
}
