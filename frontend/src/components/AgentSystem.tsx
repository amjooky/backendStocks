import React, { useState } from 'react';
import StockAgent from './StockAgent';
import MonitorAgent from './MonitorAgent';

interface StockOperation {
    type: 'ADD' | 'REMOVE' | 'UPDATE';
    itemId: string;
    quantity: number;
    timestamp: string;
}

interface Correction {
    originalOperation: StockOperation;
    correctedOperation: StockOperation;
    reason: string;
    timestamp: string;
}

const AgentSystem: React.FC = () => {
    const [operations, setOperations] = useState<StockOperation[]>([]);
    const [stockLevels, setStockLevels] = useState<Record<string, number>>({});
    
    const handleOperation = (operation: StockOperation) => {
        setOperations(prev => [...prev, operation]);
        
        // Update stock levels based on operation type
        setStockLevels(prev => {
            const currentLevel = prev[operation.itemId] || 0;
            const newLevels = { ...prev };
            
            switch (operation.type) {
                case 'ADD':
                    newLevels[operation.itemId] = currentLevel + operation.quantity;
                    break;
                case 'REMOVE':
                    newLevels[operation.itemId] = Math.max(0, currentLevel - operation.quantity);
                    break;
                case 'UPDATE':
                    newLevels[operation.itemId] = operation.quantity;
                    break;
            }
            
            return newLevels;
        });
    };

    const handleCorrection = (correction: Correction) => {
        // Apply the correction
        handleOperation(correction.correctedOperation);
    };

    return (
        <div className="agent-system">
            <div className="system-grid">
                <div className="agent-panel">
                    <StockAgent onOperationComplete={handleOperation} />
                    <div className="stock-levels">
                        <h3>Current Stock Levels</h3>
                        <ul>
                            {Object.entries(stockLevels).map(([itemId, quantity]) => (
                                <li key={itemId}>
                                    {itemId}: {quantity} units
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
                
                <div className="monitor-panel">
                    <MonitorAgent 
                        operations={operations}
                        stockLevels={stockLevels}
                        onCorrection={handleCorrection}
                    />
                    <div className="operations-log">
                        <h3>Operations Log</h3>
                        <ul>
                            {operations.map((op, index) => (
                                <li key={index} className="operation-entry">
                                    <div className="operation-time">
                                        {new Date(op.timestamp).toLocaleString()}
                                    </div>
                                    <div className="operation-details">
                                        {op.type} - Item: {op.itemId}, Quantity: {op.quantity}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
            
        </div>
    );
};

export default AgentSystem;
