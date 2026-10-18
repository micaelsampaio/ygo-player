/** What a pool hides while an object waits in it: a mesh (visible), an entity
 * (disable()) or an entity with a gameObject. */
export interface PoolableObject {
    visible?: boolean;
    disable?: () => void;
    gameObject?: { visible: boolean };
}

export class PoolObjects {
    public name: string;
    private objects: PoolableObject[];

    constructor(private props: { name: string, amount: number, create: () => PoolableObject }) {
        this.objects = [];
        this.name = this.props.name;
    }

    create() {
        for (let i = 0; i < this.props.amount; ++i) {
            const clone = this.createObject();
            this.objects.push(clone);
        }
    }

    createObject() {

        const clone = this.props.create();

        this.hide(clone);

        return clone;
    }

    /** An object from the pool (a new one when it is empty), typed as what `create` makes. */
    get<T extends PoolableObject = PoolableObject>() {
        if (this.objects.length > 0) {
            return this.objects.pop() as T;
        }
        return this.createObject() as T;
    }

    enquene(clone: PoolableObject) {

        this.hide(clone);

        this.objects.push(clone);
    }

    private hide(clone: PoolableObject) {
        if (clone.visible) clone.visible = false;

        if (typeof clone.disable === "function") {
            clone.disable();
        }

        if (clone.gameObject) {
            clone.gameObject.visible = false;
        }
    }

}
