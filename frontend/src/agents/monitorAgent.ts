import { StockOperations } from './types';
import StockAgent from './stockAgent';

class MonitorAgent {
    private stockAgent: StockAgent;
    private corrections: Array<{
        operation: StockOperations;
        error: string;
        correction: StockOperations;
    }>;

    constructor(stockAgent: StockAgent) {
        this.stockAgent = stockAgent;
        this.corrections = [];
    }

    async analyzeOperations(): Promise<void> {
        const operations = this.stockAgent.getOperationLog();
        
        for (let i = 0; i < operations.length; i++) {
            const operation = operations[i];
            await this.validateOperation(operation);
        }
    }

    private async validateOperation(operation: StockOperations): Promise<void> {
        try {
            // Validate quantity
            if (operation.quantity < 0) {
                const correction: StockOperations = {
                    ...operation,
                    quantity: Math.abs(operation.quantity)
                };
                this.addCorrection(operation, "Negative quantity detected", correction);
            }

            // Validate stock levels after REMOVE operations
            if (operation.type === 'REMOVE') {
                const currentStock = this.stockAgent.getCurrentStock(operation.itemId);
                if (currentStock < 0) {
                    const correction: StockOperations = {
                        type: 'UPDATE',
                        itemId: operation.itemId,
                        quantity: 0
                    };
                    this.addCorrection(operation, "Stock level below zero", correction);
                }
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`Error validating operation: ${errorMessage}`);
        }
    }

    private addCorrection(
        operation: StockOperations,
        error: string,
        correction: StockOperations
    ): void {
        this.corrections.push({
            operation,
            error,
            correction
        });
    }

    async applyCorrections(): Promise<void> {
        for (const correction of this.corrections) {
            await this.stockAgent.executeOperation(correction.correction);
            console.log(`Applied correction for ${correction.error}`);
        }
    }

    getCorrections() {
        return this.corrections;
    }
}

export default MonitorAgent;
