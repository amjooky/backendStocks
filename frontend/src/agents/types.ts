export type StockOperations = {
    type: 'ADD' | 'REMOVE' | 'UPDATE';
    itemId: string;
    quantity: number;
};
