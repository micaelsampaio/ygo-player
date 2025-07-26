export class Ease {
    static linear(t: number): number {
        return t;
    }

    static easeInQuad(t: number): number {
        return t * t;
    }

    static easeOutQuad(t: number): number {
        return t * (2 - t);
    }

    static easeInOutQuad(t: number): number {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    static easeInCubic(t: number): number {
        return t * t * t;
    }

    static easeOutCubic(t: number): number {
        return (--t) * t * t + 1;
    }

    static easeInOutCubic(t: number): number {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    static easeInQuart(t: number): number {
        return t * t * t * t;
    }

    static easeOutQuart(t: number): number {
        return 1 - (--t) * t * t * t;
    }

    static easeInOutQuart(t: number): number {
        return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
    }

    static easeInQuint(t: number): number {
        return t * t * t * t * t;
    }

    static easeOutQuint(t: number): number {
        return 1 + (--t) * t * t * t * t;
    }

    static easeInOutQuint(t: number): number {
        return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
    }

    static easeInSine(t: number): number {
        return 1 - Math.cos(t * Math.PI / 2);
    }

    static easeOutSine(t: number): number {
        return Math.sin(t * Math.PI / 2);
    }

    static easeInOut(t: number): number {
        return t * t * (3 - 2 * t);
    }

    static easeInOutSine(t: number): number {
        return -(Math.cos(Math.PI * t) - 1) / 2;
    }

    static easeInExpo(t: number): number {
        return t === 0 ? 0 : Math.pow(2, 10 * t - 10);
    }

    static easeOutExpo(t: number): number {
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    static easeInOutExpo(t: number): number {
        return t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ?
            Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
    }

    static easeInCirc(t: number): number {
        return 1 - Math.sqrt(1 - t * t);
    }

    static easeOutCirc(t: number): number {
        return Math.sqrt(1 - (--t) * t);
    }

    static easeInOutCirc(t: number): number {
        return t < 0.5 ? (1 - Math.sqrt(1 - 4 * t * t)) / 2 : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2;
    }

    static easeInElastic(t: number): number {
        return t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * (2 * Math.PI) / 3);
    }

    static easeOutElastic(t: number): number {
        return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
    }

    static easeInOutElastic(t: number): number {
        return t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ?
            -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * (2 * Math.PI) / 4.5)) / 2 :
            (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * (2 * Math.PI) / 4.5)) / 2 + 1;
    }

    static easeInBack(t: number): number {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return c3 * t * t * t - c1 * t * t;
    }

    static easeOutBack(t: number): number {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }

    static easeInOutBack(t: number): number {
        const c1 = 1.70158;
        const c2 = c1 * 1.525;
        return t < 0.5 ?
            (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2 :
            (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
    }

    static easeInBounce(t: number): number {
        return 1 - Ease.easeOutBounce(1 - t);
    }

    static easeOutBounce(t: number): number {
        const n1 = 7.5625;
        const d1 = 2.75;

        if (t < 1 / d1) {
            return n1 * t * t;
        } else if (t < 2 / d1) {
            return n1 * (t -= 1.5 / d1) * t + 0.75;
        } else if (t < 2.5 / d1) {
            return n1 * (t -= 2.25 / d1) * t + 0.9375;
        } else {
            return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }
    }

    static easeInOutBounce(t: number): number {
        return t < 0.5 ?
            (1 - Ease.easeOutBounce(1 - 2 * t)) / 2 :
            (1 + Ease.easeOutBounce(2 * t - 1)) / 2;
    }
}