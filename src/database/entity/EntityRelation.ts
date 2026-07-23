import { getUid, UID, DestroyableContainer } from "@ts-core/common";
import { StateKey } from "@hlf-core/common";
import { DatabaseManager } from "../DatabaseManager";
import { IEntityQuery } from "./EntityManager";
import { IStub } from "../../stub";
import * as _ from 'lodash';

export class EntityRelation extends DestroyableContainer {

    // --------------------------------------------------------------------------
    //
    //  Properties
    //
    // --------------------------------------------------------------------------

    protected stub: IStub;
    protected childKey: StateKey;
    protected parentKey: StateKey;

    // --------------------------------------------------------------------------
    //
    //  Constructor
    //
    // --------------------------------------------------------------------------

    constructor(stub: IStub, parentPrefix: string, childPrefix: string) {
        super();
        this.stub = stub;
        this.childKey = new StateKey(`→link:${childPrefix}~${parentPrefix}`);
        this.parentKey = new StateKey(`→link:${parentPrefix}~${childPrefix}`);
    }

    // --------------------------------------------------------------------------
    //
    //  Protected Methods
    //
    // --------------------------------------------------------------------------

    protected getParentValue(parent: Array<UID>): string {
        return parent.map(item => getUid(item)).join(StateKey.SEGMENT);
    }

    protected async linkAdd(child: UID, parent: Array<UID>): Promise<void> {
        await this.stub.putStateRaw(this.childKey.key(child, ...parent), this.getParentValue(parent));
        await this.stub.putStateRaw(this.parentKey.key(...parent, child), getUid(child));
    }

    protected async linkRemove(child: UID, parent: Array<UID>): Promise<void> {
        await this.stub.removeState(this.childKey.key(child, ...parent));
        await this.stub.removeState(this.parentKey.key(...parent, child));
    }

    // --------------------------------------------------------------------------
    //
    //  Child Methods
    //
    // --------------------------------------------------------------------------

    public async childAdd(child: UID, ...parent: Array<UID>): Promise<void> {
        return this.linkAdd(child, parent);
    }

    public childListQuery<T>(...parent: Array<UID>): IEntityQuery<any, T> {
        return { prefix: this.parentKey.prefix(...parent), transform: item => this.stub.getState(item) };
    }

    public async childRemove(child: UID): Promise<void> {
        let kv = await DatabaseManager.getKV(this.stub, this.childKey.prefix(child));
        for (let { key } of kv) {
            await this.linkRemove(child, _.tail(this.childKey.decompose(key)));
        }
    }

    // --------------------------------------------------------------------------
    //
    //  Link Methods
    //
    // --------------------------------------------------------------------------

    public async childLinkAdd(child: UID, ...parent: Array<UID>): Promise<void> {
        return this.linkAdd(child, parent);
    }

    public async childLinkHas(child: UID, ...parent: Array<UID>): Promise<boolean> {
        return this.stub.hasState(this.childKey.key(child, ...parent));
    }

    public async childLinkRemove(child: UID, ...parent: Array<UID>): Promise<void> {
        return this.linkRemove(child, parent);
    }

    // --------------------------------------------------------------------------
    //
    //  Parent Methods
    //
    // --------------------------------------------------------------------------

    public async parentRemove(...parent: Array<UID>): Promise<Array<UID>> {
        let items = await DatabaseManager.getValues(this.stub, this.parentKey.prefix(...parent));
        for (let child of items) {
            await this.linkRemove(child, parent);
        }
        return items;
    }

    // --------------------------------------------------------------------------
    //
    //  Public Methods
    //
    // --------------------------------------------------------------------------

    public destroy(): void {
        if (this.destroyed) {
            return;
        }
        super.destroy();
        this.stub = null;
        this.childKey = null;
        this.parentKey = null;
    }
}
