export class YGOConfig {

    public cdnUrl: string;

    constructor({
        cdnUrl
    }: {
        cdnUrl: string
    }) {
        this.cdnUrl = cdnUrl;
    }
}