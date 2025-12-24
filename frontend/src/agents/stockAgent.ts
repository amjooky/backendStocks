import { StockOperations } from './types';

class StockAgent {
    private stockLevels: Map<string, number>;
    private operationLog: StockOperations[];

    constructor() {
        this.stockLevels = new Map();
        this.operationLog = [];
    }

    async executeOperation(operation: StockOperations) {
        try {
            // Log the operation before execution
            this.operationLog.push(operation);

            switch (operation.type) {
                case 'ADD':
                    await this.addStock(operation.itemId, operation.quantity);
                    break;
                case 'REMOVE':
                    await this.removeStock(operation.itemId, operation.quantity);
                    break;
                case 'UPDATE':
                    await this.updateStock(operation.itemId, operation.quantity);
                    break;
                default:
                    throw new Error(`Unknown operation type: ${operation.type}`);
            }

            return true;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`Error executing operation: ${errorMessage}`);
            return false;
        }
    }

    private async addStock(itemId: string, quantity: number): Promise<void> {
        const currentQuantity = this.stockLevels.get(itemId) || 0;
        this.stockLevels.set(itemId, currentQuantity + quantity);
    }

    private async removeStock(itemId: string, quantity: number): Promise<void> {
        const currentQuantity = this.stockLevels.get(itemId) || 0;
        if (currentQuantity < quantity) {
            throw new Error(`Insufficient stock for item ${itemId}`);
        }
        this.stockLevels.set(itemId, currentQuantity - quantity);
    }

    private async updateStock(itemId: string, quantity: number): Promise<void> {
        this.stockLevels.set(itemId, quantity);
    }

    getOperationLog(): StockOperations[] {
        return this.operationLog;
    }

    getCurrentStock(itemId: string): number {
        return this.stockLevels.get(itemId) || 0;
    }
}

export default StockAgent;
