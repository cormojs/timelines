// Runtime data entering through JSON.parse has no static schema at this boundary.
declare type DynamicValue = ReturnType<typeof JSON.parse>;
