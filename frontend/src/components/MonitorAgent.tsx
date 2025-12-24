import React, { useEffect, useState } from 'react';

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

interface MonitorAgentProps {
    operations: StockOperation[];
    stockLevels: Record<string, number>;
    onCorrection: (correction: Correction) => void;
}

const MonitorAgent: React.FC<MonitorAgentProps> = ({ operations, stockLevels, onCorrection }) => {
    const [corrections, setCorrections] = useState<Correction[]>([]);

    useEffect(() => {
        // Monitor for new operations
        if (operations.length > 0) {
            const latestOperation = operations[operations.length - 1];
            validateOperation(latestOperation);
        }
    }, [operations]);

    const validateOperation = (operation: StockOperation) => {
        // Check for negative quantities
        if (operation.quantity < 0) {
            const correction: Correction = {
                originalOperation: operation,
                correctedOperation: {
                    ...operation,
                    quantity: Math.abs(operation.quantity)
                },
                reason: 'Negative quantity detected - Converting to positive value',
                timestamp: new Date().toISOString()
            };
            handleCorrection(correction);
        }

        // Check for insufficient stock on REMOVE operations
        if (operation.type === 'REMOVE') {
            const currentStock = stockLevels[operation.itemId] || 0;
            if (operation.quantity > currentStock) {
                const correction: Correction = {
                    originalOperation: operation,
                    correctedOperation: {
                        type: 'REMOVE',
                        itemId: operation.itemId,
                        quantity: currentStock,
                        timestamp: new Date().toISOString()
                    },
                    reason: `Insufficient stock - Adjusting removal quantity to available stock (${currentStock})`,
                    timestamp: new Date().toISOString()
                };
                handleCorrection(correction);
            }
        }
    };

    const handleCorrection = (correction: Correction) => {
        setCorrections(prev => [...prev, correction]);
        onCorrection(correction);
    };

    return (
        <div className="monitor-agent">
            <h2>Monitor Agent</h2>
            <div className="corrections-log">
                <h3>Corrections Log</h3>
                {corrections.length === 0 ? (
                    <p>No corrections needed yet</p>
                ) : (
                    <ul>
                        {corrections.map((correction, index) => (
                            <li key={index} className="correction-entry">
                                <div className="correction-time">
                                    {new Date(correction.timestamp).toLocaleString()}
                                </div>
                                <div className="correction-reason">
                                    {correction.reason}
                                </div>
                                <div className="correction-details">
                                    <strong>Original:</strong> {correction.originalOperation.type} - 
                                    Item: {correction.originalOperation.itemId}, 
                                    Quantity: {correction.originalOperation.quantity}
                                </div>
                                <div className="correction-details">
                                    <strong>Corrected:</strong> {correction.correctedOperation.type} - 
                                    Item: {correction.correctedOperation.itemId}, 
                                    Quantity: {correction.correctedOperation.quantity}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default MonitorAgent;
