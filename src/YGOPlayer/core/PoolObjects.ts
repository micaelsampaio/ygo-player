export class PoolObjects {
    public name: string;
    private objects: any[];

    constructor(private props: { name: string, amount: any, create: () => any }) {
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

        if (clone.visible) {
            clone.visible = false;
        }

        if (typeof clone.disable === "function") {
            clone.disable();
        }

        if (clone.gameObject) {
            clone.gameObject.visible = false;
        }

        return clone;
    }

    get<T = any>() {
        if (this.objects.length > 0) {
            return this.objects.pop() as T;
        }
        return this.createObject() as T;
    }

    enquene(clone: any) {

        if (clone.visible) clone.visible = false;

        if (typeof clone.disable === "function") {
            clone.disable();
        }

        if (clone.gameObject) {
            clone.gameObject.visible = false;
        }

        this.objects.push(clone);
    }

}