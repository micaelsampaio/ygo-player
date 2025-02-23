import { FieldZone } from "../types/types";

export function parseLocationToCardLocation(zone: FieldZone) {
    if (zone.includes("GY-") || zone.includes("GY2-")) {
        return "GY";
    }
}