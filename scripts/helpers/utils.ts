import { parseUnits } from "viem";

export const setn = (
    num:  | bigint, 
    bit: number | bigint, 
    value: number | boolean | undefined
) => {
    if (value) {
        return BigInt(num) | (1n << BigInt(bit));
    } else {
        return BigInt(num) & (~(1n << BigInt(bit)));
    }
}