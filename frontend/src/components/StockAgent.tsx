import React, { useState } from 'react';

interface StockOperation {
    type: 'ADD' | 'REMOVE' | 'UPDATE';
    itemId: string;
    quantity: number;
    timestamp: string;
}

interface StockAgentProps {
    onOperationComplete: (operation: StockOperation) => void;
}

const StockAgent: React.FC<StockAgentProps> = ({ onOperationComplete }) => {
    const [itemId, setItemId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [operationType, setOperationType] = useState<'ADD' | 'REMOVE' | 'UPDATE'>('ADD');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const operation: StockOperation = {
            type: operationType,
            itemId,
            quantity: Number(quantity),
            timestamp: new Date().toISOString()
        };

        onOperationComplete(operation);
        
        // Reset form
        setItemId('');
        setQuantity('');
    };

    return (
        <div className="stock-agent">
            <h2>Stock Agent</h2>
            <form onSubmit={handleSubmit} className="stock-form">
                <div className="form-group">
                    <label>
                        Operation Type:
                        <select 
                            value={operationType}
                            onChange={(e) => setOperationType(e.target.value as 'ADD' | 'REMOVE' | 'UPDATE')}
                        >
                            <option value="ADD">Add Stock</option>
                            <option value="REMOVE">Remove Stock</option>
                            <option value="UPDATE">Update Stock</option>
                        </select>
                    </label>
                </div>
                
                <div className="form-group">
                    <label>
                        Item ID:
                        <input
                            type="text"
                            value={itemId}
                            onChange={(e) => setItemId(e.target.value)}
                            required
                        />
                    </label>
                </div>
                
                <div className="form-group">
                    <label>
                        Quantity:
                        <input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            required
                        />
                    </label>
                </div>
                
                <button type="submit">Execute Operation</button>
            </form>
        </div>
    );
};

export default StockAgent;
