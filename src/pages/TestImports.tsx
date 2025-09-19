import React, { useEffect, useState } from "react";

const TestImports: React.FC = () => {
    const [imported, setImported] = useState<string[]>([]);
    
    useEffect(() => {
        const testImports = async () => {
            console.log("[TEST IMPORTS] Starting import tests...");
            
            // Reset RPC counter
            if ((window as any).rpcReset) {
                (window as any).rpcReset();
            }
            
            console.log("[TEST IMPORTS] Test 1: Basic imports already loaded");
            setImported(prev => [...prev, "React and Router already loaded"]);
            
            // Show current RPC count
            if ((window as any).rpcAnalysis) {
                (window as any).rpcAnalysis();
            }
            
            // Test wagmi import
            console.log("[TEST IMPORTS] Test 2: Importing wagmi...");
            try {
                const wagmi = await import('wagmi');
                console.log("[TEST IMPORTS] Wagmi imported", wagmi);
                setImported(prev => [...prev, "Wagmi imported"]);
                
                // Show RPC count after wagmi
                if ((window as any).rpcAnalysis) {
                    (window as any).rpcAnalysis();
                }
            } catch (e) {
                console.error("[TEST IMPORTS] Wagmi import failed", e);
            }
            
            // Test viem import
            console.log("[TEST IMPORTS] Test 3: Importing viem...");
            try {
                const viem = await import('viem');
                console.log("[TEST IMPORTS] Viem imported", viem);
                setImported(prev => [...prev, "Viem imported"]);
                
                // Show RPC count after viem
                if ((window as any).rpcAnalysis) {
                    (window as any).rpcAnalysis();
                }
            } catch (e) {
                console.error("[TEST IMPORTS] Viem import failed", e);
            }
        };
        
        testImports();
    }, []);
    
    return (
        <div style={{ padding: '20px' }}>
            <h1>Import Test Page</h1>
            <p>Check console and network tab to see which imports cause RPC requests</p>
            <h2>Imported modules:</h2>
            <ul>
                {imported.map((item, index) => (
                    <li key={index}>{item}</li>
                ))}
            </ul>
            <button onClick={() => (window as any).rpcAnalysis?.()}>
                Show RPC Analysis
            </button>
        </div>
    );
};

export default TestImports;